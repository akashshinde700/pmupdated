const { getDb } = require('../config/db');
const { sendSuccess, sendError } = require('../utils/responseHelper');
const PDFDocument = require('pdfkit');

async function hasBillsColumn(db, columnName) {
  try {
    const [cols] = await db.execute(
      "SELECT column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'bills' AND column_name = ? LIMIT 1",
      [columnName]
    );
    return Array.isArray(cols) && cols.length > 0;
  } catch (_e) {
    return false;
  }
}

// Get clinic settings for receipts
async function getClinicSettings(req, res) {
  try {
    const db = getDb();
    let clinicId = req.query.clinic_id;
    
    // If no clinic_id provided, get from logged-in user
    if (!clinicId && req.user) {
      const [users] = await db.execute(
        `SELECT clinic_id FROM users WHERE id = ?`,
        [req.user.id]
      );
      if (users.length > 0 && users[0].clinic_id) {
        clinicId = users[0].clinic_id;
      }
    }
    
    if (!clinicId) {
      // Return first active clinic as default
      const [clinics] = await db.execute(
        `SELECT * FROM clinics WHERE is_active = 1 LIMIT 1`
      );
      if (clinics.length > 0) {
        return res.json({ success: true, clinic: clinics[0] });
      }
      return res.status(404).json({ success: false, error: 'No clinic found' });
    }
    
    const [clinics] = await db.execute(
      `SELECT * FROM clinics WHERE id = ?`,
      [clinicId]
    );
    
    if (clinics.length === 0) {
      return res.status(404).json({ success: false, error: 'Clinic not found' });
    }
    
    res.json({ success: true, clinic: clinics[0] });
  } catch (error) {
    console.error('Get clinic settings error:', error);
    res.status(500).json({ error: 'Failed to fetch clinic settings' });
  }
}

// List bills - simplified version
async function listBills(req, res) {
  try {
    console.log('🔍 listBills called with query:', req.query);
    const { 
      page = 1, 
      limit = 50, 
      search, 
      name, 
      uhid, 
      phone, 
      payment_status, 
      start_date,
      end_date
    } = req.query;
    
    const limitNum = Math.min(parseInt(limit, 10) || 50, 100);
    const offset = (parseInt(page, 10) - 1) * limitNum;
    const db = getDb();
    console.log('🔍 Database connection obtained');

    // Build WHERE clause
    let whereSql = 'WHERE 1=1';
    const params = [];

    // Payment status filter
    if (payment_status) {
      whereSql += ' AND b.payment_status = ?';
      params.push(payment_status);
    }

    // Date filters (bill_date)
    if (start_date) {
      whereSql += ' AND b.bill_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      whereSql += ' AND b.bill_date <= ?';
      params.push(end_date);
    }

    // Patient filters
    if (name) {
      whereSql += ' AND LOWER(p.name) LIKE ?';
      params.push(`%${String(name).toLowerCase()}%`);
    }
    if (uhid) {
      whereSql += ' AND LOWER(p.patient_id) LIKE ?';
      params.push(`%${String(uhid).toLowerCase()}%`);
    }
    if (phone) {
      whereSql += ' AND p.phone LIKE ?';
      params.push(`%${String(phone)}%`);
    }

    // Generic search across common fields
    if (search) {
      const s = `%${String(search).toLowerCase()}%`;
      whereSql += " AND (LOWER(p.name) LIKE ? OR LOWER(p.patient_id) LIKE ? OR p.phone LIKE ? OR CAST(b.id AS CHAR) LIKE ? OR LOWER(IFNULL(b.bill_number, '')) LIKE ?)";
      params.push(s, s, `%${String(search)}%`, `%${String(search)}%`, s);
    }

    // Trim fields for list view to reduce payload
    const [bills] = await db.execute(`
      SELECT 
        b.id,
        b.patient_id,
        b.bill_number,
        b.total_amount,
        b.amount_paid,
        b.payment_status,
        b.bill_date,
        b.created_at,
        p.patient_id as uhid,
        p.name as patient_name,
        p.phone as patient_phone
      FROM bills b
      LEFT JOIN patients p ON b.patient_id = p.id
      ${whereSql}
      ORDER BY b.bill_date DESC
      LIMIT ${limitNum} OFFSET ${offset}
    `, params);
    console.log('🔍 Simple query successful, results:', bills.length);
    
    const [countResult] = await db.execute(
      `SELECT COUNT(*) as total FROM bills b LEFT JOIN patients p ON b.patient_id = p.id ${whereSql}`,
      params
    );
    const total = countResult[0]?.total || 0;
    
    console.log('🔍 Sending response');
    return sendSuccess(res, {
      bills: bills,
      pagination: {
        page: parseInt(page, 10),
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
    
  } catch (error) {
    console.error('🔍 listBills error:', error);
    sendError(res, 'Failed to fetch bills', 500, process.env.NODE_ENV === 'development' ? error.message : undefined);
  }
}

async function getUnbilledVisits(req, res) {
  try {
    console.log('🔍 getUnbilledVisits called with query:', req.query);
    const { start_date, end_date } = req.query;
    const db = getDb();
    console.log('🔍 Database connection obtained');

    // Simple query first to test
    const [visits] = await db.execute(`
      SELECT a.*, p.name as patient_name, p.patient_id as uhid 
      FROM appointments a 
      LEFT JOIN patients p ON a.patient_id = p.id 
      WHERE a.status = 'completed' 
      LIMIT 5
    `);
    console.log('🔍 Simple query successful, results:', visits.length);
    
    console.log('🔍 Sending response');
    return sendSuccess(res, {
      visits: visits
    });
    
  } catch (error) {
    console.error('🔍 getUnbilledVisits error:', error);
    sendError(res, 'Failed to fetch unbilled visits', 500, process.env.NODE_ENV === 'development' ? error.message : undefined);
  }
}

// Get single bill
async function getBill(req, res) {
  try {
    const { id } = req.params;
    const db = getDb();
    
    const [bills] = await db.execute(`
      SELECT b.*, p.name as patient_name, p.patient_id as patient_uhid,
             p.phone as patient_phone, p.email as patient_email,
             u.name as doctor_name,
             d.specialization as doctor_specialization,
             c.name as clinic_name
      FROM bills b
      LEFT JOIN patients p ON b.patient_id = p.id
      LEFT JOIN doctors d ON b.doctor_id = d.id
      LEFT JOIN users u ON d.user_id = u.id
      LEFT JOIN clinics c ON b.clinic_id = c.id
      WHERE b.id = ?
    `, [id]);
    
    if (bills.length === 0) {
      return res.status(404).json({ error: 'Bill not found' });
    }
    
    const bill = bills[0];
    
    // Get bill items
    const [items] = await db.execute(`
      SELECT bi.*, s.name as service_name, s.code as service_code
      FROM bill_items bi
      LEFT JOIN services s ON bi.service_id = s.id
      WHERE bi.bill_id = ?
      ORDER BY bi.sort_order
    `, [id]);
    
    bill.items = items;
    
    res.json({ success: true, bill });
  } catch (error) {
    console.error('Get bill error:', error);
    res.status(500).json({ error: 'Failed to fetch bill' });
  }
}

// Create new bill
async function addBill(req, res) {
  try {
    const db = getDb();
    const body = req.body;

    const patient_id = body.patient_id;
    const appointment_id = body.appointment_id || body.appointmentId || null;
    const clinic_id = body.clinic_id || req.user?.clinic_id || null;
    const doctor_id = body.doctor_id || null;
    const bill_number = body.bill_number || null;
    const template_id = body.template_id || null;
    const subtotal = body.subtotal || body.amount || 0;
    const discount_percent = body.discount_percent || 0;
    const discount_amount = body.discount_amount || body.discount || body.additional_discount || 0;
    const tax_percent = body.tax_percent || 0;
    const tax_amount = body.tax_amount || body.tax || 0;
    const total_amount = body.total_amount || 0;
    const amount_paid = body.amount_paid || 0;
    const balance_due = body.balance_due || (total_amount - amount_paid);
    const payment_method = body.payment_method || 'cash';
    const payment_reference = body.payment_reference || body.payment_id || null;
    const payment_status = body.payment_status || 'pending';
    // Bill line items (support both shapes used across frontend/pages)
    // - items: internal/legacy shape
    // - service_items: receipts page shape
    const items = Array.isArray(body.items) ? body.items : [];
    const serviceItems = Array.isArray(body.service_items) ? body.service_items : [];
    
    // Ensure payment status consistency
    let final_payment_status = payment_status;
    if (payment_status === 'completed') {
      final_payment_status = 'paid';
    }
    
    // Auto-determine payment status based on amount
    if (amount_paid >= total_amount && total_amount > 0) {
      final_payment_status = 'paid';
    } else if (amount_paid > 0 && amount_paid < total_amount) {
      final_payment_status = 'partial';
    } else if (amount_paid === 0) {
      final_payment_status = 'pending';
    }
    const bill_date = body.bill_date || new Date().toISOString().split('T')[0];
    const due_date = body.due_date || null;
    const notes = body.notes || body.remarks || null;

    // Validate required fields
    if (!patient_id) {
      return res.status(400).json({ error: 'Patient ID is required' });
    }

    // Check for existing bill to prevent duplicates
    let existingBillCheck = '';
    let checkParams = [patient_id];
    
    if (appointment_id) {
      existingBillCheck = ' AND appointment_id = ?';
      checkParams.push(appointment_id);
    }
    
    const [existingBills] = await db.execute(
      `SELECT id FROM bills WHERE patient_id = ?${existingBillCheck} ORDER BY created_at DESC LIMIT 1`,
      checkParams
    );
    
    if (existingBills.length > 0) {
      return res.status(409).json({ 
        error: 'Bill already exists for this appointment',
        existing_bill_id: existingBills[0].id
      });
    }

    // Detect whether bills table has appointment_id column (for backward-compatible schemas)
    let hasAppointmentId = false;
    try {
      const [cols] = await db.execute(
        "SELECT column_name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'bills' AND column_name = 'appointment_id' LIMIT 1"
      );
      hasAppointmentId = Array.isArray(cols) && cols.length > 0;
    } catch (_e) {
      hasAppointmentId = false;
    }

    // Create bill
    const insertSql = hasAppointmentId
      ? `
        INSERT INTO bills (
          patient_id, appointment_id, clinic_id, doctor_id, bill_number, template_id,
          subtotal, discount_percent, discount_amount, tax_percent, tax_amount,
          total_amount, amount_paid, balance_due, payment_method, payment_reference,
          payment_status, bill_date, due_date, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
      : `
        INSERT INTO bills (
          patient_id, clinic_id, doctor_id, bill_number, template_id,
          subtotal, discount_percent, discount_amount, tax_percent, tax_amount,
          total_amount, amount_paid, balance_due, payment_method, payment_reference,
          payment_status, bill_date, due_date, notes, created_by
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

    const insertParams = hasAppointmentId
      ? [
          patient_id, appointment_id,
          clinic_id, doctor_id, bill_number, template_id,
          subtotal, discount_percent, discount_amount, tax_percent, tax_amount,
          total_amount, amount_paid, balance_due, payment_method, payment_reference,
          final_payment_status, bill_date, due_date, notes, req.user.id
        ]
      : [
          patient_id,
          clinic_id, doctor_id, bill_number, template_id,
          subtotal, discount_percent, discount_amount, tax_percent, tax_amount,
          total_amount, amount_paid, balance_due, payment_method, payment_reference,
          final_payment_status, bill_date, due_date, notes, req.user.id
        ];

    const [result] = await db.execute(insertSql, insertParams);

    const billId = result.insertId;

    // Save bill items (prefer explicit items; otherwise map service_items)
    console.log('🔍 DEBUG: Items received:', items);
    console.log('🔍 DEBUG: ServiceItems received:', serviceItems);
    
    const normalizedItems = (items.length > 0 ? items : serviceItems).map((it, idx) => {
      const quantity = it.quantity ?? it.qty ?? 1;
      const unitPrice = it.unit_price ?? it.amount ?? it.price ?? 0;
      const discountAmount = it.discount_amount ?? it.discount ?? 0;
      const taxPercent = it.tax_percent ?? 0;
      const taxAmount = it.tax_amount ?? 0;
      const totalPrice = it.total_price ?? it.total ?? (Number(quantity || 1) * Number(unitPrice || 0) - Number(discountAmount || 0));
      
      console.log(`🔍 DEBUG: Processing item ${idx}:`, {
        original: it,
        quantity,
        unitPrice,
        discountAmount,
        totalPrice
      });
      
      return {
        service_id: it.service_id ?? null,
        service_name: it.service_name ?? it.service ?? it.name ?? it.item_name ?? 'Service',
        quantity: Number(quantity) || 1,
        unit_price: Number(unitPrice) || 0,
        discount_amount: Number(discountAmount) || 0,
        tax_percent: Number(taxPercent) || 0,
        tax_amount: Number(taxAmount) || 0,
        total_price: Number(totalPrice) || 0,
        sort_order: idx + 1
      };
    });

    if (normalizedItems.length > 0) {
      console.log('🔍 DEBUG: Inserting bill items:', normalizedItems.length, 'items');
      for (const it of normalizedItems) {
        try {
          await db.execute(
            `INSERT INTO bill_items (
              bill_id, service_id, service_name, quantity, unit_price,
              discount_amount, tax_percent, tax_amount, total_price, sort_order
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              billId,
              it.service_id,
              it.service_name,
              it.quantity,
              it.unit_price,
              it.discount_amount,
              it.tax_percent,
              it.tax_amount,
              it.total_price,
              it.sort_order
            ]
          );
          console.log('✅ DEBUG: Bill item inserted successfully:', it.service_name, it.total_price);
        } catch (itemError) {
          console.error('❌ DEBUG: Failed to insert bill item:', it, itemError);
          throw itemError;
        }
      }
    } else {
      console.log('⚠️ DEBUG: No normalized items to insert');
    }

    // Update patient statistics
    await db.execute('CALL sp_update_patient_stats(?)', [patient_id]);

    // Fetch the complete bill with items to return to frontend
    const [billData] = await db.execute(
      `SELECT b.*, 
              c.name as clinic_name, c.address as clinic_address, c.phone as clinic_phone,
              p.name as patient_name, p.phone as patient_phone,
              u.name as created_by_name
       FROM bills b
       LEFT JOIN clinics c ON b.clinic_id = c.id
       LEFT JOIN patients p ON b.patient_id = p.id
       LEFT JOIN users u ON b.created_by = u.id
       WHERE b.id = ?`,
      [billId]
    );

    // Fetch bill items
    const [billItems] = await db.execute(
      `SELECT * FROM bill_items WHERE bill_id = ? ORDER BY sort_order, id`,
      [billId]
    );

    const bill = billData[0] || {};
    bill.service_items = billItems;

    res.status(201).json({
      success: true,
      message: 'Bill created successfully',
      bill_id: billId,
      bill: bill,
      ...bill // Include all bill data at root level for compatibility
    });
  } catch (error) {
    console.error('Add bill error:', error);
    res.status(500).json({ error: 'Failed to create bill' });
  }
}

// Update bill
async function updateBill(req, res) {
  try {
    const { id } = req.params;
    const db = getDb();
    const updates = req.body;

    // Remove fields that shouldn't be updated
    delete updates.id;
    delete updates.created_at;
    delete updates.created_by;

    // Build dynamic update query
    const updateFields = Object.keys(updates).filter(key => updates[key] !== undefined);
    const updateValues = updateFields.map(key => `${key} = ?`);
    const updateParams = updateFields.map(key => updates[key]);

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const updateQuery = `
      UPDATE bills 
      SET ${updateValues.join(', ')}, updated_by = ?, updated_at = NOW()
      WHERE id = ?
    `;

    await db.execute(updateQuery, [...updateParams, req.user.id, id]);

    // Update bill items if provided (support both items and service_items)
    const hasItems = Array.isArray(updates.items);
    const hasServiceItems = Array.isArray(updates.service_items);
    if (hasItems || hasServiceItems) {
      const incoming = hasItems ? updates.items : updates.service_items;

      await db.execute('DELETE FROM bill_items WHERE bill_id = ?', [id]);

      const normalizedItems = (incoming || []).map((it, idx) => {
        const quantity = it.quantity ?? it.qty ?? 1;
        const unitPrice = it.unit_price ?? it.amount ?? it.price ?? 0;
        const discountAmount = it.discount_amount ?? it.discount ?? 0;
        const taxPercent = it.tax_percent ?? 0;
        const taxAmount = it.tax_amount ?? 0;
        const totalPrice = it.total_price ?? it.total ?? (Number(quantity || 1) * Number(unitPrice || 0) - Number(discountAmount || 0));
        return {
          service_id: it.service_id ?? null,
          service_name: it.service_name ?? it.service ?? it.name ?? it.item_name ?? 'Service',
          quantity: Number(quantity) || 1,
          unit_price: Number(unitPrice) || 0,
          discount_amount: Number(discountAmount) || 0,
          tax_percent: Number(taxPercent) || 0,
          tax_amount: Number(taxAmount) || 0,
          total_price: Number(totalPrice) || 0,
          sort_order: idx + 1
        };
      });

      for (const it of normalizedItems) {
        await db.execute(
          `INSERT INTO bill_items (
            bill_id, service_id, service_name, quantity, unit_price,
            discount_amount, tax_percent, tax_amount, total_price, sort_order
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            id,
            it.service_id,
            it.service_name,
            it.quantity,
            it.unit_price,
            it.discount_amount,
            it.tax_percent,
            it.tax_amount,
            it.total_price,
            it.sort_order
          ]
        );
      }
    }

    res.json({
      success: true,
      message: 'Bill updated successfully'
    });
  } catch (error) {
    console.error('Update bill error:', error);
    res.status(500).json({ error: 'Failed to update bill' });
  }
}

// Update bill status
async function updateBillStatus(req, res) {
  try {
    const { id } = req.params;
    const { payment_status, amount_paid, payment_method, payment_reference } = req.body;
    const db = getDb();

    await db.execute(`
      UPDATE bills 
      SET payment_status = ?, amount_paid = ?, payment_method = ?, 
          payment_reference = ?, updated_at = NOW()
      WHERE id = ?
    `, [payment_status, amount_paid, payment_method, payment_reference, id]);

    const hasAppointmentId = await hasBillsColumn(db, 'appointment_id');
    if (hasAppointmentId) {
      const [rows] = await db.execute(
        'SELECT appointment_id FROM bills WHERE id = ? LIMIT 1',
        [id]
      );
      const appointmentId = rows && rows[0] && rows[0].appointment_id;
      if (appointmentId) {
        // Keep appointment payment status in sync with bill
        try {
          await db.execute(
            'UPDATE appointments SET payment_status = ?, updated_at = NOW() WHERE id = ?',
            [payment_status, appointmentId]
          );
        } catch (_e) {
          // ignore
        }

        // When paid, ensure any linked queue entry is marked completed
        if ((payment_status || '').toLowerCase() === 'paid') {
          try {
            await db.execute(
              "UPDATE queue SET status = 'completed', completed_at = IFNULL(completed_at, NOW()) WHERE appointment_id = ? AND status <> 'completed'",
              [appointmentId]
            );
          } catch (_e) {
            // ignore
          }
        }
      }
    }

    res.json({
      success: true,
      message: 'Bill status updated successfully'
    });
  } catch (error) {
    console.error('Update bill status error:', error);
    res.status(500).json({ error: 'Failed to update bill status' });
  }
}

// Delete bill
async function deleteBill(req, res) {
  try {
    const { id } = req.params;
    const db = getDb();

    // Delete bill items first (foreign key constraint)
    await db.execute('DELETE FROM bill_items WHERE bill_id = ?', [id]);
    
    // Delete the bill
    await db.execute('DELETE FROM bills WHERE id = ?', [id]);

    res.json({
      success: true,
      message: 'Bill deleted successfully'
    });
  } catch (error) {
    console.error('Delete bill error:', error);
    res.status(500).json({ error: 'Failed to delete bill' });
  }
}

// Generate receipt PDF (placeholder)
async function generateReceiptPDF(req, res) {
  try {
    const { id } = req.params;
    const db = getDb();

    const [bills] = await db.execute(`
      SELECT b.*, p.name as patient_name, p.patient_id as patient_uhid,
             p.phone as patient_phone, p.email as patient_email,
             u.name as doctor_name,
             d.specialization as doctor_specialization,
             c.name as clinic_name, c.address as clinic_address,
             c.city as clinic_city, c.state as clinic_state, c.pincode as clinic_pincode,
             c.phone as clinic_phone, c.email as clinic_email
      FROM bills b
      LEFT JOIN patients p ON b.patient_id = p.id
      LEFT JOIN doctors d ON b.doctor_id = d.id
      LEFT JOIN users u ON d.user_id = u.id
      LEFT JOIN clinics c ON b.clinic_id = c.id
      WHERE b.id = ?
    `, [id]);

    if (bills.length === 0) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    const bill = bills[0];

    const [items] = await db.execute(
      `SELECT bi.*, COALESCE(bi.service_name, s.name) AS item_name
       FROM bill_items bi
       LEFT JOIN services s ON bi.service_id = s.id
       WHERE bi.bill_id = ?
       ORDER BY bi.sort_order ASC`,
      [id]
    );

    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('error', () => {});

    doc.fontSize(16).text(bill.clinic_name || 'Clinic', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).text(`Receipt / Bill #${bill.bill_number || bill.id}`, { align: 'center' });
    doc.moveDown(1);

    doc.fontSize(11).text(`Patient: ${bill.patient_name || ''}`);
    doc.fontSize(10).text(`UHID: ${bill.patient_uhid || ''}`);
    doc.text(`Phone: ${bill.patient_phone || ''}`);
    doc.text(`Date: ${bill.bill_date ? new Date(bill.bill_date).toISOString().slice(0, 10) : ''}`);
    doc.moveDown(1);

    doc.fontSize(11).text('Items');
    doc.moveDown(0.5);
    doc.fontSize(10);

    if (Array.isArray(items) && items.length > 0) {
      for (const it of items) {
        const qty = it.quantity != null ? Number(it.quantity) : 1;
        const unit = it.unit_price != null ? Number(it.unit_price) : 0;
        const total = it.total_price != null ? Number(it.total_price) : (qty * unit);
        doc.text(`${it.item_name || 'Service'}  x${qty}  @ ${unit.toFixed(2)}  = ${total.toFixed(2)}`);
      }
    } else {
      doc.text('No item details available.');
    }

    doc.moveDown(1);
    doc.fontSize(11).text(`Total: ₹${Number(bill.total_amount || 0).toFixed(2)}`);
    doc.fontSize(10).text(`Paid: ₹${Number(bill.amount_paid || 0).toFixed(2)}`);
    doc.text(`Status: ${bill.payment_status || ''}`);

    doc.end();

    await new Promise((resolve) => doc.on('end', resolve));
    const pdfBuffer = Buffer.concat(chunks);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt_${bill.bill_number || bill.id}.pdf"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Generate receipt PDF error:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
}

// Send bill via WhatsApp (placeholder)
async function sendBillWhatsApp(req, res) {
  try {
    const { id } = req.params;
    const db = getDb();

    const [bills] = await db.execute(`
      SELECT b.*, p.name as patient_name, p.phone as patient_phone,
             u.name as doctor_name,
             c.name as clinic_name
      FROM bills b
      LEFT JOIN patients p ON b.patient_id = p.id
      LEFT JOIN doctors d ON b.doctor_id = d.id
      LEFT JOIN users u ON d.user_id = u.id
      LEFT JOIN clinics c ON b.clinic_id = c.id
      WHERE b.id = ?
    `, [id]);

    if (bills.length === 0) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    const bill = bills[0];
    
    // Generate WhatsApp message
    const message = `Dear ${bill.patient_name},\n\nYour bill (${bill.bill_number}) of ₹${bill.total_amount} is ready.\n\nDue date: ${bill.due_date}\n\nThank you!`;

    res.json({
      success: true,
      message: 'WhatsApp message prepared successfully',
      patient_phone: bill.patient_phone,
      whatsapp_message: message,
      pdf_url: `/api/bills/${id}/pdf`
    });
  } catch (error) {
    console.error('Send bill WhatsApp error:', error);
    res.status(500).json({ error: 'Failed to process WhatsApp request' });
  }
}

module.exports = {
  getClinicSettings,
  listBills,
  getBill,
  addBill,
  updateBill,
  updateBillStatus,
  deleteBill,
  generateReceiptPDF,
  sendBillWhatsApp
};
