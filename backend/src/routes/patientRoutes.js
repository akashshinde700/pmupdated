// src/routes/patientRoutes.js
const express = require('express');
const { 
  listPatients, 
  getPatient, 
  addPatient, 
  updatePatient, 
  deletePatient, 
  mergePatients
} = require('../controllers/patientController');
const {
  getPatientsInQueue,
  updatePatientQueueStatus,
  assignPatientToDoctor
} = require('../controllers/staffDashboardController');
const { listTimeline } = require('../controllers/patientDataController');
const { getComplianceReport } = require('../controllers/complianceController');

// ✅ SAHI IMPORT - Destructuring se teeno middleware ek saath
const { authenticateToken, optionalAuth, requireRole } = require('../middleware/auth');

const { validateId } = require('../middleware/validator');
const joiValidate = require('../middleware/joiValidate');
const { createPatient, updatePatient: updatePatientSchema } = require('../validation/patientSchemas');
const { cacheMiddleware } = require('../middleware/cache');
const { auditLogger } = require('../middleware/auditLogger');

const router = express.Router();

// Patient creation - uses optionalAuth to get user context if logged in
router.post('/',
  optionalAuth,
  joiValidate(createPatient),
  addPatient
);

// Patient search - uses optionalAuth for doctor filtering if logged in
router.get('/', optionalAuth, cacheMiddleware(2 * 60 * 1000), listPatients);

// All other routes require authentication
router.use(authenticateToken);

// ⚠️ IMPORTANT: /merge must come BEFORE /:id routes to avoid conflict
router.post('/merge', auditLogger('PATIENT'), mergePatients);

// Queue management endpoints for patients
router.get('/queue', getPatientsInQueue);
router.put('/:id/queue-status', validateId('id'), updatePatientQueueStatus);
router.put('/:id/assign-doctor', validateId('id'), assignPatientToDoctor);

// Get single patient by ID
router.get('/:id', validateId('id'), cacheMiddleware(2 * 60 * 1000), getPatient);

// Update patient
router.put('/:id',
  validateId('id'),
  joiValidate(updatePatientSchema),
  auditLogger('PATIENT'),
  updatePatient
);

// Delete patient
router.delete('/:id', validateId('id'), auditLogger('PATIENT'), deletePatient);

// Patient timeline endpoint
router.get('/:id/timeline', validateId('id'), listTimeline);

// Patient compliance report endpoint
router.get('/:id/compliance-report', validateId('id'), getComplianceReport);

module.exports = router;