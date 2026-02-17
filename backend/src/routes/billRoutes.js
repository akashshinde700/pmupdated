// src/routes/billRoutes.js
const express = require('express');
const {
  listBills,
  addBill,
  getBill,
  updateBill,
  updateBillStatus,
  deleteBill,
  getClinicSettings,
  generateReceiptPDF,
  sendBillWhatsApp,
  getUnbilledVisits,
  deleteUnbilledVisit
} = require('../controllers/billController');

// ✅ SAHI IMPORT - Destructuring se authentication le rahe hain app.use se
const { auditLogger } = require('../middleware/auditLogger');
const joiValidate = require('../middleware/joiValidate');
const { createBill, updateBill: updateBillSchema, updateBillStatus: updateBillStatusSchema, updateBillPayment: updateBillPaymentSchema } = require('../validation/commonSchemas');

const router = express.Router();

// Get services list from database with categories
router.get('/services', async (req, res) => {
  try {
    const { getDb } = require('../config/db');
    const db = getDb();
    const [services] = await db.execute(
      'SELECT id, service_name as name, category, default_price as price, unit FROM billing_services WHERE is_active = 1 ORDER BY category, sort_order, service_name'
    );
    // Group by category
    const grouped = {};
    for (const s of services) {
      if (!grouped[s.category]) grouped[s.category] = [];
      grouped[s.category].push(s);
    }
    res.json({ success: true, services, grouped });
  } catch (error) {
    console.error('Failed to fetch services:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch services' });
  }
});

// Add new billing service
router.post('/services', async (req, res) => {
  try {
    const { getDb } = require('../config/db');
    const db = getDb();
    const { service_name, category, default_price, unit } = req.body;
    if (!service_name || !category) {
      return res.status(400).json({ success: false, error: 'Service name and category are required' });
    }
    const [result] = await db.execute(
      'INSERT INTO billing_services (service_name, category, default_price, unit) VALUES (?, ?, ?, ?)',
      [service_name, category, parseFloat(default_price) || 0, unit || 'per visit']
    );
    res.status(201).json({ success: true, id: result.insertId, message: 'Service added' });
  } catch (error) {
    console.error('Failed to add service:', error);
    res.status(500).json({ success: false, error: 'Failed to add service' });
  }
});

// Update billing service
router.put('/services/:id', async (req, res) => {
  try {
    const { getDb } = require('../config/db');
    const db = getDb();
    const { service_name, category, default_price, unit } = req.body;
    await db.execute(
      'UPDATE billing_services SET service_name = ?, category = ?, default_price = ?, unit = ? WHERE id = ?',
      [service_name, category, parseFloat(default_price) || 0, unit || 'per visit', req.params.id]
    );
    res.json({ success: true, message: 'Service updated' });
  } catch (error) {
    console.error('Failed to update service:', error);
    res.status(500).json({ success: false, error: 'Failed to update service' });
  }
});

// Delete billing service
router.delete('/services/:id', async (req, res) => {
  try {
    const { getDb } = require('../config/db');
    const db = getDb();
    await db.execute('DELETE FROM billing_services WHERE id = ?', [req.params.id]);
    res.json({ success: true, message: 'Service deleted' });
  } catch (error) {
    console.error('Failed to delete service:', error);
    res.status(500).json({ success: false, error: 'Failed to delete service' });
  }
});

// Clinic settings routes (protected by app.use middleware)
router.get('/clinic-settings', getClinicSettings);

// Summary and unbilled visits routes
router.get('/summary', async (req, res) => {
  try {
    const { getDb } = require('../config/db');
    const db = getDb();
    const [summary] = await db.execute(`
      SELECT
        COUNT(*) as total_bills,
        SUM(total_amount) as total_revenue,
        SUM(amount_paid) as total_collected,
        SUM(balance_due) as total_outstanding,
        SUM(CASE WHEN payment_status = 'paid' THEN 1 ELSE 0 END) as paid_count,
        SUM(CASE WHEN payment_status = 'pending' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN payment_status = 'partial' THEN 1 ELSE 0 END) as partial_count
      FROM bills
    `);

    // Optional: unbilled visits count (only if bills has appointment_id column)
    let unbilled_visits = 0;
    try {
      const [cols] = await db.execute(
        "SELECT column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'bills' AND column_name = 'appointment_id' LIMIT 1"
      );
      const hasAppointmentId = Array.isArray(cols) && cols.length > 0;
      if (hasAppointmentId) {
        const [r] = await db.execute(
          `SELECT COUNT(*) AS cnt
           FROM appointments a
           WHERE (a.status = 'completed' OR a.status = 'pending')
             AND a.id NOT IN (SELECT DISTINCT b.appointment_id FROM bills b WHERE b.appointment_id IS NOT NULL AND b.appointment_id != '')`
        );
        unbilled_visits = r[0]?.cnt || 0;
      }
    } catch (_e) {
      unbilled_visits = 0;
    }

    res.json({
      ...(summary[0] || {}),
      unbilled_visits,
      // Backward-compatible aliases some frontend code expects
      paid_bills: summary[0]?.paid_count || 0,
      pending_bills: summary[0]?.pending_count || 0
    });
  } catch (error) {
    console.error('Get bills summary error:', error);
    res.status(500).json({ error: 'Failed to fetch bills summary' });
  }
});

router.get('/unbilled-visits', getUnbilledVisits);

// CRUD routes
router.get('/', listBills);
router.get('/:id/pdf', generateReceiptPDF);
router.get('/:id/whatsapp', sendBillWhatsApp);
router.get('/:id', getBill);
router.post('/', joiValidate(createBill), auditLogger('BILL'), addBill);
router.put('/:id', joiValidate(updateBillSchema), auditLogger('BILL'), updateBill);
router.patch('/:id/status', joiValidate(updateBillStatusSchema), auditLogger('BILL'), updateBillStatus);
router.patch('/:id/payment', joiValidate(updateBillPaymentSchema), async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, paid_amount } = req.body;
    
    // First get current bill details
    const { getDb } = require('../config/db');
    const db = getDb();
    const [bills] = await db.execute(
      'SELECT total_amount, amount_paid FROM bills WHERE id = ?',
      [id]
    );
    
    if (bills.length === 0) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    
    const bill = bills[0];
    const currentPaid = parseFloat(bill.amount_paid || 0);
    const totalAmount = parseFloat(bill.total_amount);
    // Support both:
    // - { amount } as incremental payment
    // - { paid_amount } as absolute paid total (frontend sends this)
    const hasAbsolute = paid_amount !== undefined && paid_amount !== null;
    const newPaidAmount = hasAbsolute ? parseFloat(paid_amount) : (currentPaid + parseFloat(amount));
    const remainingAmount = totalAmount - newPaidAmount;
    
    // Determine new payment status
    let newStatus = 'pending';
    if (newPaidAmount >= totalAmount) {
      newStatus = 'paid';
    } else if (newPaidAmount > 0) {
      newStatus = 'partial';
    }
    
    // Update bill
    await db.execute(
      'UPDATE bills SET amount_paid = ?, payment_status = ?, balance_due = ? WHERE id = ?',
      [newPaidAmount, newStatus, remainingAmount, id]
    );
    
    res.json({ 
      success: true, 
      paid_amount: newPaidAmount,
      remaining_amount: remainingAmount,
      payment_status: newStatus
    });
  } catch (error) {
    console.error('Update payment error:', error);
    res.status(500).json({ error: 'Failed to update payment' });
  }
});
router.delete('/unbilled-visits/:id', auditLogger('BILL'), deleteUnbilledVisit);
router.delete('/:id', auditLogger('BILL'), deleteBill);

module.exports = router;