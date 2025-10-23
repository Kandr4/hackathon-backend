const request = require('supertest');
const app = require('../../src/app');

describe('Health Check Routes', () => {
    it('should return a 200 status and a message for health check', async () => {
        const response = await request(app).get('/health');
        expect(response.status).toBe(200);
        expect(response.body).toEqual({ message: 'API is healthy' });
    });
});