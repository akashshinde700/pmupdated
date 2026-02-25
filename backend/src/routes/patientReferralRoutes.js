const express = require('express');
const {
  getAllReferrals,
  getReferralById,
  createReferral,
  updateReferral,
  deleteReferral,
  getReferralNetwork,
  addToNetwork,
  updateNetworkDoctor,
  deleteNetworkDoctor
} = require('../controllers/patientReferralController');
const joiValidate = require('../middleware/joiValidate');
const { createPatientReferral, updatePatientReferral } = require('../validation/commonSchemas');

const router = express.Router();

// Auth handled by app.js: app.use('/api/patient-referrals', authenticateToken, ...)

// Referral Network (MUST be before /:id to avoid conflict)
router.get('/network/doctors', getReferralNetwork);
router.post('/network/doctors', addToNetwork);
router.put('/network/doctors/:id', updateNetworkDoctor);
router.delete('/network/doctors/:id', deleteNetworkDoctor);

// Referral CRUD
router.get('/', getAllReferrals);
router.get('/:id', getReferralById);
router.post('/', joiValidate(createPatientReferral), createReferral);
router.put('/:id', joiValidate(updatePatientReferral), updateReferral);
router.delete('/:id', deleteReferral);

module.exports = router;
