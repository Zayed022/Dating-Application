const express = require('express');
const multer = require('multer');
const { protect } = require('../middleware/auth');
const userController = require('../controllers/userController');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB

router.use(protect);

router.patch('/profile', upload.none(), userController.updateProfile);
router.post('/photos', upload.single('photo'), userController.uploadPhoto);
router.delete('/photos', userController.deletePhoto);
router.get('/:id', userController.getUserById);
router.post('/report', userController.reportUser);
router.post('/block', userController.blockUser);
router.delete('/block', userController.unblockUser);

module.exports = router;
