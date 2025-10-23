require('dotenv').config();

const env = {
    PORT: process.env.PORT || 3000,
    DB_URI: process.env.DB_URI || 'mongodb://localhost:27017/ai-learning',
    JWT_SECRET: process.env.JWT_SECRET || 'your_jwt_secret',
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'your_openai_api_key',
};

module.exports = env;