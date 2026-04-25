const express = require('express');
const { protect } = require('../middleware/auth');
const fc = require('../controllers/featureControllers');
const router = express.Router();
router.use(protect);
router.post('/create-order', fc.createOrder);
router.post('/verify', fc.verifyPayment);
router.get('/my', fc.getMySubscription);
module.exports = router;
