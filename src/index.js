const express = require('express');
const mongoose = require('mongoose');
const app = require('./app');
const { PORT, MONGO_URI } = require('./config/env');

mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server is running on http://localhost:${PORT}`);
        });
    })
    .catch(err => {
        console.error('Database connection error:', err);
    });