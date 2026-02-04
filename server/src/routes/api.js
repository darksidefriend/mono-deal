const express = require('express');
const router = express.Router();

// Простой маршрут для проверки работы API
router.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

module.exports = router;