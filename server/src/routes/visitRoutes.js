const express = require('express');
const router = express.Router();
const visitController = require('../controllers/visitController');

// API endpoints
router.get('/', visitController.getVisits);
router.post('/', visitController.createVisit);
router.patch('/:id', visitController.updateVisitStatus);
router.delete('/:id', visitController.deleteVisit);

// API endpoint để đếm số lượt đăng ký trong ngày
router.get('/count', visitController.countVisits);

// API endpoint để đếm số lượt đăng ký theo tầng
router.get('/count-floor', visitController.countFloorVisits);

// API endpoint để xóa hàng loạt đăng ký
router.post('/batch-delete', visitController.batchDeleteVisits);

// API endpoint để cập nhật hàng loạt đăng ký
router.post('/batch-update', visitController.batchUpdateVisits);

// Giữ lại API cũ để tương thích ngược
router.put('/:id', visitController.updateVisitStatus);

module.exports = router;
