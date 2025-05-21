const express = require('express');
const router = express.Router();
const formConfigController = require('../controllers/formConfigController');

// Route để lấy cấu hình form
router.get('/form-config', formConfigController.getFormConfig);

// Route để lưu cấu hình form
router.post('/form-config', formConfigController.saveFormConfig);

module.exports = router;
