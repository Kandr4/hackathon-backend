// This file contains the logic for interacting with the OpenAI API.

const axios = require('axios');

class OpenAIService {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.baseURL = 'https://api.openai.com/v1';
    }

    async generateCompletion(prompt) {
        try {
            const response = await axios.post(`${this.baseURL}/completions`, {
                prompt: prompt,
                max_tokens: 150,
                temperature: 0.7,
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
            });
            return response.data.choices[0].text.trim();
        } catch (error) {
            throw new Error('Error generating completion: ' + error.message);
        }
    }

    async generateChatResponse(messages) {
        try {
            const response = await axios.post(`${this.baseURL}/chat/completions`, {
                model: 'gpt-3.5-turbo',
                messages: messages,
            }, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                },
            });
            return response.data.choices[0].message.content.trim();
        } catch (error) {
            throw new Error('Error generating chat response: ' + error.message);
        }
    }
}

module.exports = new OpenAIService(process.env.OPENAI_API_KEY);