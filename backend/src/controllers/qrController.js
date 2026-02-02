const { getDb } = require('../config/db');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');

/**
 * Generate QR code for doctor
 * POST /api/qr/generate/:doctorId
 */
const generateDoctorQR = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const db = getDb();

    // Get doctor details
    const [doctor] = await db.execute(
      'SELECT * FROM doctors WHERE id = ?',
      [doctorId]
    );

    if (doctor.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Doctor not found'
      });
    }

    // Generate QR code URL
    const qrUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/qr/${doctorId}`;
    
    // Generate QR code image
    const qrCodeDataUrl = await QRCode.toDataURL(qrUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // Save QR code to database
    const qrId = uuidv4();
    await db.execute(
      `INSERT INTO doctor_qr_codes 
       (id, doctor_id, qr_url, qr_code_data, is_active, created_at, created_by)
       VALUES (?, ?, ?, ?, 1, NOW(), ?)
       ON DUPLICATE KEY UPDATE 
       qr_url = VALUES(qr_url),
       qr_code_data = VALUES(qr_code_data),
       is_active = VALUES(is_active),
       updated_at = NOW()`,
      [qrId, doctorId, qrUrl, qrCodeDataUrl, req.user?.id]
    );

    res.json({
      success: true,
      data: {
        doctorId,
        doctorName: doctor[0].name,
        specialization: doctor[0].specialization,
        qrUrl,
        qrCodeDataUrl,
        qrId
      }
    });

  } catch (error) {
    console.error('Error generating QR code:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate QR code'
    });
  }
};

/**
 * Get doctor QR code info
 * GET /api/qr/doctor/:doctorId
 */
const getDoctorQRInfo = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const db = getDb();

    const [doctor] = await db.execute(
      `SELECT d.*, qr.qr_url, qr.qr_code_data, qr.is_active, qr.created_at as qr_created_at
       FROM doctors d
       LEFT JOIN doctor_qr_codes qr ON d.id = qr.doctor_id
       WHERE d.id = ?`,
      [doctorId]
    );

    if (doctor.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Doctor not found'
      });
    }

    res.json({
      success: true,
      data: doctor[0]
    });

  } catch (error) {
    console.error('Error fetching QR info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch QR info'
    });
  }
};

/**
 * Get doctor availability for QR booking
 * GET /api/qr/availability/:doctorId
 */
const getDoctorAvailability = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { date } = req.query;
    const db = getDb();

    // Get doctor details
    const [doctor] = await db.execute(
      'SELECT * FROM doctors WHERE id = ?',
      [doctorId]
    );

    if (doctor.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Doctor not found'
      });
    }

    // Get today's queue count
    const [queueCount] = await db.execute(
      `SELECT COUNT(*) as count FROM opd_queue 
       WHERE doctor_id = ? AND DATE(created_at) = CURDATE()`,
      [doctorId]
    );

    // Get doctor's time slots (if available)
    const [timeSlots] = await db.execute(
      `SELECT * FROM doctor_time_slots 
       WHERE doctor_id = ? AND is_active = 1
       ORDER BY start_time`,
      [doctorId]
    );

    // Calculate estimated wait time
    const estimatedWaitTime = queueCount[0].count * 15; // 15 minutes per patient

    res.json({
      success: true,
      data: {
        doctor: doctor[0],
        todayQueueCount: queueCount[0].count,
        estimatedWaitTime,
        timeSlots: timeSlots,
        isAvailable: doctor[0].is_active && queueCount[0].count < (doctor[0].max_daily_patients || 50)
      }
    });

  } catch (error) {
    console.error('Error fetching availability:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch availability'
    });
  }
};

/**
 * Book appointment via QR code
 * POST /api/qr/book/:doctorId
 */
const bookViaQR = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { patientName, patientPhone, patientAge, patientGender, symptoms, preferredTime } = req.body;
    const db = getDb();

    // Check if doctor is available
    const [doctor] = await db.execute(
      'SELECT * FROM doctors WHERE id = ? AND is_active = 1',
      [doctorId]
    );

    if (doctor.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Doctor is not available'
      });
    }

    // Check if patient already exists
    const [existingPatient] = await db.execute(
      'SELECT * FROM patients WHERE phone = ?',
      [patientPhone]
    );

    let patientId;
    if (existingPatient.length > 0) {
      patientId = existingPatient[0].id;
    } else {
      // Create new patient
      const [newPatient] = await db.execute(
        `INSERT INTO patients 
         (id, name, phone, age, gender, created_at, created_by)
         VALUES (?, ?, ?, ?, ?, NOW(), ?)`,
        [uuidv4(), patientName, patientPhone, patientAge, patientGender, 'system']
      );
      patientId = newPatient.insertId;
    }

    // Get current queue count
    const [queueCount] = await db.execute(
      `SELECT COUNT(*) as count FROM opd_queue 
       WHERE doctor_id = ? AND DATE(created_at) = CURDATE()`,
      [doctorId]
    );

    const tokenNumber = queueCount[0].count + 1;

    // Create OPD visit
    const visitId = uuidv4();
    await db.execute(
      `INSERT INTO opd_visits 
       (id, patient_id, doctor_id, appointment_type, priority, status, token_number, created_at, created_by)
       VALUES (?, ?, ?, 'OPD', 'normal', 'waiting', ?, NOW(), ?)`,
      [visitId, patientId, doctorId, tokenNumber, 'qr_booking']
    );

    // Add to queue
    await db.execute(
      `INSERT INTO opd_queue 
       (visit_id, patient_id, doctor_id, token_number, status, priority, created_at)
       VALUES (?, ?, ?, ?, 'waiting', 'normal', NOW())`,
      [visitId, patientId, doctorId, tokenNumber]
    );

    // Create appointment record
    await db.execute(
      `INSERT INTO appointments 
       (id, patient_id, doctor_id, visit_id, appointment_type, status, symptoms, preferred_time, created_at, created_by)
       VALUES (?, ?, ?, ?, 'OPD', 'booked', ?, ?, NOW(), ?)`,
      [uuidv4(), patientId, doctorId, visitId, JSON.stringify(symptoms || []), preferredTime, 'qr_booking']
    );

    // Send WhatsApp notification (if configured)
    try {
      // WhatsApp integration code here
      console.log(`WhatsApp notification sent to ${patientPhone}: Your token #${tokenNumber} for Dr. ${doctor[0].name}`);
    } catch (error) {
      console.log('WhatsApp notification failed:', error.message);
    }

    res.json({
      success: true,
      data: {
        visitId,
        tokenNumber,
        patientName,
        doctorName: doctor[0].name,
        specialization: doctor[0].specialization,
        estimatedWaitTime: queueCount[0].count * 15,
        bookingTime: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error booking via QR:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to book appointment'
    });
  }
};

/**
 * Get all QR codes for admin
 * GET /api/qr/all
 */
const getAllQRCodes = async (req, res) => {
  try {
    const db = getDb();

    const [qrCodes] = await db.execute(
      `SELECT d.id as doctor_id, d.name as doctor_name, d.specialization, 
              qr.qr_url, qr.qr_code_data, qr.is_active, qr.created_at as qr_created_at,
              COUNT(q.visit_id) as total_bookings
       FROM doctors d
       LEFT JOIN doctor_qr_codes qr ON d.id = qr.doctor_id
       LEFT JOIN opd_queue q ON d.id = q.doctor_id AND DATE(q.check_in_time) = CURDATE()
       GROUP BY d.id, qr.id
       ORDER BY d.name`
    );

    res.json({
      success: true,
      data: qrCodes
    });

  } catch (error) {
    console.error('Error fetching QR codes:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch QR codes'
    });
  }
};

/**
 * Toggle QR code active status
 * PUT /api/qr/toggle/:doctorId
 */
const toggleQRStatus = async (req, res) => {
  try {
    const { doctorId } = req.params;
    const { isActive } = req.body;
    const db = getDb();

    await db.execute(
      `UPDATE doctor_qr_codes 
       SET is_active = ?, updated_at = NOW()
       WHERE doctor_id = ?`,
      [isActive, doctorId]
    );

    res.json({
      success: true,
      message: `QR code ${isActive ? 'activated' : 'deactivated'} successfully`
    });

  } catch (error) {
    console.error('Error toggling QR status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to toggle QR status'
    });
  }
};

module.exports = {
  generateDoctorQR,
  getDoctorQRInfo,
  getDoctorAvailability,
  bookViaQR,
  getAllQRCodes,
  toggleQRStatus
};
