const express = require('express');
const { forgotPassword, resetPassword } = require('../AdminControllers/Forgotpassword');

const router = express.Router();

router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:token', resetPassword);

module.exports = router;
