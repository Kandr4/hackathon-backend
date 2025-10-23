const request = require('supertest');
const app = require('../../src/app');

describe('AI Routes', () => {
    it('should return recommendations', async () => {
        const response = await request(app)
            .get('/api/ai/recommendations')
            .expect('Content-Type', /json/)
            .expect(200);

        expect(response.body).toHaveProperty('recommendations');
    });

    it('should handle AI-related queries', async () => {
        const response = await request(app)
            .post('/api/ai/query')
            .send({ query: 'What is the capital of France?' })
            .expect('Content-Type', /json/)
            .expect(200);

        expect(response.body).toHaveProperty('answer');
    });
});