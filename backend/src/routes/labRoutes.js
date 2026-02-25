const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { listLabs, addLab, updateLab, deleteLab } = require('../controllers/labController');
const { auditLogger } = require('../middleware/auditLogger');
const joiValidate = require('../middleware/joiValidate');
const { createInvestigation, updateInvestigation } = require('../validation/commonSchemas');
const { getDb } = require('../config/db');

const router = express.Router();

router.get('/', authenticateToken, listLabs);
router.post('/', authenticateToken, joiValidate(createInvestigation), auditLogger('LAB'), addLab);

// POST /api/labs/:patientId - Add lab result for a patient (used by PatientOverview & PrescriptionPad)
router.post('/:patientId', authenticateToken, async (req, res) => {
  try {
    const { patientId } = req.params;
    const { test_name, result_value, result_unit, reference_range, result_date, notes, status, test_category, report_group } = req.body;
    if (!test_name) return res.status(400).json({ error: 'test_name is required' });
    const db = getDb();
    const [result] = await db.execute(
      `INSERT INTO lab_investigations (patient_id, clinic_id, doctor_id, test_name, result_value, result_date, result_unit, reference_range, notes, status, test_category, report_group)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        patientId,
        req.user?.clinic_id || null,
        req.user?.id || null,
        test_name,
        result_value || null,
        result_date || new Date(),
        result_unit || null,
        reference_range || null,
        notes || null,
        status || 'completed',
        test_category || null,
        report_group || null
      ]
    );
    res.status(201).json({ id: result.insertId, message: 'Lab result added' });
  } catch (error) {
    console.error('Add lab result error:', error);
    res.status(500).json({ error: 'Failed to add lab result' });
  }
});

// GET /api/labs/:patientId - Get lab results for a patient (used by PatientOverview)
router.get('/:patientId', authenticateToken, async (req, res) => {
  try {
    const { patientId } = req.params;
    const db = getDb();
    const [labs] = await db.execute(
      `SELECT id, test_name as name, result_value as reading, result_date as date, result_unit as unit, report_group, reference_range, test_category
       FROM lab_investigations WHERE patient_id = ? ORDER BY result_date DESC, report_group, id`,
      [patientId]
    );
    res.json({ labs });
  } catch (error) {
    console.error('List patient labs error:', error);
    res.status(500).json({ error: 'Failed to fetch labs' });
  }
});

router.put('/:id', authenticateToken, joiValidate(updateInvestigation), auditLogger('LAB'), updateLab);
router.delete('/:id', authenticateToken, auditLogger('LAB'), deleteLab);

module.exports = router;
