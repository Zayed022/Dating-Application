// ─── routes/swipe.js ──────────────────────────────────────────────────────────
const express = require('express');
const { protect } = require('../middleware/auth');
const swipeController = require('../controllers/swipeController');

const swipeRouter = express.Router();
swipeRouter.use(protect);
swipeRouter.get('/profiles', swipeController.getProfiles);
swipeRouter.post('/like', swipeController.like);
swipeRouter.post('/dislike', swipeController.dislike);
swipeRouter.post('/super-like', swipeController.superLike);
swipeRouter.post('/rewind', swipeController.rewind);

// ─── routes/matches.js ────────────────────────────────────────────────────────
const matchRouter = express.Router();
const chatController = require('../controllers/chatController');
matchRouter.use(protect);
matchRouter.get('/', chatController.getMatches);
matchRouter.delete('/:matchId', chatController.unmatch);

// ─── routes/chat.js ───────────────────────────────────────────────────────────
const chatRouter = express.Router();
chatRouter.use(protect);
chatRouter.get('/:matchId/messages', chatController.getMessages);
chatRouter.post('/:matchId/messages', chatController.sendMessage);
chatRouter.patch('/:matchId/seen', chatController.markSeen);

// ─── routes/reels.js ──────────────────────────────────────────────────────────
const multer = require('multer');
const featureControllers = require('../controllers/featureControllers');
const reelRouter = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } }); // 100MB for videos

reelRouter.use(protect);
reelRouter.get('/', featureControllers.getReelsFeed);
reelRouter.post('/', upload.single('video'), featureControllers.uploadReel);
reelRouter.post('/:reelId/like', featureControllers.likeReel);
reelRouter.post('/:reelId/comments', featureControllers.addComment);
reelRouter.patch('/:reelId/views', featureControllers.incrementViews);

module.exports = { swipeRouter, matchRouter, chatRouter, reelRouter };
