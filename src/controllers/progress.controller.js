// src/controllers/progress.controller.js

const Progress = require('../models/progress.model');

// Get user progress
exports.getUserProgress = async (req, res) => {
    try {
        const userId = req.params.userId;
        const progress = await Progress.find({ userId });
        res.status(200).json(progress);
    } catch (error) {
        res.status(500).json({ message: 'Error retrieving progress', error });
    }
};

// Update user progress
exports.updateUserProgress = async (req, res) => {
    try {
        const userId = req.params.userId;
        const { courseId, lessonId, completed } = req.body;
        const progress = await Progress.findOneAndUpdate(
            { userId, courseId, lessonId },
            { completed },
            { new: true, upsert: true }
        );
        res.status(200).json(progress);
    } catch (error) {
        res.status(500).json({ message: 'Error updating progress', error });
    }
};

// Delete user progress
exports.deleteUserProgress = async (req, res) => {
    try {
        const userId = req.params.userId;
        const { courseId, lessonId } = req.body;
        await Progress.deleteOne({ userId, courseId, lessonId });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ message: 'Error deleting progress', error });
    }
};