// src/routes/prescriptionRoutes.js
const express = require('express');
const {
  listPrescriptions,
  addPrescription,
  getPrescription,
  generatePrescriptionPDF,
  getLastPrescription,
  savePrescriptionDiagnoses,
  getPrescriptionDiagnoses,
  addMedicationsToPrescription,
  searchPrescriptions,
  endVisit
} = require('../controllers/prescriptionController');
const { getDb } = require('../config/db');

const {
  saveDraft,
  getDraft,
  deleteDraft,
  listDrafts
} = require('../controllers/prescriptionDraftController');

// Prescription Sharing Controller
const {
  sharePrescription,
  getShareOptions,
  generatePrescriptionQR,
  viewSharedPrescription
} = require('../controllers/prescriptionShareController');

// ✅ SAHI IMPORT - Destructuring se authenticateToken le rahe hain
const { authenticateToken } = require('../middleware/auth');
const { validateId } = require('../middleware/validator');

const { auditLogger } = require('../middleware/auditLogger');
const joiValidate = require('../middleware/joiValidate');
const { createPrescription, updatePrescription, saveDiagnoses } = require('../validation/prescriptionSchemas');

const router = express.Router();

// =====================================================
// PUBLIC ROUTES (no auth required for sharing)
// =====================================================

// Generate prescription PDF (public for link sharing)
router.get('/pdf/:prescriptionId', generatePrescriptionPDF);

// View shared prescription (public for patients)
router.get('/view/:prescriptionId', viewSharedPrescription);

// Get prescription QR code as image
router.get('/:prescriptionId/qr', generatePrescriptionQR);

// All other routes require authentication
router.use(authenticateToken);

// Draft routes (must be before other routes to avoid conflicts)
router.get('/drafts', listDrafts);
router.get('/draft', getDraft);
router.post('/draft', saveDraft);
router.delete('/draft/:id', validateId('id'), deleteDraft);

// Collection search (date range + optional filters)
router.get('/', searchPrescriptions);

// Get prescription detail by ID
router.get('/detail/:id', validateId('id'), getPrescription);

// ICD diagnoses for a prescription (define BEFORE generic routes)
router.get('/detail/:id/diagnoses', validateId('id'), getPrescriptionDiagnoses);
router.post('/detail/:id/diagnoses', validateId('id'), joiValidate(saveDiagnoses), auditLogger('PRESCRIPTION'), savePrescriptionDiagnoses);

// Add medications to existing prescription
router.post('/:prescriptionId/add-medications', validateId('prescriptionId'), auditLogger('PRESCRIPTION'), addMedicationsToPrescription);

// Get last prescription for a patient
router.get('/patient/:patientId/last', validateId('patientId'), getLastPrescription);

// List all prescriptions for a patient
router.get('/:patientId', validateId('patientId'), listPrescriptions);

// Create new prescription
router.post('/', joiValidate(createPrescription), auditLogger('PRESCRIPTION'), addPrescription);

// End patient visit without prescription
router.post('/end-visit', auditLogger('PRESCRIPTION'), endVisit);

// =====================================================
// PRESCRIPTION SHARING ROUTES
// =====================================================

// Share prescription via WhatsApp/Email/Link/QR
router.post('/:prescriptionId/share', validateId('prescriptionId'), sharePrescription);

// Get all share options for a prescription
router.get('/:prescriptionId/share-options', validateId('prescriptionId'), getShareOptions);

module.exports = router;