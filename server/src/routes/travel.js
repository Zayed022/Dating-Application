// travel.js
const express = require('express');
const { protect } = require('../middleware/auth');
const fc = require('../controllers/featureControllers');
const travelRouter = express.Router();
travelRouter.use(protect);
travelRouter.get('/', fc.getTravelListings);
travelRouter.post('/', fc.createTravelListing);
travelRouter.post('/:listingId/join', fc.joinTrip);
module.exports = travelRouter;
