// =====================================================
// PDF GENERATOR ROUTES
// Purpose: Routes for generating PDFs
// =====================================================

const express = require('express');
const router = express.Router();
const pdfController = require('../controllers/pdfGeneratorController');
const { authenticateToken } = require('../middleware/auth');
const joiValidate = require('../middleware/joiValidate');
const { generatePdf } = require('../validation/commonSchemas');

// =====================================================
// PUBLIC PDF ROUTES (no auth required for sharing)
// =====================================================

/**
 * @route GET /api/pdf/bill/:billId
 * @desc Generate PDF for a bill/invoice
 * @access Public (for sharing via link)
 * @returns PDF file
 */
router.get('/bill/:billId', pdfController.generateBillingPDF);

// =====================================================
// PROTECTED ROUTES (require authentication)
// =====================================================
router.use(authenticateToken);

// =====================================================
// PRESCRIPTION PDF
// =====================================================

/**
 * @route GET /api/pdf/prescription/:prescriptionId
 * @desc Generate PDF for a prescription
 * @access Private (Authenticated users)
 * @returns PDF file
 */
router.get('/prescription/:prescriptionId', pdfController.generatePrescriptionPDF);

// =====================================================
// MEDICAL CERTIFICATE PDF
// =====================================================

/**
 * @route GET /api/pdf/certificate/:certificateId
 * @desc Generate PDF for a medical certificate
 * @access Private (Authenticated users)
 * @returns PDF file
 */
router.get('/certificate/:certificateId', pdfController.generateCertificatePDF);

// =====================================================
// REFERRAL PDF
// =====================================================

/**
 * @route GET /api/pdf/referral/:referralId
 * @desc Generate PDF for a referral letter
 * @access Private (Authenticated users)
 * @returns PDF file
 */
router.get('/referral/:referralId', pdfController.generateReferralPDF);

// =====================================================
// PDF SHARING ROUTES
// =====================================================

/**
 * @route POST /api/pdf/prescription/:prescriptionId/send-email
 * @desc Send prescription PDF via email
 * @access Private (Authenticated users)
 * @body { email: string, patientName?: string }
 */
router.post('/prescription/:prescriptionId/send-email', pdfController.sendPrescriptionPDFEmail);

/**
 * @route GET /api/pdf/prescription/:prescriptionId/share-link
 * @desc Get shareable links for prescription PDF (direct, WhatsApp)
 * @access Private (Authenticated users)
 */
router.get('/prescription/:prescriptionId/share-link', pdfController.getPrescriptionShareLink);

module.exports = router;
