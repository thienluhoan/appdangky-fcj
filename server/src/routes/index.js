const express = require('express');
const router = express.Router();
const visitRoutes = require('./visitRoutes');
const authRoutes = require('./authRoutes');
const emailRoutes = require('./emailRoutes');
const formConfigRoutes = require('./formConfigRoutes');
const configNotifyRoutes = require('./configNotifyRoutes');

// Sử dụng các routes con
router.use('/visits', visitRoutes);
router.use('/auth', authRoutes);
router.use('/email', emailRoutes);
router.use('/', formConfigRoutes); // Thêm route cho form-config
router.use('/', configNotifyRoutes); // Thêm route cho thông báo cập nhật cấu hình

module.exports = router;
