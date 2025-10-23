const express = require('express');
const router = express.Router();
const usersController = require('../controllers/users.controller');

// Endpoint to fetch user details
router.get('/:id', usersController.getUserById);

// Endpoint to update user profile
router.put('/:id', usersController.updateUserProfile);

// Endpoint to delete a user
router.delete('/:id', usersController.deleteUser);

// Endpoint to fetch all users (admin only)
router.get('/', usersController.getAllUsers);

module.exports = router;