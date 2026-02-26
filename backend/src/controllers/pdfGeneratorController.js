// =====================================================
// PDF GENERATOR CONTROLLER
// Purpose: Generate PDFs for prescriptions, bills, certificates, referrals
// Version: 1.0
// =====================================================

const { jsPDF } = require('jspdf');
const { applyPlugin } = require('jspdf-autotable');
applyPlugin(jsPDF);
const html2canvas = require('html2canvas');
const puppeteer = require('puppeteer');
const { getDb } = require('../config/db');
const path = require('path');

// =====================================================
// PRESCRIPTION PDF
// =====================================================

// Timing translation dictionaries for PDF generation
const timingTranslations = {
  en: ['After Meal', 'Before Breakfast', 'Before Meal', 'Empty Stomach', 'With Food'],
  hi: ['खाने के बाद', 'नाश्ते से पहले', 'खाने से पहले', 'खाली पेट', 'खाने के साथ'],
  mr: ['जेवणानंतर', 'नाश्त्यापूर्वी', 'जेवणापूर्वी', 'रिकाम्या पोटी', 'जेवणासोबत'],
  bn: ['খাওয়ার পরে', 'সকালের খাবারের আগে', 'খাবারের আগে', 'পেট খালি', 'খাবারের সাথে'],
  gu: ['ખાણ પછી', 'નાસ્તા પહેલાં', 'ખાણ પહેલાં', 'પેટ ખાલી', 'ખાણ સાથે'],
  ta: ['உணவுக்குப் பின்', 'காலை உணவுக்கு முன்', 'உணவுக்கு முன்', 'வயிற்று காலி', 'உணவுடன்'],
  te: ['భోజనం తర్వాత', 'అర్థాన్నికి ముందు', 'భోజనానికి ముందు', 'ఖాలీ పేట', 'భోజనంతో'],
  kn: ['ಊಟದ ನಂತರ', 'ಬೆಳಿಗ್ಗೆ ಊಟಕ್ಕೂ ಮೊದು', 'ಊಟಕ್ಕೂ ಮೊದು', 'ಖಾಲಿ ಹೊಟ್ಟ', 'ಊಟದೊಂದಿಗೆ'],
  ml: ['ഭക്ഷണത്തിനു ശേഷം', 'രാവിലെ ഭക്ഷണത്തിനു മുമ്പ്', 'ഭക്ഷണത്തിനു മുമ്പ്', 'വയറു ശൂന്യം', 'ഭക്ഷണത്തോടൊപ്പം'],
  pa: ['ਖਾਣ ਤੋਂ ਬਾਅਦ', 'ਸਵੇਰ ਤੋਂ ਪਹਿਲਾਂ', 'ਖਾਣ ਤੋਂ ਪਹਿਲਾਂ', 'ਖਾਲੀ ਪੇਟ', 'ਖਾਣ ਨਾਲ'],
  ur: ['کھنے کے بعد', 'ناشتے سے پہلے', 'کھانے سے پہلے', 'بھیجے پیٹ', 'کھانے کے ساتھ']
};

const instructionTranslations = {
  'After food to avoid gastric irritation': { hi: 'गैस्ट्रिक जलन से बचने के लिए खाने के बाद', mr: 'जठरामाशयीय जलनापासून बचण्यासाठी खाण्यानंतर' },
  'Take with water': { hi: 'पानी के साथ लें', mr: 'पाण्याबरोबर घ्या' },
  'May cause mild drowsiness': { hi: 'हल्की नींद आ सकती है', mr: 'हल्की निंद्रा येऊ शकते' },
  'Take at onset of headache': { hi: 'सिरदर्द की शुरुआत में लें', mr: 'डोकेदुखी सुरू होताच घ्या' },
  'Preventive. Continue for 1 month.': { hi: 'निवारक। 1 महीने तक जारी रखें।', mr: 'प्रतिबंधक। 1 महिन्यासाठी सुरू ठेवा।' },
  'For nausea and vomiting': { hi: 'मतली और उल्टी के लिए', mr: 'मळमळ आणि उलटी साठी' }
};

// Convert any language timing back to English for PDF (jsPDF can't render Devanagari)
function timingToEnglish(timingValue) {
  if (!timingValue) return '-';
  // Check if timing is already in English
  if (timingTranslations.en.includes(timingValue)) return timingValue;
  // Search all languages to find the index, then return English
  for (const lang of Object.keys(timingTranslations)) {
    const idx = timingTranslations[lang].indexOf(timingValue);
    if (idx !== -1) return timingTranslations.en[idx] || timingValue;
  }
  // Check if it contains non-ASCII (Devanagari etc) - return fallback
  if (/[^\x00-\x7F]/.test(timingValue)) return 'After Meal';
  return timingValue;
}

// Convert any language instruction back to English for PDF
function instructionToEnglish(instruction) {
  if (!instruction) return '-';
  // Check if already ASCII/English
  if (!/[^\x00-\x7F]/.test(instruction)) return instruction;
  // Reverse lookup: find English key from translated value
  for (const [enKey, langs] of Object.entries(instructionTranslations)) {
    for (const [, text] of Object.entries(langs)) {
      if (text === instruction) return enKey;
    }
  }
  // Additional reverse mappings for common instructions
  const reverseMap = {
    'पानी के साथ लें': 'Take with water',
    'पानी के साथ लें, अनुशंसित खुराक से अधिक न लें': 'Take with water, do not exceed recommended dose',
    'डॉक्टर के निर्देशानुसार लें': 'Take as prescribed by doctor',
    'खाने के बाद लें': 'Take after meals',
    'खाने से पहले लें': 'Take before meals',
    'खाली पेट पर लें': 'Take on empty stomach',
    'सोते समय लें': 'Take at bedtime',
    'पूरा कोर्स पूरा करें': 'Complete the full course',
    'कुचलें या चबाएं नहीं': 'Do not crush or chew',
    'शराब से बचें': 'Avoid alcohol',
    'हल्की नींद आ सकती है': 'May cause mild drowsiness',
    'गैस्ट्रिक जलन से बचने के लिए खाने के बाद': 'After food to avoid gastric irritation',
    'खाने से 30 मिनट पहले लें': 'Take 30 min before food',
    'स्थानीय रूप से लगाएं': 'Apply locally',
    'केवल बाहरी उपयोग के लिए': 'For external use only',
    'SOS - जरूरत पड़ने पर ही लें': 'SOS - take only when needed',
    'चिकित्सक के निर्देशानुसार': 'As directed by physician',
    'बुखार और दर्द के लिए': 'For fever and pain',
    'पाण्याबरोबर घ्या': 'Take with water',
    'पाण्याबरोबर घ्या, शिफारस केलेल्या डोसपेक्षा जास्त घेऊ नका': 'Take with water, do not exceed recommended dose',
    'डॉक्टरांच्या सल्ल्यानुसार घ्या': 'Take as prescribed by doctor',
    'जेवणानंतर घ्या': 'Take after meals',
    'जेवणापूर्वी घ्या': 'Take before meals',
    'रिकाम्या पोटी घ्या': 'Take on empty stomach',
    'झोपण्यापूर्वी घ्या': 'Take at bedtime',
    'संपूर्ण कोर्स पूर्ण करा': 'Complete the full course',
    'कुस्करू किंवा चावू नका': 'Do not crush or chew',
    'मद्यपान टाळा': 'Avoid alcohol',
    'हल्की निंद्रा येऊ शकते': 'May cause mild drowsiness',
    'खाण्यापूर्वी 30 मिनिटे आधी घ्या': 'Take 30 min before food',
    'स्थानिकपणे लावा': 'Apply locally',
    'फक्त बाह्य वापरासाठी': 'For external use only',
    'SOS - गरज असेल तेव्हाच घ्या': 'SOS - take only when needed',
    'रक्तचाप नियंत्रण के लिए ACE अवरोधक': 'ACE inhibitor for BP control',
    'दीर्घकालिक ACE अवरोधक': 'Long-acting ACE inhibitor',
    'पेट के लिए सुरक्षात्मक कोटिंग': 'Protective coating for stomach',
    'मतली और उल्टी के लिए': 'For nausea and vomiting',
    'मळमळ आणि उलटी साठी': 'For nausea and vomiting',
    // Marathi instructions
    'दीर्घ-कार्यरत ACE प्रतिबंधक': 'Long-acting ACE inhibitor',
    'BP नियंत्रणासाठी ACE प्रतिबंधक': 'ACE inhibitor for BP control',
    'जठरामाशयीय जलनापासून बचण्यासाठी खाण्यानंतर': 'After food to avoid gastric irritation',
    'डोकेदुखी सुरू होताच घ्या': 'Take at onset of headache',
    'प्रतिबंधक। 1 महिन्यासाठी सुरू ठेवा।': 'Preventive. Continue for 1 month.',
    'मळमळीक आणि उल्टीसाठी': 'For nausea and vomiting',
    'पोटासाठी संरक्षक कोटिंग': 'Protective coating for stomach',
    'अचानक दुखापुरठे मदतीसाठी': 'For sudden pain relief',
    'ताप आणि वेदनांसाठी': 'For fever and pain',
    'खोकल्यासाठी': 'For cough',
    'अॅलर्जीसाठी': 'For allergy',
    'अॅसिडिटीसाठी': 'For acidity',
    'डॉक्टरांच्या सल्ल्यानुसार': 'As directed by physician',
    // Hindi instructions
    'सिरदर्द की शुरुआत में लें': 'Take at onset of headache',
    'निवारक। 1 महीने तक जारी रखें।': 'Preventive. Continue for 1 month.',
    'अचानक दर्द से राहत के लिए': 'For sudden pain relief',
    'खांसी के लिए': 'For cough',
    'एलर्जी के लिए': 'For allergy',
    'एसिडिटी के लिए': 'For acidity',
    'दीर्घ-कार्यरत ACE अवरोधक': 'Long-acting ACE inhibitor',
  };
  if (reverseMap[instruction]) return reverseMap[instruction];
  // Partial match: check if any reverseMap key is contained in the instruction
  for (const [key, val] of Object.entries(reverseMap)) {
    if (instruction.includes(key)) return val;
  }
  return 'As directed by physician';
}

exports.generatePrescriptionPDF = async (req, res) => {
  try {
    const { prescriptionId } = req.params;
    const lang = req.query.lang || null;
    const overrideTemplateId = req.query.template_id || null;
    // with_letterhead=1 means include clinic header/footer; default = no letterhead
    const withLetterhead = req.query.with_letterhead === '1';
    const db = getDb();

    // Fetch prescription data with template_id
    const [prescriptions] = await db.execute(`
      SELECT
        p.id, p.patient_id, p.doctor_id, p.prescribed_date, p.template_id,
        p.chief_complaint, p.advice, p.diagnosis,
        p.patient_notes, p.lab_advice, p.lab_remarks,
        pa.name as patient_name, pa.phone as patient_phone, pa.patient_id as uhid,
        pa.dob, pa.age_years, pa.gender,
        u.name as doctor_name, d.specialization, d.qualification, d.user_id as doctor_user_id,
        c.name as clinic_name, c.phone as clinic_phone, c.address as clinic_address
      FROM prescriptions p
      LEFT JOIN patients pa ON p.patient_id = pa.id
      LEFT JOIN doctors d ON p.doctor_id = d.id
      LEFT JOIN users u ON d.user_id = u.id
      LEFT JOIN clinics c ON d.clinic_id = c.id
      WHERE p.id = ?
    `, [prescriptionId]);

    if (prescriptions.length === 0) {
      return res.status(404).json({ error: 'Prescription not found' });
    }

    const prescription = prescriptions[0];

    // Fetch prescription items (medicines)
    const [items] = await db.execute(`
      SELECT pi.id, pi.medicine_name, pi.dosage, pi.frequency, pi.duration, pi.notes as instructions, pi.timing, pi.quantity, pi.is_tapering
      FROM prescription_items pi WHERE pi.prescription_id = ? ORDER BY pi.sort_order ASC, pi.id ASC
    `, [prescriptionId]);

    // Load tapering schedules for tapering items
    for (const item of items) {
      if (item.is_tapering) {
        const [steps] = await db.execute(
          `SELECT step_number, dose, frequency, duration_days
           FROM tapering_schedules WHERE prescription_item_id = ? ORDER BY step_number ASC`,
          [item.id]
        );
        item.tapering_schedule = steps;
      }
    }

    // Fetch letterhead only when requested
    let headerImg = null, footerImg = null;
    if (withLetterhead) try {
      // 1. Try pad_configurations for this doctor
      if (prescription.doctor_user_id) {
        const [padConf] = await db.execute(
          'SELECT header_image, footer_image FROM pad_configurations WHERE doctor_id = ? LIMIT 1',
          [prescription.doctor_user_id]
        );
        if (padConf.length > 0) {
          headerImg = padConf[0].header_image || null;
          footerImg = padConf[0].footer_image || null;
        }
      }
      // 2. Use receipt_template only if explicitly selected (template_id set or overridden via query)
      const effectiveTemplateId = overrideTemplateId || prescription.template_id;
      if (!headerImg && effectiveTemplateId) {
        const [templates] = await db.execute(
          'SELECT header_image, footer_image FROM receipt_templates WHERE id = ? LIMIT 1',
          [effectiveTemplateId]
        );
        if (templates.length > 0) {
          headerImg = templates[0].header_image || headerImg;
          footerImg = templates[0].footer_image || footerImg;
        }
      }
    } catch (e) { console.error('Letterhead fetch error:', e.message); }

    // Generate PDF
    const doc = new jsPDF('p', 'mm', 'A4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 10;

    // --- HEADER: only when withLetterhead ---
    if (withLetterhead) {
      if (headerImg) {
        try {
          const imgData = headerImg.startsWith('data:') ? headerImg : 'data:image/png;base64,' + headerImg;
          doc.addImage(imgData, 'PNG', 0, 0, pageWidth, 40);
          y = 42;
        } catch (e) {
          console.error('Header image error:', e.message);
          headerImg = null;
        }
      }
      if (!headerImg) {
        // Text-based clinic header
        doc.setFontSize(18);
        doc.setTextColor(211, 47, 47);
        doc.setFont(undefined, 'bold');
        doc.text(prescription.clinic_name || 'CLINIC AND DIAGNOSTIC CENTER', 12, y + 6);
        doc.setFontSize(14);
        doc.setTextColor(0, 51, 102);
        doc.text('Dr. ' + (prescription.doctor_name || ''), pageWidth - 12, y + 6, { align: 'right' });
        y += 10;
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        doc.setFont(undefined, 'normal');
        if (prescription.clinic_address) { doc.text(prescription.clinic_address, 12, y); }
        const qualLine = [prescription.qualification, prescription.specialization].filter(Boolean).join(', ');
        if (qualLine) { doc.text(qualLine, pageWidth - 12, y, { align: 'right' }); }
        y += 4;
        if (prescription.clinic_phone) { doc.text('Phone: ' + prescription.clinic_phone, 12, y); }
        y += 3;
        doc.setDrawColor(2, 136, 209);
        doc.setLineWidth(0.8);
        doc.line(10, y, pageWidth - 10, y);
        y += 5;
      }
    }

    // --- DOCTOR INFO + DATE (always shown) ---
    const prescDate = prescription.prescribed_date ? new Date(prescription.prescribed_date) : new Date();
    const dateStr = prescDate.toLocaleDateString('en-IN');
    const timeStr = prescDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(80, 80, 80);
    if (withLetterhead && headerImg) {
      // Header image present: show doctor name + credentials + date below the image
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'bold');
      doc.text('Dr. ' + (prescription.doctor_name || ''), 12, y);
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text('Date: ' + dateStr + '  Time: ' + timeStr, pageWidth - 12, y, { align: 'right' });
      y += 4;
      const docDetails = [prescription.specialization, prescription.qualification].filter(Boolean).join(' | ');
      if (docDetails) { doc.text(docDetails, 12, y); y += 4; }
    } else if (withLetterhead && !headerImg) {
      // Text header already showed clinic + doctor — just add date on right
      doc.text('Date: ' + dateStr + '  Time: ' + timeStr, pageWidth - 12, y, { align: 'right' });
      y += 5;
    } else {
      // No letterhead: show compact doctor name, credentials and date at top
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'bold');
      doc.text('Dr. ' + (prescription.doctor_name || ''), 12, y);
      doc.setFontSize(8);
      doc.setFont(undefined, 'normal');
      doc.setTextColor(80, 80, 80);
      doc.text('Date: ' + dateStr + '  Time: ' + timeStr, pageWidth - 12, y, { align: 'right' });
      y += 4;
      const docDetails = [prescription.specialization, prescription.qualification].filter(Boolean).join(' | ');
      if (docDetails) { doc.text(docDetails, 12, y); y += 4; }
    }

    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(12, y, pageWidth - 12, y);
    y += 4;

    // --- PATIENT INFO: Name + Phone left, UHID + Age/Gender right ---
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'bold');
    doc.setFontSize(9);
    doc.text('Patient: ' + (prescription.patient_name || 'N/A'), 12, y);
    // Right side: UHID
    if (prescription.uhid) {
      doc.text('UHID: ' + prescription.uhid, pageWidth - 12, y, { align: 'right' });
    }
    y += 4;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(8);
    const patientDetails = [];
    if (prescription.patient_phone) patientDetails.push('Ph: ' + prescription.patient_phone);
    const ageGender = [prescription.age_years ? prescription.age_years + 'Y' : '', prescription.gender || ''].filter(Boolean).join('/');
    if (ageGender) patientDetails.push(ageGender);
    if (patientDetails.length > 0) doc.text(patientDetails.join('  |  '), 12, y);
    y += 3;

    doc.line(12, y, pageWidth - 12, y);
    y += 4;

    // --- SYMPTOMS (Chief Complaint) - single line ---
    if (prescription.chief_complaint) {
      doc.setFont(undefined, 'bold');
      doc.setFontSize(9);
      doc.text('Symptoms:', 12, y);
      const symLabelW = doc.getTextWidth('Symptoms:') + 2;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
      // Keep on single line, truncate if needed
      const maxSymWidth = pageWidth - 24 - symLabelW;
      let symStr = prescription.chief_complaint;
      while (doc.getTextWidth(symStr) > maxSymWidth && symStr.length > 10) {
        symStr = symStr.substring(0, symStr.length - 4) + '...';
      }
      doc.text(symStr, 12 + symLabelW, y);
      y += 5;
    }

    // --- DIAGNOSIS - single line ---
    if (prescription.diagnosis) {
      doc.setFont(undefined, 'bold');
      doc.setFontSize(9);
      doc.text('Diagnosis:', 12, y);
      const dxLabelW = doc.getTextWidth('Diagnosis:') + 2;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
      const maxDxWidth = pageWidth - 24 - dxLabelW;
      let dxStr = prescription.diagnosis;
      while (doc.getTextWidth(dxStr) > maxDxWidth && dxStr.length > 10) {
        dxStr = dxStr.substring(0, dxStr.length - 4) + '...';
      }
      doc.text(dxStr, 12 + dxLabelW, y);
      y += 5;
    }

    // --- Rx MEDICATIONS TABLE ---
    y += 3;
    doc.setFont(undefined, 'bold');
    doc.setFontSize(11);
    doc.setTextColor(0, 51, 102);
    doc.text('Rx', 12, y);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.text('Medications:', 22, y);
    y += 2;

    const medHeaders = ['Sr.', 'Medicine', 'Frequency', 'Timing', 'Duration', 'Qty', 'Instructions'];
    const medData = items.map((item, idx) => {
      let instructions = item.instructions || '-';
      // Build tapering text for instructions column
      if (item.is_tapering && item.tapering_schedule && item.tapering_schedule.length > 0) {
        const taperText = item.tapering_schedule.map((s, i) => {
          const prefix = i === 0 ? '' : 'Then ';
          return `${prefix}${s.dose} ${s.frequency} for ${s.duration_days} day${s.duration_days > 1 ? 's' : ''}`;
        }).join(', ');
        instructions = 'TAPERING: ' + taperText;
      }
      // Always convert timing and instructions to English for PDF (jsPDF can't render Devanagari/Hindi/Marathi)
      const timing = timingToEnglish(item.timing);
      if (instructions !== '-' && instructions.indexOf('TAPERING') === -1) {
        instructions = instructionToEnglish(instructions);
      }
      return [
        String(idx + 1),
        item.medicine_name || '-',
        item.is_tapering ? 'Tapering' : (item.frequency || '-'),
        timing,
        item.is_tapering ? '-' : (item.duration || '-'),
        item.quantity ? String(item.quantity) : '-',
        instructions
      ];
    });

    if (typeof doc.autoTable === 'function') {
      doc.autoTable({
        head: [medHeaders],
        body: medData.length > 0 ? medData : [['1', 'No medications', '-', '-', '-', '-', '-']],
        startY: y,
        margin: { left: 12, right: 12 },
        theme: 'striped',
        headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold', cellPadding: 2 },
        bodyStyles: { fontSize: 8, cellPadding: 2, overflow: 'linebreak' },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 45 },
          2: { cellWidth: 22 },
          3: { cellWidth: 25 },
          4: { cellWidth: 22 },
          5: { cellWidth: 12, halign: 'center' },
          6: { cellWidth: 'auto' }
        }
      });
      y = doc.lastAutoTable.finalY + 4;
    } else {
      medData.forEach((row) => {
        doc.setFont(undefined, 'normal');
        doc.setFontSize(8);
        doc.text(row[0] + '. ' + row[1] + ' | ' + row[2] + ' | ' + row[3] + ' | ' + row[4], 12, y);
        y += 5;
      });
    }

    // --- ADVICE ---
    if (prescription.advice) {
      y += 3;
      doc.setFont(undefined, 'bold');
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text('Advice:', 12, y);
      const advLabelW = doc.getTextWidth('Advice:') + 2;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
      // Strip "Investigations:..." from advice text if lab_advice exists separately to avoid duplication
      let adviceText = prescription.advice;
      if (prescription.lab_advice) {
        adviceText = adviceText.replace(/\n?Investigations?:.*$/gim, '').trim();
      }
      if (adviceText) {
        const splitAdvice = doc.splitTextToSize(adviceText, pageWidth - 14 - advLabelW);
        doc.text(splitAdvice, 12 + advLabelW, y);
        y += splitAdvice.length * 4;
      }
    }

    // --- LAB ADVICE / INVESTIGATIONS ---
    // Also include patient_notes that start with "Investigations:" here
    const notesIsInvestigation = prescription.patient_notes && /^investigations?:/i.test(prescription.patient_notes.trim());
    const investigationExtra = notesIsInvestigation ? prescription.patient_notes.replace(/^investigations?:\s*/i, '').trim() : '';
    if (prescription.lab_advice || investigationExtra) {
      y += 2;
      doc.setFont(undefined, 'bold');
      doc.setFontSize(9);
      doc.text('Investigations:', 12, y);
      const labLabelW = doc.getTextWidth('Investigations:') + 2;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
      let combinedInv = '';
      if (prescription.lab_advice) {
        combinedInv += prescription.lab_advice.replace(/^Investigations?:\s*/i, '').trim();
      }
      if (investigationExtra) {
        combinedInv += (combinedInv ? '\n' : '') + investigationExtra;
      }
      const splitLab = doc.splitTextToSize(combinedInv, pageWidth - 14 - labLabelW);
      doc.text(splitLab, 12 + labLabelW, y);
      y += splitLab.length * 4;
    }

    // --- LAB REMARKS ---
    if (prescription.lab_remarks) {
      y += 2;
      doc.setFont(undefined, 'bold');
      doc.setFontSize(9);
      doc.text('Lab Remarks:', 12, y);
      const labRLabelW = doc.getTextWidth('Lab Remarks:') + 2;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
      const splitLabR = doc.splitTextToSize(prescription.lab_remarks, pageWidth - 14 - labRLabelW);
      doc.text(splitLabR, 12 + labRLabelW, y);
      y += splitLabR.length * 4;
    }

    // --- PATIENT NOTES --- (only if it does NOT start with "Investigations:")
    if (prescription.patient_notes && !notesIsInvestigation) {
      y += 2;
      doc.setFont(undefined, 'bold');
      doc.setFontSize(9);
      doc.text('Notes:', 12, y);
      const notesLabelW = doc.getTextWidth('Notes:') + 2;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);
      const splitNotes = doc.splitTextToSize(prescription.patient_notes, pageWidth - 14 - notesLabelW);
      doc.text(splitNotes, 12 + notesLabelW, y);
      y += splitNotes.length * 4;
    }

    // --- DOCTOR SIGNATURE ---
    y = Math.max(y + 15, pageHeight - 45);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.line(pageWidth - 65, y, pageWidth - 12, y);
    y += 4;
    doc.text('Dr. ' + (prescription.doctor_name || ''), pageWidth - 12, y, { align: 'right' });
    if (prescription.specialization) {
      y += 4;
      doc.setFontSize(7);
      doc.text(prescription.specialization, pageWidth - 12, y, { align: 'right' });
    }
    if (prescription.qualification) {
      y += 3;
      doc.setFontSize(7);
      doc.text(prescription.qualification, pageWidth - 12, y, { align: 'right' });
    }

    // --- FOOTER: only when withLetterhead ---
    if (withLetterhead) {
      if (footerImg) {
        try {
          const imgData = footerImg.startsWith('data:') ? footerImg : 'data:image/png;base64,' + footerImg;
          doc.addImage(imgData, 'PNG', 0, pageHeight - 25, pageWidth, 25);
        } catch (e) { console.error('Footer image error:', e.message); }
      } else {
        const footerY = pageHeight - 18;
        doc.setDrawColor(200, 200, 200);
        doc.setLineWidth(0.3);
        doc.line(10, footerY, pageWidth - 10, footerY);
        doc.setFont(undefined, 'bold');
        doc.setFontSize(7);
        doc.setTextColor(60, 60, 60);
        if (prescription.clinic_address) {
          doc.text(prescription.clinic_address, pageWidth / 2, footerY + 4, { align: 'center' });
        }
        doc.setFont(undefined, 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(80, 80, 80);
        const contactParts = [];
        if (prescription.clinic_phone) contactParts.push('Phone: ' + prescription.clinic_phone);
        contactParts.push('This is a computer-generated prescription');
        doc.text(contactParts.join('  |  '), pageWidth / 2, footerY + 8, { align: 'center' });
      }
    }

    // Send PDF
    const pdfData = doc.output('arraybuffer');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="prescription_${prescriptionId}.pdf"`);
    res.send(Buffer.from(pdfData));

  } catch (error) {
    console.error('Error generating prescription PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF', details: error.message });
  }
};

// =====================================================
// BILLING/INVOICE PDF
// =====================================================

exports.generateBillingPDF = async (req, res) => {
  try {
    const { billId } = req.params;
    // with_letterhead=1 means include clinic header/footer; default = no letterhead
    const withLetterhead = req.query.with_letterhead === '1';
    const db = getDb();

    // Fetch bill data with doctor info
    const [bills] = await db.execute(`
      SELECT b.*,
        pa.name as patient_name, pa.patient_id as patient_uhid,
        pa.phone as patient_phone, pa.email as patient_email,
        pa.gender as patient_gender, pa.age_years as patient_age,
        u.name as doctor_name, d.specialization as doctor_specialization,
        c.name as clinic_name, c.address as clinic_address,
        c.city as clinic_city, c.phone as clinic_phone
      FROM bills b
      LEFT JOIN patients pa ON b.patient_id = pa.id
      LEFT JOIN doctors d ON b.doctor_id = d.id
      LEFT JOIN users u ON d.user_id = u.id
      LEFT JOIN clinics c ON b.clinic_id = c.id
      WHERE b.id = ?
    `, [billId]);

    if (bills.length === 0) {
      return res.status(404).json({ error: 'Bill not found' });
    }

    const bill = bills[0];

    // Fetch bill items
    const [items] = await db.execute(
      'SELECT service_name, quantity, unit_price, discount_amount, total_price FROM bill_items WHERE bill_id = ? ORDER BY sort_order, id',
      [billId]
    );

    // Fallback if no items exist (older bills)
    const displayItems = items.length > 0 ? items : [{
      service_name: 'Consultation', quantity: 1,
      unit_price: parseFloat(bill.total_amount) || 0,
      discount_amount: 0, total_price: parseFloat(bill.total_amount) || 0
    }];

    const doc = new jsPDF('p', 'mm', 'A4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let y = 15;

    // --- HEADER: only when withLetterhead ---
    if (withLetterhead) {
      doc.setFontSize(18);
      doc.setTextColor(0, 51, 102);
      doc.setFont(undefined, 'bold');
      doc.text(bill.clinic_name || 'Hospital', pageWidth / 2, y, { align: 'center' });
      y += 7;
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.setFont(undefined, 'normal');
      const clinicAddr = [bill.clinic_address, bill.clinic_city].filter(Boolean).join(', ');
      if (clinicAddr) { doc.text(clinicAddr, pageWidth / 2, y, { align: 'center' }); y += 5; }
      if (bill.clinic_phone) { doc.text('Phone: ' + bill.clinic_phone, pageWidth / 2, y, { align: 'center' }); y += 5; }
      doc.setDrawColor(0, 51, 102);
      doc.setLineWidth(0.5);
      doc.line(15, y, pageWidth - 15, y);
    }

    // --- INVOICE TITLE ---
    y += 10;
    doc.setFontSize(14);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'bold');
    doc.text('INVOICE / BILL', pageWidth / 2, y, { align: 'center' });

    y += 10;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text('Bill #: ' + (bill.bill_number || bill.id), 15, y);
    doc.text('Date: ' + (bill.bill_date ? new Date(bill.bill_date).toLocaleDateString('en-IN') : 'N/A'), pageWidth - 15, y, { align: 'right' });

    // --- PATIENT INFO ---
    y += 8;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.line(15, y, pageWidth - 15, y);
    y += 7;
    doc.setFont(undefined, 'bold');
    doc.text('Bill To:', 15, y);
    y += 6;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.text(bill.patient_name || 'N/A', 15, y);
    if (bill.patient_uhid) doc.text('UHID: ' + bill.patient_uhid, 110, y);
    y += 5;
    const ageGender = [bill.patient_age ? bill.patient_age + ' yrs' : '', bill.patient_gender || ''].filter(Boolean).join(' / ');
    if (ageGender) doc.text(ageGender, 15, y);
    if (bill.patient_phone) doc.text('Phone: ' + bill.patient_phone, 110, y);
    y += 5;
    if (bill.patient_email) doc.text('Email: ' + bill.patient_email, 15, y);
    if (bill.doctor_name) {
      y += 5;
      doc.text('Doctor: Dr. ' + bill.doctor_name + (bill.doctor_specialization ? ' (' + bill.doctor_specialization + ')' : ''), 15, y);
    }

    // --- ITEMS TABLE ---
    y += 8;
    doc.setDrawColor(200, 200, 200);
    doc.line(15, y, pageWidth - 15, y);
    y += 3;

    const tableHeaders = ['#', 'Service', 'Qty', 'Rate (Rs.)', 'Disc.', 'Amount (Rs.)'];
    const tableData = displayItems.map((item, idx) => [
      String(idx + 1),
      item.service_name || 'Service',
      String(parseFloat(item.quantity) || 1),
      (parseFloat(item.unit_price) || 0).toFixed(2),
      (parseFloat(item.discount_amount) || 0).toFixed(2),
      (parseFloat(item.total_price) || 0).toFixed(2)
    ]);

    if (typeof doc.autoTable === 'function') {
      doc.autoTable({
        head: [tableHeaders],
        body: tableData,
        startY: y,
        margin: { left: 15, right: 15 },
        theme: 'striped',
        headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold', cellPadding: 3 },
        bodyStyles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          0: { cellWidth: 10, halign: 'center' },
          1: { cellWidth: 65 },
          2: { cellWidth: 15, halign: 'center' },
          3: { cellWidth: 28, halign: 'right' },
          4: { cellWidth: 22, halign: 'right' },
          5: { cellWidth: 30, halign: 'right' }
        }
      });
      y = doc.lastAutoTable.finalY + 8;
    } else {
      tableData.forEach((row) => {
        doc.text(row[0] + '. ' + row[1] + '  x' + row[2] + '  Rs.' + row[3] + '  = Rs.' + row[5], 15, y);
        y += 6;
      });
    }

    // --- TOTALS ---
    const totalAmt = parseFloat(bill.total_amount) || 0;
    const subtotal = parseFloat(bill.subtotal) || totalAmt;
    const discountAmt = parseFloat(bill.discount_amount) || 0;
    const taxAmt = parseFloat(bill.tax_amount) || 0;
    const rightCol = pageWidth - 15;
    const labelX = pageWidth - 75;

    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(0, 0, 0);

    if (subtotal !== totalAmt || discountAmt > 0 || taxAmt > 0) {
      doc.text('Sub Total:', labelX, y);
      doc.text('Rs.' + subtotal.toFixed(2), rightCol, y, { align: 'right' });
      y += 6;
    }
    if (discountAmt > 0) {
      doc.text('Discount:', labelX, y);
      doc.text('-Rs.' + discountAmt.toFixed(2), rightCol, y, { align: 'right' });
      y += 6;
    }
    if (taxAmt > 0) {
      doc.text('Tax:', labelX, y);
      doc.text('Rs.' + taxAmt.toFixed(2), rightCol, y, { align: 'right' });
      y += 6;
    }

    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(labelX, y - 2, rightCol, y - 2);
    y += 3;
    doc.setFont(undefined, 'bold');
    doc.setFontSize(12);
    doc.text('Net Amount:', labelX, y);
    doc.text('Rs.' + totalAmt.toFixed(2), rightCol, y, { align: 'right' });

    // Payment info
    y += 10;
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(80, 80, 80);
    doc.text('Payment: ' + (bill.payment_method || 'cash').replace('+', ' + ').toUpperCase(), 15, y);
    const paymentStatus = bill.payment_status || 'pending';
    doc.setTextColor(paymentStatus === 'paid' ? 0 : 220, paymentStatus === 'paid' ? 128 : 50, paymentStatus === 'paid' ? 0 : 50);
    doc.setFont(undefined, 'bold');
    doc.text('Status: ' + paymentStatus.toUpperCase(), rightCol, y, { align: 'right' });

    // Notes
    if (bill.notes) {
      y += 10;
      doc.setTextColor(0, 0, 0);
      doc.setFont(undefined, 'bold');
      doc.setFontSize(9);
      doc.text('Notes:', 15, y);
      y += 5;
      doc.setFont(undefined, 'normal');
      const splitNotes = doc.splitTextToSize(bill.notes, pageWidth - 30);
      doc.text(splitNotes, 15, y);
    }

    // Footer: only clinic contact info when withLetterhead; always show generated notice
    if (withLetterhead) {
      doc.setFont(undefined, 'italic');
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      doc.text('This is a computer-generated invoice.', pageWidth / 2, pageHeight - 10, { align: 'center' });
    }

    const pdfData = doc.output('arraybuffer');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="invoice_' + billId + '.pdf"');
    res.send(Buffer.from(pdfData));

  } catch (error) {
    console.error('Error generating billing PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
};

// =====================================================
// MEDICAL CERTIFICATE PDF
// =====================================================

exports.generateCertificatePDF = async (req, res) => {
  try {
    const { certificateId } = req.params;

    const db = getDb();

    // Fetch certificate data
    const [certificates] = await db.execute(`
      SELECT
        c.id,
        c.patient_id,
        c.certificate_type,
        c.issue_date,
        c.valid_from,
        c.valid_to,
        c.content,
        c.remarks,
        pa.name as patient_name,
        pa.phone as patient_phone,
        u.name as doctor_name,
        d.specialization,
        cl.name as clinic_name,
        cl.address as clinic_address
      FROM medical_certificates c
      JOIN patients pa ON c.patient_id = pa.id
      JOIN doctors d ON c.doctor_id = d.id
      LEFT JOIN users u ON d.user_id = u.id
      JOIN clinics cl ON c.clinic_id = cl.id
      WHERE c.id = ?
    `, [certificateId]);

    if (certificates.length === 0) {
      return res.status(404).json({ error: 'Certificate not found' });
    }

    const certificate = certificates[0];

    // Generate PDF
    const doc = new jsPDF('p', 'mm', 'A4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 30;

    // Header
    doc.setFontSize(14);
    doc.setTextColor(0, 51, 102);
    doc.text(certificate.clinic_name, pageWidth / 2, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text(certificate.clinic_address, pageWidth / 2, 22, { align: 'center' });

    // Certificate Title
    yPosition += 10;
    doc.setFontSize(16);
    doc.setTextColor(0, 51, 102);
    doc.setFont(undefined, 'bold');
    doc.text('MEDICAL CERTIFICATE', pageWidth / 2, yPosition, { align: 'center' });

    // Certificate Type
    yPosition += 12;
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text(`Type: ${certificate.certificate_type}`, pageWidth / 2, yPosition, { align: 'center' });

    // Content/Body
    yPosition += 16;
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    const splitContent = doc.splitTextToSize(certificate.content, pageWidth - 40);
    doc.text(splitContent, 20, yPosition);

    // Patient Details
    yPosition = yPosition + (splitContent.length * 5) + 12;
    doc.setFont(undefined, 'bold');
    doc.setFontSize(10);
    doc.text('Patient Details:', 20, yPosition);

    yPosition += 7;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.text(`Name: ${certificate.patient_name}`, 25, yPosition);
    doc.text(`Phone: ${certificate.patient_phone}`, 25, yPosition + 6);

    // Doctor Signature Area
    yPosition = pageHeight - 50;
    doc.setFont(undefined, 'bold');
    doc.setFontSize(10);
    doc.text('Authorized By:', 20, yPosition);
    
    yPosition += 8;
    doc.setFont(undefined, 'normal');
    doc.setFontSize(9);
    doc.text(`Dr. ${certificate.doctor_name}`, 20, yPosition);
    doc.text(`(${certificate.specialization})`, 20, yPosition + 5);

    // Signature line
    yPosition += 15;
    doc.line(20, yPosition, 60, yPosition);
    doc.setFontSize(8);
    doc.text('Signature', 20, yPosition + 3);

    // Date
    doc.text(`Date: ${new Date(certificate.issue_date).toLocaleDateString()}`, pageWidth - 60, yPosition);

    // Validity
    yPosition = pageHeight - 20;
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);
    doc.text(`Valid from: ${new Date(certificate.valid_from).toLocaleDateString()} to ${new Date(certificate.valid_to).toLocaleDateString()}`, 20, yPosition);

    // Send PDF
    const pdfData = doc.output('arraybuffer');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="certificate_${certificateId}.pdf"`);
    res.send(Buffer.from(pdfData));

  } catch (error) {
    console.error('Error generating certificate PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
};

// =====================================================
// REFERRAL PDF
// =====================================================

exports.generateReferralPDF = async (req, res) => {
  try {
    const { referralId } = req.params;

    const db = getDb();

    // Fetch referral data
    const [referrals] = await db.execute(`
      SELECT 
        r.id,
        r.patient_id,
        r.referred_by_doctor,
        r.referred_to_doctor,
        r.referral_date,
        r.reason,
        r.notes,
        r.urgency_level,
        pa.name as patient_name,
        pa.phone as patient_phone,
        pa.age,
        pa.gender,
        CONCAT(u1.first_name, ' ', u1.last_name) as from_doctor,
        CONCAT(u2.first_name, ' ', u2.last_name) as to_doctor,
        c1.name as from_clinic,
        c2.name as to_clinic
      FROM patient_referrals r
      JOIN patients pa ON r.patient_id = pa.id
      JOIN doctors d1 ON r.referred_by_doctor = d1.id
      LEFT JOIN users u1 ON d1.user_id = u1.id
      LEFT JOIN doctors d2 ON r.referred_to_doctor = d2.id
      LEFT JOIN users u2 ON d2.user_id = u2.id
      JOIN clinics c1 ON d1.clinic_id = c1.id
      LEFT JOIN clinics c2 ON d2.clinic_id = c2.id
      WHERE r.id = ?
    `, [referralId]);

    if (referrals.length === 0) {
      return res.status(404).json({ error: 'Referral not found' });
    }

    const referral = referrals[0];

    // Generate PDF
    const doc = new jsPDF('p', 'mm', 'A4');
    const pageWidth = doc.internal.pageSize.getWidth();
    let yPosition = 20;

    // Header
    doc.setFontSize(14);
    doc.setTextColor(0, 51, 102);
    doc.text(referral.from_clinic, pageWidth / 2, yPosition, { align: 'center' });
    doc.setFont(undefined, 'bold');

    // Referral Title
    yPosition += 15;
    doc.setFontSize(14);
    doc.text('REFERRAL LETTER', pageWidth / 2, yPosition, { align: 'center' });

    // Referral Date
    yPosition += 12;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Date: ${new Date(referral.referral_date).toLocaleDateString()}`, 15, yPosition);

    // Urgency
    const urgencyColor = referral.urgency_level === 'emergency' ? [255, 0, 0] : 
                        referral.urgency_level === 'urgent' ? [255, 165, 0] : [0, 128, 0];
    doc.setTextColor(...urgencyColor);
    doc.setFont(undefined, 'bold');
    doc.text(`Urgency: ${referral.urgency_level.toUpperCase()}`, pageWidth - 60, yPosition);

    // Patient Information
    yPosition += 12;
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'bold');
    doc.text('Patient Information:', 15, yPosition);

    yPosition += 6;
    doc.setFont(undefined, 'normal');
    doc.text(`Name: ${referral.patient_name}`, 20, yPosition);
    doc.text(`Age: ${referral.age} years | Gender: ${referral.gender}`, 20, yPosition + 6);
    doc.text(`Phone: ${referral.patient_phone}`, 20, yPosition + 12);

    // Referred From/To
    yPosition += 22;
    doc.setFont(undefined, 'bold');
    doc.text('Referred From:', 15, yPosition);
    yPosition += 5;
    doc.setFont(undefined, 'normal');
    doc.text(`Dr. ${referral.from_doctor}`, 20, yPosition);

    yPosition += 10;
    doc.setFont(undefined, 'bold');
    doc.text('Referred To:', 15, yPosition);
    yPosition += 5;
    doc.setFont(undefined, 'normal');
    if (referral.to_doctor) {
      doc.text(`Dr. ${referral.to_doctor}`, 20, yPosition);
      doc.text(`${referral.to_clinic}`, 20, yPosition + 6);
    } else {
      doc.text('To be determined by patient', 20, yPosition);
    }

    // Reason for Referral
    yPosition += 16;
    doc.setFont(undefined, 'bold');
    doc.text('Reason for Referral:', 15, yPosition);

    yPosition += 6;
    doc.setFont(undefined, 'normal');
    const splitReason = doc.splitTextToSize(referral.reason, pageWidth - 30);
    doc.text(splitReason, 20, yPosition);

    // Notes
    if (referral.notes) {
      yPosition += (splitReason.length * 5) + 6;
      doc.setFont(undefined, 'bold');
      doc.text('Additional Notes:', 15, yPosition);

      yPosition += 6;
      doc.setFont(undefined, 'normal');
      const splitNotes = doc.splitTextToSize(referral.notes, pageWidth - 30);
      doc.text(splitNotes, 20, yPosition);
    }

    // Signature Area
    yPosition = 240;
    doc.setFont(undefined, 'normal');
    doc.line(15, yPosition, 70, yPosition);
    doc.setFontSize(9);
    doc.text('Dr. Signature', 20, yPosition + 5);

    // Send PDF
    const pdfData = doc.output('arraybuffer');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="referral_${referralId}.pdf"`);
    res.send(Buffer.from(pdfData));

  } catch (error) {
    console.error('Error generating referral PDF:', error);
    res.status(500).json({ error: 'Failed to generate PDF' });
  }
};

// =====================================================
// LAB REPORT PDF
// =====================================================

exports.generateLabReportPDF = async (req, res) => {
  try {
    const { patientId } = req.params;
    const { report_group } = req.query;

    const db = getDb();

    // Fetch patient data with clinic info
    const [patients] = await db.execute(`
      SELECT
        p.id, p.name as patient_name, p.phone as patient_phone,
        p.email as patient_email, p.age_years, p.gender, p.patient_id as uhid,
        c.name as clinic_name, c.address as clinic_address, c.phone as clinic_phone,
        u.name as doctor_name, d.specialization, d.user_id as doctor_user_id
      FROM patients p
      LEFT JOIN doctors d ON d.clinic_id = p.clinic_id
      LEFT JOIN users u ON d.user_id = u.id
      LEFT JOIN clinics c ON p.clinic_id = c.id
      WHERE p.id = ?
      LIMIT 1
    `, [patientId]);

    if (patients.length === 0) {
      return res.status(404).json({ error: 'Patient not found' });
    }

    const patientData = patients[0];

    // Fetch header/footer images from pad_configurations
    let padConfig = null;
    if (patientData.doctor_user_id) {
      const [configs] = await db.execute(
        `SELECT header_image, footer_image FROM pad_configurations WHERE doctor_id = ? LIMIT 1`,
        [patientData.doctor_user_id]
      );
      if (configs.length > 0) padConfig = configs[0];
    }
    // Fallback: try receipt_templates default
    if (!padConfig || (!padConfig.header_image && !padConfig.footer_image)) {
      const [templates] = await db.execute(
        `SELECT header_image, footer_image FROM receipt_templates WHERE is_default = 1 LIMIT 1`
      );
      if (templates.length > 0 && (templates[0].header_image || templates[0].footer_image)) {
        padConfig = templates[0];
      }
    }

    // Fetch lab results
    let labQuery = `
      SELECT test_name as name, result_value as reading, result_unit as unit,
             result_date as date, report_group, reference_range, test_category
      FROM lab_investigations
      WHERE patient_id = ? AND status = 'completed'
    `;
    const labParams = [patientId];

    if (report_group) {
      labQuery += ` AND report_group = ?`;
      labParams.push(report_group);
    }

    labQuery += ` ORDER BY result_date DESC, report_group, id`;

    const [labs] = await db.execute(labQuery, labParams);

    if (labs.length === 0) {
      return res.status(404).json({ error: 'No lab results found' });
    }

    // Group by report_group
    const grouped = {};
    const ungrouped = [];
    labs.forEach(l => {
      if (l.report_group) {
        if (!grouped[l.report_group]) {
          grouped[l.report_group] = {
            category: l.test_category || l.report_group.split('-')[0],
            date: l.date,
            items: []
          };
        }
        grouped[l.report_group].items.push(l);
      } else {
        ungrouped.push(l);
      }
    });

    // Generate PDF
    const doc = new jsPDF('p', 'mm', 'A4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    let yPosition = 10;

    // Header - Use uploaded image if available, otherwise text header
    if (padConfig && padConfig.header_image) {
      try {
        const imgData = padConfig.header_image;
        const imgFormat = imgData.includes('image/png') ? 'PNG' : 'JPEG';
        doc.addImage(imgData, imgFormat, 5, 5, pageWidth - 10, 35);
        yPosition = 45;
      } catch (imgErr) {
        console.warn('Header image error, falling back to text:', imgErr.message);
        // Fallback to text header
        yPosition = 20;
        doc.setFontSize(16);
        doc.setTextColor(0, 51, 102);
        doc.text(patientData.clinic_name || 'Clinic', pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 8;
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text(`${patientData.clinic_address || ''}`, pageWidth / 2, yPosition, { align: 'center' });
        doc.text(`Phone: ${patientData.clinic_phone || 'N/A'}`, pageWidth / 2, yPosition + 5, { align: 'center' });
        yPosition += 15;
      }
    } else {
      yPosition = 20;
      doc.setFontSize(16);
      doc.setTextColor(0, 51, 102);
      doc.text(patientData.clinic_name || 'Clinic', pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 8;
      doc.setFontSize(10);
      doc.setTextColor(100, 100, 100);
      doc.text(`${patientData.clinic_address || ''}`, pageWidth / 2, yPosition, { align: 'center' });
      doc.text(`Phone: ${patientData.clinic_phone || 'N/A'}`, pageWidth / 2, yPosition + 5, { align: 'center' });
      yPosition += 15;
    }

    // Horizontal line after header
    doc.setDrawColor(0, 51, 102);
    doc.line(15, yPosition, pageWidth - 15, yPosition);

    // Report Title
    yPosition += 10;
    doc.setFontSize(14);
    doc.setTextColor(0, 51, 102);
    doc.setFont(undefined, 'bold');
    doc.text('LABORATORY REPORT', pageWidth / 2, yPosition, { align: 'center' });

    // Patient Info
    yPosition += 12;
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, 'normal');
    doc.text(`Patient: ${patientData.patient_name || 'N/A'}`, 15, yPosition);
    doc.text(`Date: ${labs[0].date ? new Date(labs[0].date).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN')}`, pageWidth - 60, yPosition);

    yPosition += 6;
    doc.text(`Age: ${patientData.age_years || 'N/A'} yrs | Gender: ${patientData.gender || 'N/A'}`, 15, yPosition);
    if (patientData.uhid) {
      doc.text(`UHID: ${patientData.uhid}`, pageWidth - 60, yPosition);
    }

    yPosition += 6;
    doc.text(`Phone: ${patientData.patient_phone || 'N/A'}`, 15, yPosition);

    yPosition += 4;
    doc.setDrawColor(200, 200, 200);
    doc.line(15, yPosition, pageWidth - 15, yPosition);

    // Render grouped lab results
    const groupKeys = Object.keys(grouped);
    for (const gk of groupKeys) {
      const group = grouped[gk];

      yPosition += 10;
      // Check if we need a new page
      if (yPosition > pageHeight - 40) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(11);
      doc.setTextColor(0, 51, 102);
      doc.setFont(undefined, 'bold');
      doc.text(group.category, 15, yPosition);

      yPosition += 2;

      const tableHeaders = ['Parameter', 'Result', 'Unit', 'Normal Range'];
      const tableData = group.items.map(item => [
        item.name,
        item.reading || '-',
        item.unit || '-',
        item.reference_range || '-'
      ]);

      if (typeof doc.autoTable === 'function') {
        doc.autoTable({
          head: [tableHeaders],
          body: tableData,
          startY: yPosition,
          margin: { left: 15, right: 15 },
          theme: 'grid',
          styles: {
            fontSize: 9,
            cellPadding: 3,
          },
          headStyles: {
            fillColor: [0, 51, 102],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
          },
          columnStyles: {
            0: { cellWidth: 55 },
            1: { cellWidth: 35 },
            2: { cellWidth: 35 },
            3: { cellWidth: 40 }
          }
        });
        yPosition = doc.lastAutoTable.finalY + 5;
      } else {
        yPosition += 6;
        tableData.forEach((row) => {
          doc.setFont(undefined, 'normal');
          doc.setFontSize(9);
          doc.setTextColor(0, 0, 0);
          doc.text(`${row[0]}: ${row[1]} ${row[2]} (${row[3]})`, 20, yPosition);
          yPosition += 5;
        });
      }
    }

    // Render ungrouped lab results
    if (ungrouped.length > 0) {
      yPosition += 10;
      if (yPosition > pageHeight - 40) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(11);
      doc.setTextColor(0, 51, 102);
      doc.setFont(undefined, 'bold');
      doc.text('Other Tests', 15, yPosition);

      yPosition += 2;

      const tableHeaders = ['Test Name', 'Result', 'Unit', 'Date'];
      const tableData = ungrouped.map(item => [
        item.name,
        item.reading || '-',
        item.unit || '-',
        item.date ? new Date(item.date).toLocaleDateString('en-IN') : '-'
      ]);

      if (typeof doc.autoTable === 'function') {
        doc.autoTable({
          head: [tableHeaders],
          body: tableData,
          startY: yPosition,
          margin: { left: 15, right: 15 },
          theme: 'grid',
          styles: { fontSize: 9, cellPadding: 3 },
          headStyles: {
            fillColor: [0, 51, 102],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
          },
        });
        yPosition = doc.lastAutoTable.finalY + 5;
      }
    }

    // Doctor info if available
    if (patientData.doctor_name) {
      yPosition += 10;
      if (yPosition > pageHeight - 30) {
        doc.addPage();
        yPosition = 20;
      }
      doc.setFont(undefined, 'normal');
      doc.setFontSize(9);
      doc.setTextColor(0, 0, 0);
      doc.text(`Doctor: Dr. ${patientData.doctor_name}`, 15, yPosition);
      if (patientData.specialization) {
        doc.text(`(${patientData.specialization})`, 15 + doc.getTextWidth(`Doctor: Dr. ${patientData.doctor_name}  `), yPosition);
      }
    }

    // Footer - Use uploaded image if available
    if (padConfig && padConfig.footer_image) {
      try {
        const imgData = padConfig.footer_image;
        const imgFormat = imgData.includes('image/png') ? 'PNG' : 'JPEG';
        doc.addImage(imgData, imgFormat, 5, pageHeight - 30, pageWidth - 10, 25);
      } catch (imgErr) {
        console.warn('Footer image error, falling back to text:', imgErr.message);
        doc.setFont(undefined, 'italic');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text('Generated by Patient Management System', pageWidth / 2, pageHeight - 10, { align: 'center' });
      }
    } else {
      doc.setFont(undefined, 'italic');
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text('Generated by Patient Management System', pageWidth / 2, pageHeight - 10, { align: 'center' });
    }

    // Send PDF
    const pdfData = doc.output('arraybuffer');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="lab_report_${patientId}.pdf"`);
    res.send(Buffer.from(pdfData));

  } catch (error) {
    console.error('Error generating lab report PDF:', error);
    res.status(500).json({ error: 'Failed to generate lab report PDF', details: error.message });
  }
};
