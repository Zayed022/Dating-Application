const express = require('express');
const { protect, requirePremium } = require('../middleware/auth');
const fc = require('../controllers/featureControllers');
const router = express.Router();
router.use(protect);
router.post('/', requirePremium, fc.createBlindDateRequest);
router.get('/mine', fc.getMyBlindDateRequests);
router.delete('/:requestId', fc.cancelBlindDateRequest);
module.exports = router;
