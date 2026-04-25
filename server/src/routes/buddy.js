// buddy.js
const express = require('express');
const { protect, requirePremium } = require('../middleware/auth');
const fc = require('../controllers/featureControllers');

const buddyRouter = express.Router();
buddyRouter.use(protect);
buddyRouter.get('/', fc.getBuddyListings);
buddyRouter.post('/', fc.createBuddyListing);
buddyRouter.post('/:listingId/book', requirePremium, fc.bookBuddy);

module.exports = buddyRouter;
