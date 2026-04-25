// swipe.js
const express = require('express');
const { protect } = require('../middleware/auth');
const swipeController = require('../controllers/swipeController');
const router = express.Router();
router.use(protect);
router.get('/profiles', swipeController.getProfiles);
router.post('/like', swipeController.like);
router.post('/dislike', swipeController.dislike);
router.post('/super-like', swipeController.superLike);
router.post('/rewind', swipeController.rewind);
module.exports = router;
