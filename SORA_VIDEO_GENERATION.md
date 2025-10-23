# Sora 2 Video Generation - Implementation Guide

## Overview
The VideoGenerator (Model 7) uses OpenAI's Sora 2 API to generate educational videos for visual learners.

## Implementation Details

### API Pattern
We use the **async generation pattern** with progress polling:

```javascript
// 1. Start video generation
let video = await openai.videos.create({
  model: 'sora-2',
  prompt: 'Educational content description...',
});

// 2. Poll for completion
while (video.status === 'in_progress' || video.status === 'queued') {
  await new Promise(resolve => setTimeout(resolve, 2000));
  video = await openai.videos.retrieve(video.id);
  
  // Display progress
  console.log(`Progress: ${video.progress}%`);
}

// 3. Download video content
if (video.status === 'completed') {
  const content = await openai.videos.downloadContent(video.id);
  const buffer = Buffer.from(await content.arrayBuffer());
  fs.writeFileSync('video.mp4', buffer);
}
```

### Video Generation Process

1. **Prompt Generation** (Step 1)
   - LLM creates a visual description for Sora 2
   - Max 500 characters
   - Focuses on WHAT TO SHOW, not narration
   - Example: "Educational animation showing photosynthesis: sunlight, chloroplasts, glucose formation with text labels"

2. **Sora 2 Generation** (Step 2)
   - Calls `openai.videos.create()` with model 'sora-2'
   - Polls every 2 seconds for status updates
   - Displays progress bar in console
   - Downloads video when complete

3. **Content Enhancement** (Step 3)
   - Generates narration script (~10 seconds spoken)
   - Creates 3 key takeaways
   - Packages everything into structured response

### File Storage

- Videos saved to: `hackathon-backend/generated_videos/`
- Filename format: `video_{timestamp}_{videoId}.mp4`
- Served via: `http://localhost:5000/videos/{filename}`
- Directory excluded from git via `.gitignore`

### Response Structure

```javascript
{
  videoUrl: "/videos/video_1234567890_abc123.mp4",
  videoId: "abc123",
  localPath: "./generated_videos/video_1234567890_abc123.mp4",
  thumbnailUrl: null, // if Sora provides thumbnail
  duration: "~10s",
  title: "React Hooks Explained",
  soraPrompt: "Visual description used for generation",
  narration: "10-second narration script",
  keyTakeaways: [
    "Hooks allow function components to use state",
    "useState returns current state and setter function",
    "Effects run after render"
  ],
  format: "video",
  generatedAt: "2025-10-23T..."
}
```

### Frontend Display

The VideoPlayer component (`frontend/src/components/VideoPlayer.jsx`) handles:
- HTML5 video playback
- Narration toggle (show/hide script)
- Key takeaways list
- Fallback UI when video unavailable

### Error Handling

**Fallback Response** (when Sora 2 fails):
```javascript
{
  videoUrl: null,
  error: "Video generation unavailable",
  narration: userMessage,
  keyTakeaways: ["Sora 2 API unavailable", "Showing text explanation instead"],
  fallback: true
}
```

Frontend detects `fallback: true` and displays text-based content.

## Environment Variables

Required in `.env`:
```
OPENAI_API_KEY=your_openai_api_key_with_sora_access
```

## Testing

### Test Video Generation
```bash
cd hackathon-backend
npm run dev
```

Send chat message: "Can you make a video explaining React hooks?"

Expected console output:
```
🎬 [Model 7] Generating video with Sora 2...
📝 Prompt: Educational animation showing React hooks...
🎥 Video generation started: vid_abc123
⏳ Queued: [░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 0.0%
🎬 Processing: [████████░░░░░░░░░░░░░░░░░░░░] 25.0%
🎬 Processing: [█████████████████░░░░░░░░░░░] 50.0%
🎬 Processing: [█████████████████████████░░░] 85.0%
✅ Video generation completed: vid_abc123
📥 Downloading video content...
💾 Saved video: ./generated_videos/video_1729699200000_vid_abc123.mp4
✅ [Model 7] Video generated: /videos/video_1729699200000_vid_abc123.mp4
```

### Frontend Verification
1. Start frontend: `cd frontend && npm run dev`
2. Open lesson chat
3. Send video request
4. Verify:
   - Progress updates in backend console
   - Video player appears in chat
   - Video plays correctly
   - Narration toggle works
   - Key takeaways displayed

## API Limits

- **Generation time**: 30-120 seconds depending on complexity
- **Video length**: Adjustable (currently ~10s)
- **Rate limits**: Check OpenAI Sora 2 pricing/limits
- **Cost**: Sora 2 generation is premium feature

## Production Considerations

### Cloud Storage
For production, upload videos to cloud storage:

```javascript
// After generating video
const cloudUrl = await uploadToS3(buffer, videoFilename);
// Or: uploadToCloudinary(), uploadToAzure(), etc.

const videoData = {
  videoUrl: cloudUrl, // Use cloud URL instead of local path
  ...
};
```

### CDN Integration
Serve videos via CDN for better performance:
- CloudFront (AWS)
- Cloudflare
- Fastly

### Cleanup Strategy
Implement video cleanup to manage storage:

```javascript
// Delete videos older than 7 days
const MAX_VIDEO_AGE = 7 * 24 * 60 * 60 * 1000;

setInterval(() => {
  const files = fs.readdirSync('./generated_videos');
  files.forEach(file => {
    const stats = fs.statSync(`./generated_videos/${file}`);
    if (Date.now() - stats.mtimeMs > MAX_VIDEO_AGE) {
      fs.unlinkSync(`./generated_videos/${file}`);
    }
  });
}, 24 * 60 * 60 * 1000); // Run daily
```

## Troubleshooting

### Video generation fails
- Check OPENAI_API_KEY is set
- Verify Sora 2 access enabled for your account
- Check API rate limits

### Video doesn't play in frontend
- Verify `/videos` route is working: `http://localhost:5000/videos/`
- Check CORS settings allow video requests
- Ensure MP4 codec compatibility

### Progress stuck at 0%
- Sora 2 may be queued due to high demand
- Wait time can be 1-5 minutes
- Progress updates every 2 seconds

### File not found errors
- Check `generated_videos/` directory exists
- Verify write permissions
- Check disk space

## Future Enhancements

1. **Custom Duration**: Allow user to specify video length
2. **Resolution Options**: Let users choose 720p, 1080p, 4K
3. **Style Presets**: Different visual styles (whiteboard, 3D, cartoon)
4. **Voice Synthesis**: Add AI-generated voice narration
5. **Captions**: Auto-generate subtitles
6. **Batch Generation**: Generate multiple videos in parallel
7. **Preview Frames**: Show preview before full generation
8. **Video Editing**: Trim, concatenate, add overlays

## Resources

- [OpenAI Sora Documentation](https://platform.openai.com/docs/guides/sora)
- [Video API Reference](https://platform.openai.com/docs/api-reference/videos)
- [Sora Pricing](https://openai.com/pricing)
