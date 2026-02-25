const express = require('express');
const {
  listCertificateTypes,
  createCertificateType,
  updateCertificateType,
  deleteCertificateType
} = require('../controllers/certificateTypeController');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticateToken, listCertificateTypes);
router.post('/', authenticateToken, createCertificateType);
router.put('/:id', authenticateToken, updateCertificateType);
router.delete('/:id', authenticateToken, deleteCertificateType);

module.exports = router;
