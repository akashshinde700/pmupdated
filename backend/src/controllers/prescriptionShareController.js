/**
 * Prescription Share Controller
 * Handles prescription sharing via WhatsApp, Email, Link, and QR Code
 */

const { getDb } = require('../config/db');
const QRCode = require('qrcode');
const { sendEmail } = require('../services/emailService');
const jsPDF = require('jspdf');
require('jspdf-autotable');

// =====================================================
// SHARE PRESCRIPTION (Unified endpoint)
// =====================================================

exports.sharePrescription = async (req, res) => {
  try {
    const { prescriptionId } = req.params;
    const { method, email, phone, billId } = req.body;

    const db = getDb();
    const baseUrl = process.env.FRONTEND_URL || process.env.BASE_URL || 'http://drjaju.com';

    // Fetch prescription with patient details
    const [prescriptions] = await db.execute(`
      SELECT
        p.id,
        p.patient_id,
        p.doctor_id,
        p.prescribed_date,
        p.diagnosis,
        p.advice,
        pa.name as patient_name,
        pa.phone as patient_phone,
        pa.email as patient_email,
        u.name as doctor_name,
        d.specialization,
        c.name as clinic_name,
        c.phone as clinic_phone
      FROM prescriptions p
      JOIN patients pa ON p.patient_id = pa.id
      JOIN doctors d ON p.doctor_id = d.id
      LEFT JOIN users u ON d.user_id = u.id
      JOIN clinics c ON d.clinic_id = c.id
      WHERE p.id = ?
    `, [prescriptionId]);

    if (prescriptions.length === 0) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    const prescription = prescriptions[0];

    // Generate share link
    const shareLink = `${baseUrl}/prescription/view/${prescriptionId}`;
    const pdfLink = `${baseUrl}/api/pdf/prescription/${prescriptionId}`;

    switch (method) {
      case 'whatsapp':
        return handleWhatsAppShare(res, prescription, shareLink, phone, billId);

      case 'email':
        return handleEmailShare(req, res, prescription, pdfLink, email);

      case 'link':
        return handleLinkShare(res, prescription, shareLink, pdfLink);

      case 'qrcode':
        return handleQRCodeShare(res, prescription, shareLink);

      case 'all':
        return handleAllShareMethods(res, prescription, shareLink, pdfLink);

      default:
        return res.status(400).json({ error: 'Invalid share method. Use: whatsapp, email, link, qrcode, or all' });
    }

  } catch (error) {
    console.error('Share prescription error:', error);
    res.status(500).json({ error: 'Failed to share prescription', details: error.message });
  }
};

// =====================================================
// WHATSAPP SHARING
// =====================================================

async function handleWhatsAppShare(res, prescription, shareLink, phone, billId) {
  const patientPhone = phone || prescription.patient_phone;

  // Format phone number for WhatsApp
  let formattedPhone = patientPhone?.replace(/[^0-9]/g, '');
  if (formattedPhone && formattedPhone.length === 10) {
    formattedPhone = '91' + formattedPhone; // Add India country code
  }

  // Generate WhatsApp message
  const message = `
🏥 *${prescription.clinic_name}*
━━━━━━━━━━━━━━━━━━━━

📋 *PRESCRIPTION*

👤 Patient: ${prescription.patient_name}
👨‍⚕️ Doctor: Dr. ${prescription.doctor_name}
📅 Date: ${new Date(prescription.prescribed_date).toLocaleDateString('en-IN')}

${prescription.diagnosis ? `🩺 Diagnosis: ${prescription.diagnosis}` : ''}

📎 View full prescription: ${shareLink}

━━━━━━━━━━━━━━━━━━━━
${prescription.clinic_phone ? `📞 ${prescription.clinic_phone}` : ''}

_This is an auto-generated message._
  `.trim();

  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = formattedPhone
    ? `https://wa.me/${formattedPhone}?text=${encodedMessage}`
    : `https://wa.me/?text=${encodedMessage}`;

  res.json({
    success: true,
    method: 'whatsapp',
    shareUrl: whatsappUrl,
    message: 'WhatsApp share link generated',
    phone: formattedPhone || null
  });
}

// =====================================================
// EMAIL SHARING
// =====================================================

async function handleEmailShare(req, res, prescription, pdfLink, email) {
  const recipientEmail = email || prescription.patient_email;

  if (!recipientEmail) {
    return res.status(400).json({ error: 'Email address is required' });
  }

  try {
    // Send email with prescription details
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: #003366; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0;">${prescription.clinic_name}</h1>
          <p style="margin: 5px 0;">${prescription.clinic_phone || ''}</p>
        </div>

        <div style="padding: 20px; background: #f9f9f9;">
          <h2 style="color: #003366;">Your Prescription</h2>

          <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Patient:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${prescription.patient_name}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Doctor:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">Dr. ${prescription.doctor_name}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Date:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${new Date(prescription.prescribed_date).toLocaleDateString('en-IN')}</td>
            </tr>
            ${prescription.diagnosis ? `
            <tr>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;"><strong>Diagnosis:</strong></td>
              <td style="padding: 8px; border-bottom: 1px solid #ddd;">${prescription.diagnosis}</td>
            </tr>
            ` : ''}
          </table>

          <div style="text-align: center; margin: 20px 0;">
            <a href="${pdfLink}"
               style="background: #003366; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
              📥 Download Prescription PDF
            </a>
          </div>

          ${prescription.advice ? `
          <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin-top: 15px;">
            <strong>Doctor's Advice:</strong><br>
            ${prescription.advice}
          </div>
          ` : ''}
        </div>

        <div style="background: #333; color: #ccc; padding: 15px; text-align: center; font-size: 12px;">
          <p>This is an automated email from ${prescription.clinic_name}</p>
          <p>Please do not reply to this email.</p>
        </div>
      </div>
    `;

    await sendEmail({
      to: recipientEmail,
      subject: `Your Prescription - ${prescription.clinic_name}`,
      html: htmlContent,
      text: `Your prescription from Dr. ${prescription.doctor_name} is ready. View it at: ${pdfLink}`
    });

    // Log email sent
    const db = getDb();
    try {
      await db.execute(`
        INSERT INTO email_logs (recipient_email, subject, status, template_type, sent_at)
        VALUES (?, ?, 'sent', 'prescription', NOW())
      `, [recipientEmail, `Prescription - ${prescription.clinic_name}`]);
    } catch (logErr) {
      console.warn('Email log insert warning:', logErr.message);
    }

    res.json({
      success: true,
      method: 'email',
      message: `Prescription sent to ${recipientEmail}`,
      email: recipientEmail
    });

  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({ error: 'Failed to send email', details: error.message });
  }
}

// =====================================================
// LINK SHARING
// =====================================================

async function handleLinkShare(res, prescription, shareLink, pdfLink) {
  res.json({
    success: true,
    method: 'link',
    links: {
      view: shareLink,
      pdf: pdfLink,
      copy: shareLink
    },
    message: 'Share links generated'
  });
}

// =====================================================
// QR CODE SHARING
// =====================================================

async function handleQRCodeShare(res, prescription, shareLink) {
  try {
    // Generate QR code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(shareLink, {
      width: 300,
      margin: 2,
      color: {
        dark: '#003366',
        light: '#ffffff'
      }
    });

    res.json({
      success: true,
      method: 'qrcode',
      qrCode: qrCodeDataUrl,
      shareLink: shareLink,
      message: 'QR code generated successfully'
    });

  } catch (error) {
    console.error('QR code generation error:', error);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
}

// =====================================================
// ALL SHARE METHODS
// =====================================================

async function handleAllShareMethods(res, prescription, shareLink, pdfLink) {
  try {
    // Generate QR code
    const qrCodeDataUrl = await QRCode.toDataURL(shareLink, {
      width: 300,
      margin: 2,
      color: {
        dark: '#003366',
        light: '#ffffff'
      }
    });

    // Format phone for WhatsApp
    let formattedPhone = prescription.patient_phone?.replace(/[^0-9]/g, '');
    if (formattedPhone && formattedPhone.length === 10) {
      formattedPhone = '91' + formattedPhone;
    }

    const message = `📋 Your prescription from ${prescription.clinic_name} is ready.\n\n👨‍⚕️ Dr. ${prescription.doctor_name}\n📅 ${new Date(prescription.prescribed_date).toLocaleDateString('en-IN')}\n\n📎 View: ${shareLink}`;
    const encodedMessage = encodeURIComponent(message);

    res.json({
      success: true,
      prescription: {
        id: prescription.id,
        patient_name: prescription.patient_name,
        doctor_name: prescription.doctor_name,
        date: prescription.prescribed_date
      },
      sharing: {
        links: {
          view: shareLink,
          pdf: pdfLink
        },
        whatsapp: {
          url: formattedPhone
            ? `https://wa.me/${formattedPhone}?text=${encodedMessage}`
            : `https://wa.me/?text=${encodedMessage}`,
          phone: formattedPhone || null
        },
        email: {
          recipient: prescription.patient_email || null,
          available: !!prescription.patient_email
        },
        qrCode: qrCodeDataUrl
      }
    });

  } catch (error) {
    console.error('Generate all share methods error:', error);
    res.status(500).json({ error: 'Failed to generate share options' });
  }
}

// =====================================================
// GET SHARE OPTIONS (GET endpoint)
// =====================================================

exports.getShareOptions = async (req, res) => {
  try {
    const { prescriptionId } = req.params;
    req.body = { method: 'all' };
    return exports.sharePrescription(req, res);
  } catch (error) {
    console.error('Get share options error:', error);
    res.status(500).json({ error: 'Failed to get share options' });
  }
};

// =====================================================
// GENERATE PRESCRIPTION QR CODE
// =====================================================

exports.generatePrescriptionQR = async (req, res) => {
  try {
    const { prescriptionId } = req.params;
    const { format } = req.query; // 'dataurl' or 'image'

    const baseUrl = process.env.FRONTEND_URL || 'http://drjaju.com';
    const shareLink = `${baseUrl}/prescription/view/${prescriptionId}`;

    if (format === 'image') {
      // Return as PNG image
      const qrBuffer = await QRCode.toBuffer(shareLink, {
        width: 400,
        margin: 2,
        color: {
          dark: '#003366',
          light: '#ffffff'
        }
      });

      res.set('Content-Type', 'image/png');
      res.set('Content-Disposition', `inline; filename="prescription-${prescriptionId}-qr.png"`);
      return res.send(qrBuffer);
    }

    // Return as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(shareLink, {
      width: 300,
      margin: 2
    });

    res.json({
      success: true,
      qrCode: qrCodeDataUrl,
      shareLink: shareLink
    });

  } catch (error) {
    console.error('Generate QR error:', error);
    res.status(500).json({ error: 'Failed to generate QR code' });
  }
};

// =====================================================
// PUBLIC PRESCRIPTION VIEW (for shared links)
// =====================================================

exports.viewSharedPrescription = async (req, res) => {
  try {
    const { prescriptionId } = req.params;
    const db = getDb();

    // Fetch prescription with full details
    const [prescriptions] = await db.execute(`
      SELECT
        p.*,
        pa.name as patient_name,
        pa.age_years,
        pa.gender,
        u.name as doctor_name,
        d.specialization,
        d.registration_number,
        c.name as clinic_name,
        c.phone as clinic_phone,
        c.address as clinic_address,
        c.email as clinic_email
      FROM prescriptions p
      JOIN patients pa ON p.patient_id = pa.id
      JOIN doctors d ON p.doctor_id = d.id
      LEFT JOIN users u ON d.user_id = u.id
      JOIN clinics c ON d.clinic_id = c.id
      WHERE p.id = ?
    `, [prescriptionId]);

    if (prescriptions.length === 0) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    const prescription = prescriptions[0];

    // Fetch medicines
    const [items] = await db.execute(`
      SELECT * FROM prescription_items WHERE prescription_id = ?
    `, [prescriptionId]);

    // Fetch vitals (table is patient_vitals, linked via appointment_id or patient_id)
    const [vitals] = await db.execute(`
      SELECT * FROM patient_vitals WHERE patient_id = ?
      ORDER BY recorded_at DESC LIMIT 1
    `, [prescription.patient_id]);

    res.json({
      success: true,
      prescription: {
        ...prescription,
        medicines: items,
        vitals: vitals[0] || null
      }
    });

  } catch (error) {
    console.error('View shared prescription error:', error);
    res.status(500).json({ error: 'Failed to load prescription' });
  }
};
