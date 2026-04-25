const express = require('express');
const { protect } = require('../middleware/auth');
const chatController = require('../controllers/chatController');
const router = express.Router();
router.use(protect);
router.get('/', chatController.getMatches);
router.delete('/:matchId', chatController.unmatch);
module.exports = router;
