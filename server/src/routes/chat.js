const express = require('express');
const { protect } = require('../middleware/auth');
const chatController = require('../controllers/chatController');
const router = express.Router();
router.use(protect);
router.get('/:matchId/messages', chatController.getMessages);
router.post('/:matchId/messages', chatController.sendMessage);
router.patch('/:matchId/seen', chatController.markSeen);
module.exports = router;
