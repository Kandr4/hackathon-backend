import BaseAgent from '../core/BaseAgent.js';
import config from '../config/index.js';
import OpenAI from 'openai';

/**
 * Model 7: Video Generator
 * Creates explanatory videos using OpenAI Sora 2 for visual learners
 */
export class VideoGenerator extends BaseAgent {
  constructor() {
    super({
      name: 'VideoGenerator',
      model: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 2500,
      systemPrompt: 'You are an educational video script creator specializing in visual explanations.',
    });
    
    // Initialize OpenAI client for Sora 2
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  /**
   * @param {import('../types/index.js').AgentMessage} message
   * @returns {Promise<import('../types/index.js').AgentResponse>}
   */
  async processMessage(message) {
    try {
      switch (message.type) {
        case 'request':
          return await this.handleRequest(message);
        default:
          return this.createResponse(null, 'Unsupported message type');
      }
    } catch (error) {
      return this.createResponse(null, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  /**
   * Handle request messages
   * @private
   */
  async handleRequest(message) {
    const { action, data } = message.content;

    switch (action) {
      case 'teach':
        return await this.generateVideoScript(data);
      default:
        return this.createResponse(null, 'Unsupported action');
    }
  }

  /**
   * Generate an explanatory video using Sora 2
   * @private
   */
  async generateVideoScript(data) {
    const { 
      userId, 
      userMessage, 
      lessonContext, 
      conversationHistory = [],
      systemPrompt = '',
      userPreferences = {}
    } = data;

    // Build context from conversation history
    const historyContext = conversationHistory
      .slice(-6)
      .map(msg => `${msg.is_user ? 'Student' : 'Teacher'}: ${msg.message}`)
      .join('\n');

    // Step 1: Generate a concise video prompt for Sora 2
    const promptGenerationTemplate = `${systemPrompt}

You are creating a VIDEO PROMPT for Sora 2 AI to generate an educational video.

LESSON CONTEXT:
- Topic: ${lessonContext.topic || 'General'}
- Lesson: ${lessonContext.title || 'Introduction'}
- Description: ${lessonContext.description || 'Not provided'}

STUDENT QUESTION: ${userMessage}

Create a CONCISE, VISUAL prompt (max 500 characters) for Sora 2 that will generate an educational video showing:
- Clear visual demonstrations
- Step-by-step process or concept explanation
- Engaging visuals with text overlays for key points
- Professional educational style

The prompt should describe WHAT TO SHOW visually, not a narration script.

Example good prompts:
- "Educational animation showing how photosynthesis works: sunlight hitting a leaf, chloroplasts absorbing light, water and CO2 combining, glucose molecules forming. Text labels appear for each component. Clean, colorful, modern educational style."
- "Step-by-step demonstration of bubble sort algorithm: colorful bars representing numbers, systematic comparison and swapping with smooth animations, highlighted elements during comparison. Professional coding tutorial aesthetic."

Return ONLY the video prompt text, nothing else.`;

    try {
      // Generate the Sora 2 prompt
      const promptResponse = await this.llm.invoke(promptGenerationTemplate);
      const soraPrompt = typeof promptResponse.content === 'string' 
        ? promptResponse.content.trim()
        : String(promptResponse.content).trim();

      console.log(`🎬 [Model 7] Generating video with Sora 2...`);
      console.log(`📝 Prompt: ${soraPrompt.substring(0, 150)}...`);

      // Generate video with Sora 2 - Start generation
      let video = await this.openai.videos.create({
        model: 'sora-2-pro',
        prompt: soraPrompt,
      });

      console.log(`🎥 Video generation started: ${video.id}`);
      let progress = video.progress ?? 0;

      // Poll for completion with progress updates
      while (video.status === 'in_progress' || video.status === 'queued') {
        await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds
        video = await this.openai.videos.retrieve(video.id);
        progress = video.progress ?? 0;

        const statusText = video.status === 'queued' ? '⏳ Queued' : '🎬 Processing';
        const barLength = 30;
        const filledLength = Math.floor((progress / 100) * barLength);
        const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
        
        console.log(`${statusText}: [${bar}] ${progress.toFixed(1)}%`);
      }

      // Check if generation failed
      if (video.status === 'failed') {
        throw new Error('Sora 2 video generation failed');
      }

      console.log(`✅ Video generation completed: ${video.id}`);

      console.log(`✅ Video generation completed: ${video.id}`);

      // Download video content
      console.log(`📥 Downloading video content...`);
      const content = await this.openai.videos.downloadContent(video.id);
      const body = content.arrayBuffer();
      const buffer = Buffer.from(await body);

      // Generate a unique filename
      const videoFilename = `video_${Date.now()}_${video.id}.mp4`;
      const videoPath = `./generated_videos/${videoFilename}`;
      
      // Ensure directory exists
      const fs = await import('fs');
      const path = await import('path');
      const dir = path.dirname(videoPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      // Save video file
      fs.writeFileSync(videoPath, buffer);
      console.log(`💾 Saved video: ${videoPath}`);

      // In production, upload to cloud storage and get public URL
      // For now, we'll use a local path or return the video ID
      const videoUrl = video.url || `/videos/${videoFilename}`;

      // Generate narration script
      const narrationTemplate = `Create a 10-second educational narration script for this video:

VIDEO CONTENT: ${soraPrompt}

STUDENT QUESTION: ${userMessage}

Write a clear, concise narration (spoken aloud in ~10 seconds) that:
- Introduces the concept
- Explains what viewers are seeing
- Emphasizes key learning points
- Ends with a call-to-action or question

Keep it under 100 words. Return ONLY the narration text.`;

      const narrationResponse = await this.llm.invoke(narrationTemplate);
      const narration = typeof narrationResponse.content === 'string'
        ? narrationResponse.content.trim()
        : String(narrationResponse.content).trim();

      // Generate key takeaways
      const takeawaysTemplate = `Based on this educational content:

VIDEO: ${soraPrompt}
NARRATION: ${narration}

List 3 key takeaways the student should remember. Return as JSON array:
["takeaway 1", "takeaway 2", "takeaway 3"]`;

      const takeawaysResponse = await this.llm.invoke(takeawaysTemplate);
      let takeaways;
      try {
        const content = typeof takeawaysResponse.content === 'string'
          ? takeawaysResponse.content
          : JSON.stringify(takeawaysResponse.content);
        takeaways = this.extractJSON(content);
      } catch {
        takeaways = [
          "Visual demonstration helps understand the concept",
          "Step-by-step process shown in the video",
          "Key components labeled for clarity"
        ];
      }

      const videoData = {
        videoUrl: videoUrl,
        videoId: video.id,
        localPath: videoPath,
        thumbnailUrl: video.thumbnail_url || null,
        duration: video.duration || "~10s",
        title: lessonContext.title || "Educational Video",
        soraPrompt,
        narration,
        keyTakeaways: Array.isArray(takeaways) ? takeaways : ["Key concepts visualized"],
        format: "video",
        generatedAt: new Date().toISOString(),
      };

      console.log(`✅ [Model 7] Video generated: ${videoData.videoUrl}`);

      return this.createResponse({
        response: videoData,
        responseType: 'video',
        message: 'Educational video generated with Sora 2',
      });

    } catch (error) {
      console.error('Error generating video with Sora 2:', error);
      
      // Fallback: Return script-based format if Sora 2 fails
      return this.createResponse({
        response: {
          videoUrl: null,
          error: "Video generation unavailable",
          title: lessonContext.title || "Educational Content",
          soraPrompt: "Video generation failed",
          narration: userMessage,
          keyTakeaways: ["Sora 2 API unavailable", "Showing text explanation instead"],
          format: "video",
          fallback: true
        },
        responseType: 'video',
        message: `Sora 2 video generation failed: ${error.message}`,
      });
    }
  }

  /**
   * Extract JSON from text
   * @private
   */
  extractJSON(text) {
    try {
      return JSON.parse(text);
    } catch {
      const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      
      const objectMatch = text.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        return JSON.parse(objectMatch[0]);
      }
      
      throw new Error('No valid JSON found in response');
    }
  }
}

export default VideoGenerator;
