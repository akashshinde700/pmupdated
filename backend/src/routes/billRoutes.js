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

    // Auto-migrate: add cash_component / other_component columns if they don't exist
    try {
      const [cols] = await db.execute(
        "SELECT column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'bills' AND column_name IN ('cash_component','other_component')"
      );
      const existing = (cols || []).map(c => c.column_name || c.COLUMN_NAME);
      if (!existing.includes('cash_component')) {
        await db.execute("ALTER TABLE bills ADD COLUMN cash_component DECIMAL(10,2) DEFAULT NULL");
      }
      if (!existing.includes('other_component')) {
        await db.execute("ALTER TABLE bills ADD COLUMN other_component DECIMAL(10,2) DEFAULT NULL");
      }
    } catch (_migErr) { /* ignore migration errors — columns may already exist */ }

    const [summary] = await db.execute(`
      SELECT
        COUNT(*) as total_bills,
        SUM(total_amount)  as total_revenue,
        SUM(amount_paid)   as total_collected,
        SUM(balance_due)   as total_outstanding,

        -- Status counts (all time)
        SUM(CASE WHEN payment_status = 'paid'    THEN 1 ELSE 0 END) as paid_count,
        SUM(CASE WHEN payment_status = 'pending' THEN 1 ELSE 0 END) as pending_count,
        SUM(CASE WHEN payment_status = 'partial' THEN 1 ELSE 0 END) as partial_count,

        -- Status amounts (all time)
        SUM(CASE WHEN payment_status = 'paid'    THEN amount_paid   ELSE 0 END) as paid_amount,
        SUM(CASE WHEN payment_status = 'pending' THEN total_amount  ELSE 0 END) as pending_amount,
        SUM(CASE WHEN payment_status = 'partial' THEN balance_due   ELSE 0 END) as partial_balance,

        -- Today counts & amounts
        SUM(CASE WHEN DATE(IFNULL(bill_date, created_at)) = CURDATE() THEN 1 ELSE 0 END) as today_count,
        SUM(CASE WHEN DATE(IFNULL(bill_date, created_at)) = CURDATE() THEN amount_paid ELSE 0 END) as today_collected,

        SUM(CASE WHEN DATE(IFNULL(bill_date, created_at)) = CURDATE() AND payment_status = 'paid'    THEN 1 ELSE 0 END) as today_paid_count,
        SUM(CASE WHEN DATE(IFNULL(bill_date, created_at)) = CURDATE() AND payment_status = 'pending' THEN 1 ELSE 0 END) as today_pending_count,
        SUM(CASE WHEN DATE(IFNULL(bill_date, created_at)) = CURDATE() AND payment_status = 'partial' THEN 1 ELSE 0 END) as today_partial_count,

        SUM(CASE WHEN DATE(IFNULL(bill_date, created_at)) = CURDATE() AND payment_status = 'paid'    THEN amount_paid  ELSE 0 END) as today_paid_amount,
        SUM(CASE WHEN DATE(IFNULL(bill_date, created_at)) = CURDATE() AND payment_status = 'pending' THEN total_amount ELSE 0 END) as today_pending_amount,
        SUM(CASE WHEN DATE(IFNULL(bill_date, created_at)) = CURDATE() AND payment_status = 'partial' THEN balance_due  ELSE 0 END) as today_partial_balance,

        -- Payment method breakdown (split payments use cash_component / other_component)
        SUM(CASE
          WHEN payment_method = 'cash'                               THEN amount_paid
          WHEN payment_method IN ('cash+upi','cash+card')            THEN IFNULL(cash_component, 0)
          ELSE 0 END) as cash_amount,
        SUM(CASE
          WHEN payment_method IN ('upi','gpay')                      THEN amount_paid
          WHEN payment_method = 'cash+upi'                           THEN IFNULL(other_component, 0)
          ELSE 0 END) as upi_amount,
        SUM(CASE
          WHEN payment_method IN ('debit_card','credit_card','card') THEN amount_paid
          WHEN payment_method = 'cash+card'                          THEN IFNULL(other_component, 0)
          ELSE 0 END) as card_amount,
        SUM(CASE WHEN payment_method = 'bank_transfer'               THEN amount_paid ELSE 0 END) as bank_amount,
        SUM(CASE
          WHEN payment_method NOT IN ('cash','upi','gpay','debit_card','credit_card','card','bank_transfer','cash+upi','cash+card')
            OR payment_method IS NULL                                THEN amount_paid
          ELSE 0 END) as other_amount
      FROM bills
    `);

    res.json({
      ...(summary[0] || {}),
      // Backward-compatible aliases
      paid_bills:    summary[0]?.paid_count    || 0,
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

      // Sync appointment payment_status only. Do NOT auto-complete queue on payment.
    try {
      const [billRows] = await db.execute('SELECT appointment_id FROM bills WHERE id = ?', [id]);
      const appointmentId = billRows[0]?.appointment_id;
      if (appointmentId) {
        await db.execute('UPDATE appointments SET payment_status = ?, updated_at = NOW() WHERE id = ?', [newStatus, appointmentId]);
        // IMPORTANT: Previously we auto-marked the queue entry as 'completed' when payment became 'paid'.
        // That removed patients from the active queue prematurely. Keep the patient in the queue until
        // an explicit queue status change (e.g., via /api/queue/:id/status) sets them to 'completed'.
      }
    } catch (_e) { /* sync is best-effort */ }

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