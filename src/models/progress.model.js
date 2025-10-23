const mongoose = require('mongoose');

const progressSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    courseId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'Course'
    },
    lessonsCompleted: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Lesson'
    },
    quizzesTaken: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Quiz'
    },
    progressPercentage: {
        type: Number,
        default: 0
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model('Progress', progressSchema);