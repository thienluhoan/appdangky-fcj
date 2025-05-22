const express = require('express');
const router = express.Router();
const visitRoutes = require('./visitRoutes');
const authRoutes = require('./authRoutes');
const emailRoutes = require('./emailRoutes');
const formConfigRoutes = require('./formConfigRoutes');
const configNotifyRoutes = require('./configNotifyRoutes');
const emailConfigRoutes = require('./emailConfigRoutes');
const userRoutes = require('./userRoutes');

// Sử dụng các routes con
router.use('/visits', visitRoutes);
router.use('/auth', authRoutes);
router.use('/email', emailRoutes);
router.use('/email-config', emailConfigRoutes); // Thêm route cho cấu hình email
router.use('/users', userRoutes); // Thêm route cho người dùng
router.use('/', formConfigRoutes); // Thêm route cho form-config
router.use('/', configNotifyRoutes); // Thêm route cho thông báo cập nhật cấu hình

module.exports = router;
