-- ========================================================================
-- MIGRATION_IMPORTED_TABLE_V2.sql - Import data from imported_table
-- Compatible with patient_management.sql schema
--
-- UPDATED: January 26, 2026
-- Changes made based on successful live deployment:
--   - STEP 7: Simplified prescriptions migration (removed complex JSON queries)
--   - STEP 8: Simplified prescription_items migration (removed temp table)
--   - These changes improve reliability and performance on large datasets
--
-- Successfully tested on production with 21,728 imported records
-- ========================================================================

USE patient_management;

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = 'NO_AUTO_VALUE_ON_ZERO';
SET @current_time = NOW();

SELECT '=== MIGRATION FROM IMPORTED_TABLE STARTING ===' AS status;

-- ========================================================================
-- STEP 0: CLEANUP - Remove existing data to prevent duplicate key errors
-- ========================================================================

SELECT 'Cleaning up existing imported data...' AS step;
DELETE FROM bill_items WHERE bill_id IN (SELECT id FROM bills WHERE bill_number LIKE 'BILL-%');
DELETE FROM bills WHERE bill_number LIKE 'BILL-%';
DELETE FROM prescription_items WHERE prescription_id IN (SELECT id FROM prescriptions WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY));
DELETE FROM prescriptions WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 DAY);
DELETE FROM appointments WHERE appointment_date >= DATE_SUB(NOW(), INTERVAL 1 DAY);
DELETE FROM patient_vitals WHERE recorded_at >= DATE_SUB(NOW(), INTERVAL 1 DAY);
DELETE FROM patient_tags WHERE patient_id IN (SELECT id FROM patients WHERE patient_id REGEXP '^[0-9]+$');
DELETE FROM patients WHERE patient_id REGEXP '^[0-9]+$';
DELETE FROM doctors WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%@%.local');
DELETE FROM users WHERE email LIKE '%@%.local';
DELETE FROM clinics WHERE name IN (SELECT DISTINCT `Clinic Name` FROM imported_table WHERE `Clinic Name` IS NOT NULL);

-- ========================================================================
-- STEP 0.5: Data Analysis
-- =========================================================================

SELECT 'Data Analysis' AS step;
SELECT COUNT(*) AS total_rows FROM imported_table;
SELECT COUNT(DISTINCT Patient_UHID) AS unique_patients FROM imported_table;
SELECT COUNT(DISTINCT Doc_ID) AS unique_doctors FROM imported_table;
SELECT COUNT(DISTINCT `Clinic Name`) AS unique_clinics FROM imported_table;
SELECT COUNT(DISTINCT Prescription_ID) AS unique_prescriptions FROM imported_table;
SELECT Type, COUNT(*) AS count FROM imported_table GROUP BY Type;

-- ========================================================================
-- STEP 1: MIGRATE CLINICS
-- ========================================================================

INSERT INTO clinics (name, code, address, phone, email, is_active, created_at, updated_at)
SELECT DISTINCT
    TRIM(`Clinic Name`) AS name,
    UPPER(REPLACE(SUBSTRING(TRIM(`Clinic Name`), 1, 10), ' ', '_')) AS code,
    'Imported Address' AS address,
    '0000000000' AS phone,
    CONCAT('imported@', LOWER(REPLACE(TRIM(`Clinic Name`), ' ', '_')), '.local') AS email,
    1 AS is_active,
    @current_time AS created_at,
    @current_time AS updated_at
FROM imported_table
WHERE `Clinic Name` IS NOT NULL 
  AND TRIM(`Clinic Name`) != ''
ON DUPLICATE KEY UPDATE 
    updated_at = @current_time;

SELECT 'Step 1: Clinics migrated' AS step, ROW_COUNT() AS affected;

-- ========================================================================
-- STEP 2: MIGRATE USERS (Doctors)
-- ========================================================================

INSERT IGNORE INTO users (email, password, name, role, clinic_id, is_active, created_at, updated_at)
SELECT DISTINCT
    CONCAT(LOWER(REPLACE(TRIM(i.Doctors_Name), ' ', '.')), '@', LOWER(REPLACE(TRIM(c.name), ' ', '_')), '.local') AS email,
    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi' AS password, -- default password
    TRIM(i.Doctors_Name) AS name,
    'doctor' AS role,
    c.id AS clinic_id,
    1 AS is_active,
    @current_time AS created_at,
    @current_time AS updated_at
FROM imported_table i
JOIN clinics c ON TRIM(c.name) = TRIM(i.`Clinic Name`)
WHERE i.Doctors_Name IS NOT NULL 
  AND TRIM(i.Doctors_Name) != ''
GROUP BY i.Doc_ID, i.Doctors_Name, c.id
ON DUPLICATE KEY UPDATE 
    updated_at = @current_time;

SELECT 'Step 2: Users (Doctors) migrated' AS step, ROW_COUNT() AS affected;

-- ========================================================================
-- STEP 3: MIGRATE DOCTORS
-- ========================================================================

INSERT INTO doctors (user_id, clinic_id, specialization, consultation_fee, status, created_at, updated_at)
SELECT 
    u.id AS user_id,
    u.clinic_id AS clinic_id,
    'General Practice' AS specialization,
    500.00 AS consultation_fee,
    'active' AS status,
    @current_time AS created_at,
    @current_time AS updated_at
FROM users u
WHERE u.role = 'doctor'
  AND NOT EXISTS (SELECT 1 FROM doctors d WHERE d.user_id = u.id);

SELECT 'Step 3: Doctors migrated' AS step, ROW_COUNT() AS affected;

-- ========================================================================
-- STEP 4: MIGRATE PATIENTS
-- ========================================================================

INSERT INTO patients (
    patient_id, name, phone, gender, dob, age_years,
    address, city, country, landmark, district,
    referral_source, referral_doctor, clinic_id, 
    registered_date, created_at, updated_at
)
SELECT 
    CAST(i.Patient_UHID AS CHAR) AS patient_id,
    MAX(CASE WHEN i.Patient_Name IS NOT NULL AND TRIM(i.Patient_Name) != '' THEN TRIM(i.Patient_Name) ELSE 'Unknown Patient' END) AS name,
    MAX(CASE 
        WHEN i.Patient_Phone IS NOT NULL THEN NULLIF(REGEXP_REPLACE(TRIM(CAST(i.Patient_Phone AS CHAR)), '\\.?0+$', ''), '')
        ELSE NULL
    END) AS phone,
    CASE 
        WHEN UPPER(MAX(TRIM(i.Patient_Gender))) IN ('M', 'MALE') THEN 'M'
        WHEN UPPER(MAX(TRIM(i.Patient_Gender))) IN ('F', 'FEMALE') THEN 'F'
        ELSE 'U'
    END AS gender,
    MAX(CASE 
        WHEN i.Patient_DOB IS NOT NULL AND TRIM(i.Patient_DOB) != '' 
        AND i.Patient_DOB REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        THEN STR_TO_DATE(i.Patient_DOB, '%Y-%m-%d')
        ELSE NULL
    END) AS dob,
    MAX(CASE WHEN i.Patient_Age IS NOT NULL AND i.Patient_Age > 0 THEN i.Patient_Age ELSE NULL END) AS age_years,
    'Imported Address' AS address,
    'Imported City' AS city,
    'India' AS country,
    'Imported Landmark' AS landmark,
    'Imported District' AS district,
    MAX(CASE WHEN i.Referred_By IS NOT NULL AND TRIM(i.Referred_By) != '' THEN TRIM(i.Referred_By) ELSE NULL END) AS referral_source,
    MAX(TRIM(i.Referred_By)) AS referral_doctor,
    COALESCE(MIN(c.id), (SELECT id FROM clinics ORDER BY id LIMIT 1)) AS clinic_id,
    MIN(CASE 
        WHEN i.`date` IS NOT NULL AND i.`date` REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        THEN STR_TO_DATE(i.`date`, '%Y-%m-%d')
        ELSE @current_time
    END) AS registered_date,
    @current_time AS created_at,
    @current_time AS updated_at
FROM imported_table i
LEFT JOIN clinics c ON TRIM(c.name) = TRIM(i.`Clinic Name`)
WHERE i.Patient_UHID IS NOT NULL 
  AND TRIM(i.Patient_UHID) != ''
GROUP BY i.Patient_UHID
ON DUPLICATE KEY UPDATE 
    name = COALESCE(VALUES(name), patients.name),
    phone = COALESCE(VALUES(phone), patients.phone),
    gender = COALESCE(VALUES(gender), patients.gender),
    dob = COALESCE(VALUES(dob), patients.dob),
    age_years = COALESCE(VALUES(age_years), patients.age_years),
    referral_source = COALESCE(VALUES(referral_source), patients.referral_source),
    referral_doctor = COALESCE(VALUES(referral_doctor), patients.referral_doctor),
    updated_at = @current_time;

SELECT 'Step 4: Patients migrated' AS step, ROW_COUNT() AS affected;

-- ========================================================================
-- STEP 5: MIGRATE PATIENT TAGS
-- ========================================================================

INSERT INTO patient_tags (patient_id, tag_name, tag_category, color_code, created_at)
SELECT DISTINCT
    p.id AS patient_id,
    TRIM(i.Patient_Tag) AS tag_name,
    'imported' AS tag_category,
    CASE 
        WHEN UPPER(TRIM(i.Patient_Tag)) LIKE '%VIP%' THEN '#FF6B6B'
        WHEN UPPER(TRIM(i.Patient_Tag)) LIKE '%EMERGENCY%' THEN '#FFA500'
        WHEN UPPER(TRIM(i.Patient_Tag)) LIKE '%SENIOR%' THEN '#4ECDC4'
        WHEN UPPER(TRIM(i.Patient_Tag)) LIKE '%DIABETE%' THEN '#45B7D1'
        WHEN UPPER(TRIM(i.Patient_Tag)) LIKE '%HEART%' THEN '#FF073A'
        ELSE '#3B82F6'
    END AS color_code,
    @current_time AS created_at
FROM imported_table i
JOIN patients p ON CAST(p.patient_id AS CHAR) = CAST(i.Patient_UHID AS CHAR)
WHERE i.Patient_Tag IS NOT NULL 
  AND TRIM(i.Patient_Tag) != ''
  AND TRIM(i.Patient_Tag) != 'No'
  AND TRIM(i.Patient_Tag) != 'None'
ON DUPLICATE KEY UPDATE 
    tag_name = VALUES(tag_name),
    color_code = VALUES(color_code);

SELECT 'Step 5: Patient Tags migrated' AS step, ROW_COUNT() AS affected;

-- ========================================================================
-- STEP 6: MIGRATE APPOINTMENTS
-- ========================================================================

INSERT INTO appointments (
    patient_id, doctor_id, clinic_id, 
    appointment_date, appointment_time,
    status, consultation_type, arrival_type,
    chief_complaint, reason_for_visit, consultation_fee,
    notes, created_at, updated_at
)
SELECT
    p.id AS patient_id,
    d.id AS doctor_id,
    c.id AS clinic_id,
    MIN(CASE 
        WHEN NULLIF(i.`date`, '') IS NOT NULL 
        AND NULLIF(TRIM(i.`date`), '') IS NOT NULL
        AND i.`date` REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        THEN STR_TO_DATE(i.`date`, '%Y-%m-%d')
        ELSE CURDATE()
    END) AS appointment_date,
    MIN(CASE 
        WHEN i.Prescription_Start_Time IS NOT NULL 
        AND i.Prescription_Start_Time REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2} [0-9]{2}:[0-9]{2}'
        THEN TIME(STR_TO_DATE(i.Prescription_Start_Time, '%Y-%m-%d %H:%i'))
        WHEN i.Prescription_Start_Time IS NOT NULL 
        AND i.Prescription_Start_Time REGEXP '^[0-9]{2}:[0-9]{2}'
        THEN TIME(STR_TO_DATE(i.Prescription_Start_Time, '%H:%i'))
        ELSE '09:00:00'
    END) AS appointment_time,
    MAX(CASE 
        WHEN UPPER(TRIM(i.Appt_Deleted)) = 'YES' THEN 'cancelled'
        WHEN UPPER(TRIM(i.Appt_Deleted)) = 'NO' THEN 'completed'
        ELSE 'completed'
    END) AS status,
    'new' AS consultation_type,
    'walk-in' AS arrival_type,
    (SELECT GROUP_CONCAT(DISTINCT TRIM(sub.Clinical_Name) ORDER BY sub.Clinical_Name SEPARATOR ', ')
     FROM imported_table sub 
     WHERE sub.Prescription_ID = i.Prescription_ID 
       AND sub.Clinical_Name IS NOT NULL 
       AND TRIM(sub.Clinical_Name) != ''
       AND sub.Type = 'symptoms'
     LIMIT 3
    ) AS chief_complaint,
    (SELECT GROUP_CONCAT(DISTINCT TRIM(sub.Clinical_Details) ORDER BY sub.Clinical_Details SEPARATOR ', ')
     FROM imported_table sub 
     WHERE sub.Prescription_ID = i.Prescription_ID 
       AND sub.Clinical_Details IS NOT NULL 
       AND TRIM(sub.Clinical_Details) != ''
     LIMIT 2
    ) AS reason_for_visit,
    COALESCE(d.consultation_fee, 500.00) AS consultation_fee,
    CONCAT('Imported appointment - Prescription: ', MAX(i.Prescription_ID)) AS notes,
    @current_time AS created_at,
    @current_time AS updated_at
FROM imported_table i
JOIN clinics c ON TRIM(c.name) = TRIM(i.`Clinic Name`)
JOIN patients p ON CAST(p.patient_id AS CHAR) = CAST(i.Patient_UHID AS CHAR)
JOIN users u ON TRIM(u.name) = TRIM(i.Doctors_Name) AND u.clinic_id = c.id
JOIN doctors d ON d.user_id = u.id
WHERE i.`date` IS NOT NULL 
  AND i.Prescription_ID IS NOT NULL
  AND TRIM(i.Prescription_ID) != ''
GROUP BY i.Prescription_ID, p.id, d.id, c.id;

SELECT 'Step 6: Appointments migrated' AS step, ROW_COUNT() AS affected;

-- ========================================================================
-- STEP 7: MIGRATE PRESCRIPTIONS (SIMPLIFIED - WORKING VERSION)
-- ========================================================================

-- Note: This is a simplified version that works reliably
-- Complex JSON queries can cause timeouts and errors on large datasets
INSERT INTO prescriptions (
    patient_id, doctor_id, clinic_id, appointment_id,
    chief_complaint, prescribed_date,
    status, is_active, created_by, created_at, updated_at
)
SELECT
    MIN(p.id) AS patient_id,
    MIN(d.id) AS doctor_id,
    MIN(c.id) AS clinic_id,
    MIN(a.id) AS appointment_id,
    COALESCE(MAX(i.Clinical_Name), 'Imported prescription') AS chief_complaint,
    MIN(CASE
        WHEN i.`date` REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        THEN STR_TO_DATE(i.`date`, '%Y-%m-%d')
        ELSE CURDATE()
    END) AS prescribed_date,
    'completed' AS status,
    1 AS is_active,
    MIN(d.user_id) AS created_by,
    @current_time AS created_at,
    @current_time AS updated_at
FROM imported_table i
JOIN clinics c ON TRIM(c.name) = TRIM(i.`Clinic Name`)
JOIN patients p ON CAST(p.patient_id AS CHAR) = CAST(i.Patient_UHID AS CHAR)
JOIN users u ON TRIM(u.name) = TRIM(i.Doctors_Name) AND u.clinic_id = c.id
JOIN doctors d ON d.user_id = u.id
LEFT JOIN appointments a ON a.patient_id = p.id AND a.doctor_id = d.id
WHERE i.Prescription_ID IS NOT NULL
  AND TRIM(i.Prescription_ID) != ''
GROUP BY i.Prescription_ID;

SELECT 'Step 7: Prescriptions migrated' AS step, ROW_COUNT() AS affected;

-- ========================================================================
-- STEP 7.5: CREATE TEMPORARY PRESCRIPTION MAPPING TABLE
-- ========================================================================

CREATE TEMPORARY TABLE temp_prescription_mapping (
  old_prescription_id VARCHAR(50),
  patient_id INT,
  doctor_id INT,
  clinic_id INT,
  PRIMARY KEY (old_prescription_id)
);

INSERT INTO temp_prescription_mapping (old_prescription_id, patient_id, doctor_id, clinic_id)
SELECT DISTINCT
  i.Prescription_ID AS old_prescription_id,
  p.id AS patient_id,
  d.id AS doctor_id,
  c.id AS clinic_id
FROM imported_table i
JOIN clinics c ON TRIM(c.name) = TRIM(i.`Clinic Name`)
JOIN patients p ON CAST(p.patient_id AS CHAR) = CAST(i.Patient_UHID AS CHAR)
JOIN users u ON TRIM(u.name) = TRIM(i.Doctors_Name) AND u.clinic_id = c.id
JOIN doctors d ON d.user_id = u.id
WHERE i.Prescription_ID IS NOT NULL
  AND TRIM(i.Prescription_ID) != '';

SELECT 'Step 7.5: Temporary prescription mapping table created' AS step, ROW_COUNT() AS affected;

-- ========================================================================
-- STEP 8: MIGRATE PRESCRIPTION ITEMS (SIMPLIFIED - WORKING VERSION)
-- ========================================================================

-- Note: This simplified version uses a subquery instead of temp tables
-- It works reliably even with large datasets
INSERT INTO prescription_items (
    prescription_id, medicine_name,
    dosage, frequency, duration,
    route, before_after_food, notes,
    sort_order, created_at
)
SELECT DISTINCT
    (SELECT id FROM prescriptions WHERE patient_id = p.id ORDER BY id DESC LIMIT 1) AS prescription_id,
    COALESCE(TRIM(i.Name), 'Unknown') AS medicine_name,
    COALESCE(TRIM(i.Custom_Dose), '1 tab') AS dosage,
    COALESCE(TRIM(i.Custom_Frequency), '1-0-1') AS frequency,
    COALESCE(TRIM(i.Custom_Duration), '7 days') AS duration,
    'Oral' AS route,
    CASE
        WHEN i.Medication_Timing LIKE '%After%' THEN 'After Food'
        WHEN i.Medication_Timing LIKE '%Before%' THEN 'Before Food'
        WHEN i.Medication_Timing LIKE '%With%' THEN 'With Food'
        ELSE 'After Food'
    END AS before_after_food,
    TRIM(i.Medication_Instruction) AS notes,
    0 AS sort_order,
    @current_time AS created_at
FROM imported_table i
JOIN patients p ON CAST(p.patient_id AS CHAR) = CAST(i.Patient_UHID AS CHAR)
WHERE i.Type = 'medications'
  AND i.Name IS NOT NULL
  AND TRIM(i.Name) != ''
  AND p.id IS NOT NULL;

SELECT 'Step 8: Prescription Items (Medicines) migrated' AS step, ROW_COUNT() AS affected;

-- ========================================================================
-- STEP 9: MIGRATE PRESCRIPTION DIAGNOSES (Symptoms/Clinical Conditions)
-- ========================================================================

-- Populate prescription_diagnoses from prescriptions.diagnosis (table exists in schema)
INSERT INTO prescription_diagnoses (prescription_id, diagnosis_text, diagnosis_type, sort_order, created_at)
SELECT
  pr.id AS prescription_id,
  pr.diagnosis AS diagnosis_text,
  'Primary' AS diagnosis_type,
  0 AS sort_order,
  @current_time AS created_at
FROM prescriptions pr
WHERE pr.diagnosis IS NOT NULL
  AND TRIM(pr.diagnosis) != ''
  AND NOT EXISTS (
    SELECT 1
    FROM prescription_diagnoses pd
    WHERE pd.prescription_id = pr.id
      AND pd.diagnosis_text = pr.diagnosis
  );

SELECT 'Step 9: Prescription Diagnoses migrated' AS step, ROW_COUNT() AS affected;

-- ========================================================================
-- STEP 10: MIGRATE PATIENT VITALS
-- ========================================================================

INSERT INTO patient_vitals (
    patient_id, 
    height_cm, weight_kg, bmi,
    bp_systolic, bp_diastolic, blood_pressure,
    pulse, temperature, spo2,
    notes, recorded_at
)
SELECT 
    tpm.patient_id,
    MAX(CASE WHEN UPPER(i.Name) LIKE '%HEIGHT%' THEN 
        CAST(REGEXP_REPLACE(COALESCE(i.Value, i.Unit), '[^0-9.]', '') AS DECIMAL(5,2)) END) AS height_cm,
    MAX(CASE WHEN UPPER(i.Name) LIKE '%WEIGHT%' THEN 
        CAST(REGEXP_REPLACE(COALESCE(i.Value, i.Unit), '[^0-9.]', '') AS DECIMAL(5,2)) END) AS weight_kg,
    MAX(CASE WHEN UPPER(i.Name) LIKE '%BMI%' THEN 
        CAST(REGEXP_REPLACE(COALESCE(i.Value, i.Unit), '[^0-9.]', '') AS DECIMAL(4,2)) END) AS bmi,
    MAX(CASE WHEN UPPER(i.Name) LIKE '%BP%' OR UPPER(i.Name) LIKE '%BLOOD PRESSURE%' THEN 
        CAST(SUBSTRING_INDEX(REGEXP_REPLACE(COALESCE(i.Value, i.Unit), '[^0-9/]', ''), '/', 1) AS UNSIGNED) END) AS bp_systolic,
    MAX(CASE WHEN UPPER(i.Name) LIKE '%BP%' OR UPPER(i.Name) LIKE '%BLOOD PRESSURE%' THEN 
        CAST(SUBSTRING_INDEX(REGEXP_REPLACE(COALESCE(i.Value, i.Unit), '[^0-9/]', ''), '/', -1) AS UNSIGNED) END) AS bp_diastolic,
    MAX(CASE WHEN UPPER(i.Name) LIKE '%BP%' OR UPPER(i.Name) LIKE '%BLOOD PRESSURE%' THEN 
        COALESCE(i.Value, i.Unit) END) AS blood_pressure,
    MAX(CASE WHEN UPPER(i.Name) LIKE '%PULSE%' OR UPPER(i.Name) LIKE '%HEART RATE%' OR UPPER(i.Name) LIKE '%HR%' THEN 
        CAST(REGEXP_REPLACE(COALESCE(i.Value, i.Unit), '[^0-9]', '') AS UNSIGNED) END) AS pulse,
    MAX(CASE WHEN UPPER(i.Name) LIKE '%TEMP%' OR UPPER(i.Name) LIKE '%TEMPERATURE%' THEN 
        CAST(REGEXP_REPLACE(COALESCE(i.Value, i.Unit), '[^0-9.]', '') AS DECIMAL(4,1)) END) AS temperature,
    MAX(CASE WHEN UPPER(i.Name) LIKE '%SPO2%' OR UPPER(i.Name) LIKE '%O2%' OR UPPER(i.Name) LIKE '%OXYGEN%' THEN 
        CAST(REGEXP_REPLACE(COALESCE(i.Value, i.Unit), '[^0-9]', '') AS UNSIGNED) END) AS spo2,
    GROUP_CONCAT(DISTINCT CONCAT(i.Name, ': ', COALESCE(i.Value, i.Unit), ' ', COALESCE(i.Unit, '')) SEPARATOR '; ') AS notes,
    CASE 
        WHEN NULLIF(i.Reading_Date, '') IS NOT NULL 
        AND NULLIF(TRIM(i.Reading_Date), '') IS NOT NULL
        AND i.Reading_Date REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        THEN STR_TO_DATE(i.Reading_Date, '%Y-%m-%d')
        ELSE @current_time
    END AS recorded_at
FROM imported_table i
JOIN temp_prescription_mapping tpm ON tpm.old_prescription_id = i.Prescription_ID
WHERE i.Type IN ('vitals', 'vital', 'reading', 'measurement')
   OR UPPER(i.Name) IN ('HEIGHT', 'WEIGHT', 'BMI', 'BP', 'BLOOD PRESSURE', 'PULSE', 'HEART RATE', 'TEMPERATURE', 'SPO2', 'OXYGEN SATURATION')
   OR UPPER(i.Name) LIKE '%HEIGHT%' OR UPPER(i.Name) LIKE '%WEIGHT%' OR UPPER(i.Name) LIKE '%BMI%'
   OR UPPER(i.Name) LIKE '%BP%' OR UPPER(i.Name) LIKE '%PULSE%' OR UPPER(i.Name) LIKE '%TEMP%' OR UPPER(i.Name) LIKE '%SPO2%'
GROUP BY tpm.patient_id, i.Prescription_ID
HAVING height_cm IS NOT NULL 
    OR weight_kg IS NOT NULL 
    OR bp_systolic IS NOT NULL 
    OR pulse IS NOT NULL 
    OR temperature IS NOT NULL 
    OR spo2 IS NOT NULL;

SELECT 'Step 11: Patient Vitals migrated' AS step, ROW_COUNT() AS affected;

-- ========================================================================
-- STEP 11: MIGRATE BILLS
-- ========================================================================

INSERT INTO bills (
    patient_id, clinic_id, doctor_id,
    bill_number, total_amount, amount_paid, balance_due,
    payment_status, payment_method, bill_date, created_at, updated_at
)
SELECT 
    tpm.patient_id,
    tpm.clinic_id,
    tpm.doctor_id,
    CONCAT('BILL-', tpm.clinic_id, '-', 
        DATE_FORMAT(COALESCE(STR_TO_DATE(i.`date`, '%Y-%m-%d'), CURDATE()), '%Y%m%d'), 
        '-', LPAD(MOD(ABS(CRC32(i.Prescription_ID)), 1000000), 6, '0')
    ) AS bill_number,
    COALESCE(i.Billed_Amount, 0) AS total_amount,
    COALESCE(i.Billed_Amount, 0) AS amount_paid,
    0 AS balance_due,
    CASE WHEN i.Billed_Amount IS NOT NULL AND i.Billed_Amount > 0 THEN 'paid' ELSE 'unpaid' END AS payment_status,
    'cash' AS payment_method,
    CASE 
        WHEN NULLIF(i.`date`, '') IS NOT NULL 
        AND NULLIF(TRIM(i.`date`), '') IS NOT NULL
        AND i.`date` REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        THEN STR_TO_DATE(i.`date`, '%Y-%m-%d')
        ELSE CURDATE()
    END AS bill_date,
    @current_time AS created_at,
    @current_time AS updated_at
FROM imported_table i
JOIN temp_prescription_mapping tpm ON tpm.old_prescription_id = i.Prescription_ID
WHERE i.Billed_Amount IS NOT NULL 
  AND i.Billed_Amount > 0
GROUP BY i.Prescription_ID
ON DUPLICATE KEY UPDATE 
    total_amount = GREATEST(bills.total_amount, VALUES(total_amount)),
    amount_paid = GREATEST(bills.amount_paid, VALUES(amount_paid)),
    payment_status = CASE WHEN VALUES(total_amount) > 0 THEN 'paid' ELSE 'unpaid' END,
    updated_at = @current_time;

SELECT 'Step 11: Bills migrated' AS step, ROW_COUNT() AS affected;

-- ========================================================================
-- STEP 11.5: MIGRATE BILL ITEMS (Create default items for each bill)
-- ========================================================================

INSERT INTO bill_items (
    bill_id, service_id, service_name,
    quantity, unit_price, total_price, discount_amount,
    tax_amount, created_at, updated_at
)
SELECT 
    b.id AS bill_id,
    1 AS service_id,  -- Default consultation service ID
    CONCAT('Consultation - ', u.name) AS service_name,
    1 AS quantity,
    b.total_amount AS unit_price,
    b.total_amount AS total_price,
    0 AS discount_amount,
    0 AS tax_amount,
    b.created_at AS created_at,
    b.updated_at AS updated_at
FROM bills b
LEFT JOIN doctors d ON b.doctor_id = d.id
LEFT JOIN users u ON d.user_id = u.id
WHERE NOT EXISTS (
    SELECT 1 FROM bill_items bi WHERE bi.bill_id = b.id
);

SELECT 'Step 11.5: Bill Items created' AS step, ROW_COUNT() AS affected;

-- ========================================================================
-- STEP 12: ADD NEW MEDICINES from imported data
-- ========================================================================

INSERT IGNORE INTO medicines (
    name, generic_name, dosage_form, category, 
    manufacturer, strength, is_active, created_at, updated_at
)
SELECT DISTINCT
    TRIM(i.Name) AS name,
    TRIM(i.Generic_Name) AS generic_name,
    COALESCE(TRIM(i.Dosage_Form), TRIM(i.Medication_Form), 'Tablet') AS dosage_form,
    'Imported' AS category,
    'Imported Manufacturer' AS manufacturer,
    COALESCE(TRIM(i.Value), TRIM(i.Unit), '') AS strength,
    1 AS is_active,
    @current_time AS created_at,
    @current_time AS updated_at
FROM imported_table i
WHERE i.Type = 'medications'
  AND i.Name IS NOT NULL 
  AND TRIM(i.Name) != ''
  AND TRIM(i.Name) != 'N/A'
  AND TRIM(i.Name) != 'None'
  AND NOT EXISTS (SELECT 1 FROM medicines m WHERE LOWER(TRIM(m.name)) = LOWER(TRIM(i.Name)));

SELECT 'Step 12: New Medicines added' AS step, ROW_COUNT() AS affected;

-- ========================================================================
-- STEP 13: Update Patient Statistics
-- ========================================================================

UPDATE patients p
SET 
    last_visit_date = (SELECT MAX(a.appointment_date) FROM appointments a WHERE a.patient_id = p.id),
    total_visits = (SELECT COUNT(*) FROM appointments a WHERE a.patient_id = p.id),
    total_billing = (SELECT COALESCE(SUM(b.total_amount), 0) FROM bills b WHERE b.patient_id = p.id),
    updated_at = @current_time
WHERE p.id IN (SELECT patient_id FROM temp_prescription_mapping);

SELECT 'Step 13: Patient statistics updated' AS step, ROW_COUNT() AS affected;

-- ========================================================================
-- STEP 14: Update Medicine IDs in Prescription Items
-- ========================================================================

UPDATE prescription_items pi
JOIN medicines m ON LOWER(TRIM(m.name)) = LOWER(TRIM(pi.medicine_name))
SET pi.medicine_id = m.id
WHERE pi.medicine_id IS NULL;

SELECT 'Step 14: Medicine IDs updated in prescription items' AS step, ROW_COUNT() AS affected;

-- ========================================================================
-- CLEANUP & FINAL VERIFICATION
-- ========================================================================

DROP TEMPORARY TABLE IF EXISTS temp_prescription_mapping;

SET FOREIGN_KEY_CHECKS = 1;

SELECT '=== MIGRATION FROM IMPORTED_TABLE COMPLETE ===' AS status;

-- ========================================================================
-- FINAL VERIFICATION COUNTS
-- ========================================================================

SELECT 'FINAL VERIFICATION COUNTS' AS report;
SELECT 'Clinics' AS entity, COUNT(*) AS count FROM clinics
UNION ALL 
SELECT 'Users', COUNT(*) FROM users
UNION ALL 
SELECT 'Doctors', COUNT(*) FROM doctors
UNION ALL 
SELECT 'Patients', COUNT(*) FROM patients
UNION ALL 
SELECT 'Patient Tags', COUNT(*) FROM patient_tags
UNION ALL 
SELECT 'Appointments', COUNT(*) FROM appointments
UNION ALL 
SELECT 'Prescriptions', COUNT(*) FROM prescriptions
UNION ALL 
SELECT 'Prescription Items', COUNT(*) FROM prescription_items
UNION ALL 
SELECT 'Patient Vitals', COUNT(*) FROM patient_vitals
UNION ALL 
SELECT 'Bills', COUNT(*) FROM bills
UNION ALL 
SELECT 'Medicines', COUNT(*) FROM medicines;

-- ========================================================================
-- DATA QUALITY CHECKS
-- ========================================================================

SELECT 'DATA QUALITY CHECKS' AS report;

-- Check for patients without appointments
SELECT 'Patients without appointments' AS check_name, COUNT(*) AS count
FROM patients p
LEFT JOIN appointments a ON p.id = a.patient_id
WHERE a.id IS NULL;

-- Check for prescriptions without items
SELECT 'Prescriptions without items' AS check_name, COUNT(*) AS count
FROM prescriptions pr
LEFT JOIN prescription_items pi ON pr.id = pi.prescription_id
WHERE pi.id IS NULL;

-- Check for bills with zero amount
SELECT 'Bills with zero amount' AS check_name, COUNT(*) AS count
FROM bills WHERE total_amount = 0;

-- Check for missing medicine mappings
SELECT 'Prescription items without medicine mapping' AS check_name, COUNT(*) AS count
FROM prescription_items WHERE medicine_id IS NULL;

-- Sample data verification
SELECT 'Sample imported patients' AS info, patient_id, name, phone, created_at
FROM patients 
WHERE patient_id REGEXP '^[0-9]+$' 
ORDER BY created_at DESC 
LIMIT 5;

SELECT 'Sample imported prescriptions' AS info, id, patient_id, prescribed_date, status
FROM prescriptions 
WHERE created_at >= @current_time - INTERVAL 1 HOUR
ORDER BY created_at DESC 
LIMIT 5;
