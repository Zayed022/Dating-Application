// ─── routes/auth.js ───────────────────────────────────────────────────────────
const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('name').trim().notEmpty().withMessage('Name required'),
    body('age').isInt({ min: 18, max: 100 }).withMessage('Age must be 18–100'),
    body('gender').isIn(['male', 'female', 'non-binary', 'other']).withMessage('Invalid gender'),
  ],
  authController.register
);

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty().withMessage('Password required'),
  ],
  authController.login
);

router.post('/refresh', authController.refresh);
router.post('/logout', protect, authController.logout);
router.get('/me', protect, authController.getMe);
router.post('/forgot-password', body('email').isEmail(), authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

module.exports = router;
