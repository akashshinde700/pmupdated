-- ========================================================================
-- 05_procedures_views_triggers_indexes_MARIADB_FINAL.sql
-- Complete Part 5: All Procedures, Views, Triggers & Indexes
-- 100% MariaDB 10.6+ Compatible | Production Ready
-- ========================================================================

USE patient_management;
SET FOREIGN_KEY_CHECKS = 0;

-- ========================================================================
-- TABLE STRUCTURE UPDATES (Live Database Changes)
-- ========================================================================

-- Update queue table structure with visit_status field
ALTER TABLE queue 
ADD COLUMN IF NOT EXISTS visit_status ENUM('with_staff','unbilled','billed') NULL DEFAULT 'unbilled';

-- Update queue table defaults
ALTER TABLE queue 
MODIFY COLUMN priority INT NULL DEFAULT 0,
MODIFY COLUMN status ENUM('waiting','called','in_progress','completed','cancelled','no-show','skipped') NULL DEFAULT 'waiting',
MODIFY COLUMN check_in_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Update patients table defaults
ALTER TABLE patients 
MODIFY COLUMN is_vip TINYINT(1) NULL KEY DEFAULT 0,
MODIFY COLUMN priority INT NULL DEFAULT 0,
MODIFY COLUMN total_visits INT NULL DEFAULT 0,
MODIFY COLUMN total_billing DECIMAL(12,2) NULL DEFAULT 0.00,
MODIFY COLUMN outstanding_balance DECIMAL(12,2) NULL KEY DEFAULT 0.00,
MODIFY COLUMN registered_date DATE NOT NULL DEFAULT curdate(),
MODIFY COLUMN country VARCHAR(100) NULL DEFAULT 'India';

-- Update bills table defaults
ALTER TABLE bills 
MODIFY COLUMN subtotal DECIMAL(12,2) NULL DEFAULT 0.00,
MODIFY COLUMN discount_percent DECIMAL(5,2) NULL DEFAULT 0.00,
MODIFY COLUMN discount_amount DECIMAL(12,2) NULL DEFAULT 0.00,
MODIFY COLUMN tax_percent DECIMAL(5,2) NULL DEFAULT 0.00,
MODIFY COLUMN tax_amount DECIMAL(12,2) NULL DEFAULT 0.00,
MODIFY COLUMN total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
MODIFY COLUMN amount_paid DECIMAL(12,2) NULL DEFAULT 0.00,
MODIFY COLUMN balance_due DECIMAL(12,2) NULL DEFAULT 0.00,
MODIFY COLUMN payment_method ENUM('cash','card','upi','netbanking','cheque','wallet','insurance','credit','mixed') NULL KEY DEFAULT 'cash',
MODIFY COLUMN payment_status ENUM('pending','partial','paid','overdue','cancelled','refunded') NULL DEFAULT 'pending',
MODIFY COLUMN bill_date DATE NOT NULL KEY DEFAULT curdate();

-- ========================================================================
-- SECTION 1: STORED PROCEDURES (12 Critical Procedures)
-- ========================================================================

DELIMITER $$

-- =====================================================
-- 1. Get Complete Prescription Suggestion (FIXED - No UNION in Procedure)
-- =====================================================
DROP PROCEDURE IF EXISTS sp_get_complete_prescription_suggestion$$
CREATE PROCEDURE sp_get_complete_prescription_suggestion(
    IN p_symptom VARCHAR(255),
    IN p_age INT,
    IN p_weight DECIMAL(10,2),
    IN p_limit INT
)
BEGIN
    SET p_limit = IFNULL(p_limit, 20);
    SET p_symptom = LOWER(TRIM(p_symptom));

    -- Create temp table for results
    DROP TEMPORARY TABLE IF EXISTS tmp_prescription_suggestions;
    CREATE TEMPORARY TABLE tmp_prescription_suggestions (
        result_type VARCHAR(20),
        icd_code VARCHAR(20),
        diagnosis_name VARCHAR(500),
        medication_name VARCHAR(255),
        priority INT
    );

    -- Insert diagnoses
    INSERT INTO tmp_prescription_suggestions (result_type, icd_code, diagnosis_name, medication_name, priority)
    SELECT 
        'diagnosis' as result_type,
        im.icd_code,
        ic.primary_description as diagnosis_name,
        NULL as medication_name,
        im.priority
    FROM icd_medication_mapping im
    JOIN icd_codes ic ON im.icd_code = ic.icd_code
    WHERE LOWER(ic.primary_description) LIKE CONCAT('%', p_symptom, '%')
       OR LOWER(ic.short_description) LIKE CONCAT('%', p_symptom, '%')
    GROUP BY im.icd_code
    LIMIT p_limit;

    -- Insert medications
    INSERT INTO tmp_prescription_suggestions (result_type, icd_code, diagnosis_name, medication_name, priority)
    SELECT 
        'medication' as result_type,
        NULL as icd_code,
        NULL as diagnosis_name,
        sm.medication_name,
        sm.recommendation_priority as priority
    FROM symptom_medication_mapping sm
    WHERE LOWER(sm.symptom_name) LIKE CONCAT('%', p_symptom, '%')
      AND (p_age IS NULL OR 
           sm.age_group = 'All' OR
           (p_age < 12 AND sm.age_group = 'Pediatric') OR
           (p_age BETWEEN 12 AND 59 AND sm.age_group = 'Adult') OR
           (p_age >= 60 AND sm.age_group = 'Geriatric'))
    ORDER BY sm.is_first_line DESC, sm.recommendation_priority ASC
    LIMIT p_limit;

    -- Return combined results
    SELECT * FROM tmp_prescription_suggestions
    ORDER BY FIELD(result_type, 'diagnosis', 'medication'), priority ASC;

    -- Cleanup
    DROP TEMPORARY TABLE IF EXISTS tmp_prescription_suggestions;
END$$

-- =====================================================
-- 2. Get Medications by ICD Code
-- =====================================================
DROP PROCEDURE IF EXISTS sp_get_medications_by_icd$$
CREATE PROCEDURE sp_get_medications_by_icd(
    IN p_icd_code VARCHAR(20),
    IN p_age INT,
    IN p_weight DECIMAL(10,2),
    IN p_limit INT
)
BEGIN
    SET p_limit = IFNULL(p_limit, 20);

    SELECT 
        im.medication_name,
        im.generic_name,
        im.dosage_form,
        im.strength,
        im.recommended_frequency as frequency,
        im.recommended_duration as duration,
        im.recommended_route as route,
        im.indication,
        im.contraindications,
        im.is_first_line,
        im.priority,
        im.evidence_level,
        COALESCE(m.usage_count, 0) as usage_count,
        m.default_dosage,
        m.default_frequency,
        m.default_duration,
        dr.standard_dosage,
        dr.max_daily_dose,
        dr.dose_per_kg,
        CASE 
            WHEN p_weight IS NOT NULL AND dr.dose_per_kg IS NOT NULL 
            THEN CONCAT(ROUND(p_weight * dr.dose_per_kg, 2), ' mg')
            ELSE dr.standard_dosage
        END as adjusted_dosage
    FROM icd_medication_mapping im
    LEFT JOIN medicines m ON LOWER(m.name) = LOWER(im.medication_name)
    LEFT JOIN dosage_references dr ON LOWER(dr.medication_name) = LOWER(im.medication_name)
        AND (dr.age_group = 'All' OR 
             (p_age < 12 AND dr.age_group = 'Pediatric') OR
             (p_age BETWEEN 12 AND 59 AND dr.age_group = 'Adult') OR
             (p_age >= 60 AND dr.age_group = 'Geriatric'))
    WHERE im.icd_code = p_icd_code
    ORDER BY im.is_first_line DESC, im.priority ASC, m.usage_count DESC
    LIMIT p_limit;
END$$

-- =====================================================
-- 3. Get Diagnosis by Symptoms
-- =====================================================
DROP PROCEDURE IF EXISTS sp_get_diagnosis_by_symptoms$$
CREATE PROCEDURE sp_get_diagnosis_by_symptoms(
    IN p_symptoms TEXT,
    IN p_limit INT
)
BEGIN
    SET p_limit = IFNULL(p_limit, 20);

    SELECT DISTINCT
        d.icd_code,
        d.diagnosis_name,
        COUNT(DISTINCT d.medication_name) as medication_count,
        AVG(IFNULL(d.priority, 10)) as avg_priority
    FROM diagnosis_medication_mapping d
    WHERE d.icd_code IN (
        SELECT DISTINCT icd_code 
        FROM icd_codes ic
        WHERE LOWER(ic.primary_description) LIKE CONCAT('%', LOWER(TRIM(p_symptoms)), '%')
           OR LOWER(ic.short_description) LIKE CONCAT('%', LOWER(TRIM(p_symptoms)), '%')
    )
    GROUP BY d.icd_code, d.diagnosis_name
    ORDER BY medication_count DESC, avg_priority ASC
    LIMIT p_limit;
END$$

-- =====================================================
-- 4. Search Diagnoses
-- =====================================================
DROP PROCEDURE IF EXISTS sp_search_diagnoses$$
CREATE PROCEDURE sp_search_diagnoses(
    IN p_search_term VARCHAR(255),
    IN p_limit INT,
    IN p_offset INT
)
BEGIN
    SET p_limit = IFNULL(p_limit, 20);
    SET p_offset = IFNULL(p_offset, 0);

    SELECT 
        icd_code,
        primary_description as diagnosis_name,
        secondary_description,
        short_description,
        chapter_code,
        usage_count,
        CASE 
            WHEN icd_code = p_search_term THEN 0
            WHEN primary_description LIKE CONCAT(p_search_term, '%') THEN 1
            WHEN primary_description LIKE CONCAT('%', p_search_term, '%') THEN 2
            ELSE 3
        END as relevance
    FROM icd_codes
    WHERE icd_code LIKE CONCAT('%', p_search_term, '%')
       OR primary_description LIKE CONCAT('%', p_search_term, '%')
       OR secondary_description LIKE CONCAT('%', p_search_term, '%')
       OR short_description LIKE CONCAT('%', p_search_term, '%')
    ORDER BY relevance ASC, usage_count DESC
    LIMIT p_limit OFFSET p_offset;
END$$

-- =====================================================
-- 5. Search Medications (FIXED - Removed GROUP BY issue)
-- =====================================================
DROP PROCEDURE IF EXISTS sp_search_medications$$
CREATE PROCEDURE sp_search_medications(
    IN p_search_term VARCHAR(255),
    IN p_limit INT,
    IN p_offset INT
)
BEGIN
    SET p_limit = IFNULL(p_limit, 20);
    SET p_offset = IFNULL(p_offset, 0);

    SELECT 
        m.id,
        m.name,
        m.generic_name,
        m.brand,
        m.manufacturer,
        m.strength,
        m.dosage_form,
        m.category,
        m.therapeutic_class,
        m.default_dosage,
        m.default_frequency,
        m.default_duration,
        m.default_route,
        m.usage_count,
        m.is_active,
        (SELECT COUNT(DISTINCT dr.id) FROM dosage_references dr 
         WHERE LOWER(dr.medication_name) = LOWER(m.name)) as dosage_variants
    FROM medicines m
    WHERE m.is_active = 1
      AND (m.name LIKE CONCAT('%', p_search_term, '%')
        OR m.generic_name LIKE CONCAT('%', p_search_term, '%')
        OR m.brand LIKE CONCAT('%', p_search_term, '%'))
    ORDER BY 
        CASE WHEN m.name LIKE CONCAT(p_search_term, '%') THEN 0 ELSE 1 END,
        m.usage_count DESC,
        LENGTH(m.name) ASC
    LIMIT p_limit OFFSET p_offset;
END$$

-- =====================================================
-- 6. Get Related ICD Data (FIXED - Temp table instead of UNION)
-- =====================================================
DROP PROCEDURE IF EXISTS sp_get_icd_related_data$$
CREATE PROCEDURE sp_get_icd_related_data(
    IN p_icd_code VARCHAR(20),
    IN p_limit INT
)
BEGIN
    DECLARE v_diagnosis_name VARCHAR(255);
    SET p_limit = IFNULL(p_limit, 20);

    -- Get ICD description
    SELECT primary_description INTO v_diagnosis_name 
    FROM icd_codes 
    WHERE icd_code = p_icd_code 
    LIMIT 1;

    -- Create temp table
    DROP TEMPORARY TABLE IF EXISTS tmp_related_data;
    CREATE TEMPORARY TABLE tmp_related_data (
        data_type VARCHAR(20),
        data_value VARCHAR(500),
        icd_code VARCHAR(20),
        priority INT
    );

    -- Insert symptoms
    INSERT INTO tmp_related_data
    SELECT DISTINCT 
        'symptom' as data_type,
        sm.symptom_name as data_value,
        p_icd_code as icd_code,
        IFNULL(sm.recommendation_priority, 10) as priority
    FROM symptom_medication_mapping sm
    WHERE sm.medication_name IN (
        SELECT medication_name FROM icd_medication_mapping WHERE icd_code = p_icd_code
    );

    -- Insert related diagnoses
    INSERT INTO tmp_related_data
    SELECT DISTINCT
        'diagnosis' as data_type,
        dim.diagnosis_name as data_value,
        dim.icd_code,
        IFNULL(dim.priority, 10) as priority
    FROM diagnosis_medication_mapping dim
    WHERE dim.medication_name IN (
        SELECT medication_name FROM icd_medication_mapping WHERE icd_code = p_icd_code
    )
    AND dim.icd_code != p_icd_code;

    -- Insert medications
    INSERT INTO tmp_related_data
    SELECT
        'medication' as data_type,
        im.medication_name as data_value,
        im.icd_code,
        im.priority
    FROM icd_medication_mapping im
    WHERE im.icd_code = p_icd_code;

    -- Return results
    SELECT * FROM tmp_related_data
    ORDER BY priority ASC
    LIMIT p_limit;

    -- Cleanup
    DROP TEMPORARY TABLE IF EXISTS tmp_related_data;
END$$

-- =====================================================
-- 7. Get Next Bill Number
-- =====================================================
DROP PROCEDURE IF EXISTS sp_get_next_bill_no$$
CREATE PROCEDURE sp_get_next_bill_no(
    IN p_clinic_id INT,
    OUT p_bill_no VARCHAR(50)
)
BEGIN
    DECLARE v_year INT DEFAULT YEAR(CURDATE());
    DECLARE v_seq INT DEFAULT 0;

    SELECT last_no + 1 INTO v_seq
    FROM bill_sequences
    WHERE clinic_id = p_clinic_id AND seq_year = v_year
    FOR UPDATE;

    IF v_seq IS NULL THEN
        SET v_seq = 1;
        INSERT INTO bill_sequences (clinic_id, seq_year, last_no) 
        VALUES (p_clinic_id, v_year, 1);
    ELSE
        UPDATE bill_sequences 
        SET last_no = v_seq 
        WHERE clinic_id = p_clinic_id AND seq_year = v_year;
    END IF;

    SET p_bill_no = CONCAT('BILL-', p_clinic_id, '-', v_year, '-', LPAD(v_seq, 6, '0'));
END$$

-- =====================================================
-- 8. Get Next Admission Number
-- =====================================================
DROP PROCEDURE IF EXISTS sp_get_next_admission_no$$
CREATE PROCEDURE sp_get_next_admission_no(
    IN p_clinic_id INT,
    OUT p_adm_no VARCHAR(50)
)
BEGIN
    DECLARE v_year INT DEFAULT YEAR(CURDATE());
    DECLARE v_seq INT DEFAULT 0;

    SELECT last_no + 1 INTO v_seq
    FROM admission_sequences
    WHERE clinic_id = p_clinic_id AND seq_year = v_year
    FOR UPDATE;

    IF v_seq IS NULL THEN
        SET v_seq = 1;
        INSERT INTO admission_sequences (clinic_id, seq_year, last_no) 
        VALUES (p_clinic_id, v_year, 1);
    ELSE
        UPDATE admission_sequences 
        SET last_no = v_seq 
        WHERE clinic_id = p_clinic_id AND seq_year = v_year;
    END IF;

    SET p_adm_no = CONCAT('ADM-', p_clinic_id, '-', v_year, '-', LPAD(v_seq, 6, '0'));
END$$

-- =====================================================
-- 9. Update Patient Stats
-- =====================================================
DROP PROCEDURE IF EXISTS sp_update_patient_stats$$
CREATE PROCEDURE sp_update_patient_stats(IN p_patient_id INT)
BEGIN
    UPDATE patients p SET
        total_visits = (
            SELECT COUNT(*) 
            FROM appointments 
            WHERE patient_id = p_patient_id 
              AND status IN ('completed','in-progress')
        ),
        last_visit_date = (
            SELECT MAX(appointment_date) 
            FROM appointments 
            WHERE patient_id = p_patient_id 
              AND status IN ('completed','in-progress')
        ),
        total_billing = (
            SELECT COALESCE(SUM(total_amount),0) 
            FROM bills 
            WHERE patient_id = p_patient_id
        ),
        outstanding_balance = (
            SELECT COALESCE(SUM(balance_due),0) 
            FROM bills 
            WHERE patient_id = p_patient_id 
              AND payment_status != 'paid'
        )
    WHERE p.id = p_patient_id;
END$$

-- =====================================================
-- 10. Get Patient Medical History
-- =====================================================
DROP PROCEDURE IF EXISTS sp_GetPatientMedicalHistory$$
CREATE PROCEDURE sp_GetPatientMedicalHistory(
    IN p_patient_id INT,
    IN p_clinic_id INT
)
BEGIN
    -- Patient Demographics
    SELECT 
        p.id, p.patient_id, p.name, p.phone, p.email,
        p.dob, p.age_years, p.gender, p.blood_group,
        p.address, p.city, p.state, p.pincode,
        p.medical_conditions, p.allergies, p.current_medications,
        p.last_visit_date, p.total_visits, p.total_billing, p.outstanding_balance,
        u.name as primary_doctor,
        c.name as clinic_name
    FROM patients p
    LEFT JOIN doctors d ON p.primary_doctor_id = d.id
    LEFT JOIN users u ON d.user_id = u.id
    LEFT JOIN clinics c ON p.clinic_id = c.id
    WHERE p.id = p_patient_id AND p.clinic_id = p_clinic_id;

    -- Active Allergies
    SELECT 
        category, allergen_name, severity, reaction, created_at
    FROM patient_allergies
    WHERE patient_id = p_patient_id AND is_active = 1
    ORDER BY severity DESC, created_at DESC;

    -- Chronic Conditions
    SELECT 
        condition_name, icd_code, start_date, status, notes, created_at
    FROM patient_chronic_conditions
    WHERE patient_id = p_patient_id
    ORDER BY start_date DESC;

    -- Recent Vitals
    SELECT 
        recorded_at, temperature, bp_systolic, bp_diastolic, 
        pulse, spo2, weight_kg, height_cm, bmi, notes
    FROM patient_vitals
    WHERE patient_id = p_patient_id
    ORDER BY recorded_at DESC
    LIMIT 10;

    -- Recent Prescriptions
    SELECT 
        pr.id, pr.prescribed_date, pr.diagnosis, pr.advice,
        u2.name as doctor_name,
        COUNT(pi.id) as medicine_count
    FROM prescriptions pr
    LEFT JOIN doctors d2 ON pr.doctor_id = d2.id
    LEFT JOIN users u2 ON d2.user_id = u2.id
    LEFT JOIN prescription_items pi ON pr.id = pi.prescription_id
    WHERE pr.patient_id = p_patient_id
    GROUP BY pr.id
    ORDER BY pr.prescribed_date DESC
    LIMIT 5;

    -- Upcoming Appointments
    SELECT 
        a.id, a.appointment_date, a.appointment_time, a.status,
        u3.name as doctor_name, d3.specialization,
        DATEDIFF(a.appointment_date, CURDATE()) as days_away
    FROM appointments a
    LEFT JOIN doctors d3 ON a.doctor_id = d3.id
    LEFT JOIN users u3 ON d3.user_id = u3.id
    WHERE a.patient_id = p_patient_id 
      AND a.appointment_date >= CURDATE()
      AND a.status NOT IN ('cancelled', 'no-show')
    ORDER BY a.appointment_date, a.appointment_time
    LIMIT 5;
END$$

-- =====================================================
-- 11. Get Doctor Dashboard
-- =====================================================
DROP PROCEDURE IF EXISTS sp_GetDoctorDashboard$$
CREATE PROCEDURE sp_GetDoctorDashboard(
    IN p_doctor_id INT,
    IN p_clinic_id INT,
    IN p_days_range INT
)
BEGIN
    DECLARE v_start_date DATE;
    DECLARE v_end_date DATE;

    SET p_days_range = IFNULL(p_days_range, 30);
    SET v_start_date = DATE_SUB(CURDATE(), INTERVAL p_days_range DAY);
    SET v_end_date = CURDATE();

    -- Doctor Info
    SELECT 
        d.id, d.specialization, d.consultation_fee, d.status,
        u.name, u.email, u.phone,
        c.name as clinic_name
    FROM doctors d
    JOIN users u ON d.user_id = u.id
    JOIN clinics c ON d.clinic_id = c.id
    WHERE d.id = p_doctor_id AND d.clinic_id = p_clinic_id;

    -- Patient Stats
    SELECT 
        COUNT(DISTINCT p.id) as total_patients,
        COUNT(DISTINCT CASE WHEN a.appointment_date >= v_start_date THEN p.id END) as active_patients,
        COUNT(DISTINCT CASE WHEN p.registered_date >= v_start_date THEN p.id END) as new_patients
    FROM patients p
    LEFT JOIN appointments a ON p.id = a.patient_id AND a.doctor_id = p_doctor_id
    WHERE p.clinic_id = p_clinic_id;

    -- Appointment Stats
    SELECT 
        COUNT(a.id) as total_appointments,
        SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN a.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN a.status = 'no-show' THEN 1 ELSE 0 END) as no_show,
        SUM(a.consultation_fee) as total_revenue
    FROM appointments a
    WHERE a.doctor_id = p_doctor_id 
      AND a.appointment_date BETWEEN v_start_date AND v_end_date;

    -- Today's Schedule
    SELECT 
        a.id, a.appointment_time, a.status,
        p.name as patient_name, p.phone,
        a.reason_for_visit, a.consultation_type
    FROM appointments a
    JOIN patients p ON a.patient_id = p.id
    WHERE a.doctor_id = p_doctor_id 
      AND a.appointment_date = CURDATE()
    ORDER BY a.appointment_time;
END$$

-- =====================================================
-- 12. Get Clinic Revenue Report
-- =====================================================
DROP PROCEDURE IF EXISTS sp_GetClinicRevenueReport$$
CREATE PROCEDURE sp_GetClinicRevenueReport(
    IN p_clinic_id INT,
    IN p_start_date DATE,
    IN p_end_date DATE
)
BEGIN
    -- Overall Summary
    SELECT 
        COUNT(b.id) as total_bills,
        SUM(b.total_amount) as gross_revenue,
        SUM(b.amount_paid) as amount_received,
        SUM(b.balance_due) as outstanding_amount,
        AVG(b.total_amount) as average_bill_amount
    FROM bills b
    WHERE b.clinic_id = p_clinic_id
      AND b.bill_date BETWEEN p_start_date AND p_end_date;

    -- Revenue by Doctor
    SELECT 
        d.id, u.name as doctor_name, d.specialization,
        COUNT(b.id) as bill_count,
        SUM(b.total_amount) as total_revenue,
        SUM(b.amount_paid) as amount_received
    FROM bills b
    JOIN doctors d ON b.doctor_id = d.id
    JOIN users u ON d.user_id = u.id
    WHERE b.clinic_id = p_clinic_id
      AND b.bill_date BETWEEN p_start_date AND p_end_date
    GROUP BY d.id
    ORDER BY total_revenue DESC;

    -- Revenue by Payment Method
    SELECT 
        payment_method,
        COUNT(*) as transaction_count,
        SUM(total_amount) as total_amount,
        ROUND(AVG(total_amount), 2) as average_amount
    FROM bills
    WHERE clinic_id = p_clinic_id
      AND bill_date BETWEEN p_start_date AND p_end_date
    GROUP BY payment_method
    ORDER BY total_amount DESC;

    -- Daily Trend
    SELECT 
        bill_date,
        COUNT(*) as daily_bills,
        SUM(total_amount) as daily_revenue,
        SUM(amount_paid) as daily_received
    FROM bills
    WHERE clinic_id = p_clinic_id
      AND bill_date BETWEEN p_start_date AND p_end_date
    GROUP BY bill_date
    ORDER BY bill_date;
END$$

DELIMITER ;

-- ========================================================================
-- SECTION 2: VIEWS (8 High Performance Views)
-- ========================================================================

-- 1. Patient Dashboard
CREATE OR REPLACE VIEW vw_PatientDashboard AS
SELECT 
    p.id as patient_db_id,
    p.patient_id,
    p.name as patient_name,
    p.phone,
    p.email,
    p.age_years as age,
    p.gender,
    p.blood_group,
    p.is_vip,
    p.vip_tier,
    c.name as clinic_name,
    COALESCE(u.name, 'No Doctor') as primary_doctor,
    p.total_visits,
    p.last_visit_date,
    p.total_billing,
    p.outstanding_balance,
    p.registered_date,
    COUNT(DISTINCT pa.id) as allergy_count,
    COUNT(DISTINCT pcc.id) as chronic_condition_count,
    COUNT(DISTINCT pr.id) as prescription_count,
    COUNT(DISTINCT a.id) as appointment_count,
    COUNT(DISTINCT b.id) as bill_count,
    COUNT(DISTINCT CASE WHEN a.appointment_date >= CURDATE() AND a.status NOT IN ('cancelled','no-show','completed') THEN a.id END) as upcoming_appointments
FROM patients p
LEFT JOIN clinics c ON p.clinic_id = c.id
LEFT JOIN doctors d ON p.primary_doctor_id = d.id
LEFT JOIN users u ON d.user_id = u.id
LEFT JOIN patient_allergies pa ON p.id = pa.patient_id AND pa.is_active = 1
LEFT JOIN patient_chronic_conditions pcc ON p.id = pcc.patient_id AND pcc.status = 'Active'
LEFT JOIN prescriptions pr ON p.id = pr.patient_id
LEFT JOIN appointments a ON p.id = a.patient_id
LEFT JOIN bills b ON p.id = b.patient_id
GROUP BY p.id;

-- 2. Doctor Summary
CREATE OR REPLACE VIEW vw_DoctorSummary AS
SELECT 
    d.id as doctor_id,
    u.name as doctor_name,
    u.email,
    u.phone,
    d.specialization,
    d.sub_specialization,
    d.qualification,
    d.consultation_fee,
    d.status,
    c.name as clinic_name,
    COUNT(DISTINCT p.id) as total_patients,
    COUNT(DISTINCT a.id) as total_appointments,
    COUNT(DISTINCT pr.id) as total_prescriptions,
    SUM(CASE WHEN a.status = 'completed' THEN a.consultation_fee ELSE 0 END) as total_revenue,
    COUNT(DISTINCT CASE WHEN a.appointment_date = CURDATE() THEN a.id END) as today_appointments,
    COUNT(DISTINCT CASE WHEN a.appointment_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY) 
           AND a.status NOT IN ('cancelled', 'no-show') THEN a.id END) as upcoming_appointments
FROM doctors d
LEFT JOIN users u ON d.user_id = u.id
LEFT JOIN clinics c ON d.clinic_id = c.id
LEFT JOIN appointments a ON d.id = a.doctor_id
LEFT JOIN patients p ON a.patient_id = p.id
LEFT JOIN prescriptions pr ON d.id = pr.doctor_id
GROUP BY d.id;

-- 3. Prescription Summary
CREATE OR REPLACE VIEW vw_PrescriptionSummary AS
SELECT 
    pr.id as prescription_id,
    pr.prescribed_date,
    pr.follow_up_date,
    pr.status,
    pr.chief_complaint,
    pr.diagnosis,
    pr.diagnosis_icd_code,
    pr.advice,
    p.patient_id,
    p.name as patient_name,
    p.phone,
    p.age_years,
    p.gender,
    u.name as doctor_name,
    d.specialization,
    c.name as clinic_name,
    COUNT(pi.id) as medicine_count,
    GROUP_CONCAT(
        CONCAT(pi.medicine_name, ' (', pi.dosage, ' - ', pi.frequency, ' - ', pi.duration, ')') 
        ORDER BY pi.sort_order
        SEPARATOR ', '
    ) as medicines_list
FROM prescriptions pr
JOIN patients p ON pr.patient_id = p.id
LEFT JOIN doctors d ON pr.doctor_id = d.id
LEFT JOIN users u ON d.user_id = u.id
LEFT JOIN clinics c ON pr.clinic_id = c.id
LEFT JOIN prescription_items pi ON pr.id = pi.prescription_id
GROUP BY pr.id
ORDER BY pr.prescribed_date DESC;

-- 4. Today's Appointments
CREATE OR REPLACE VIEW vw_TodayAppointments AS
SELECT 
    a.id,
    a.appointment_time,
    a.status,
    a.priority,
    a.consultation_type,
    a.arrival_type,
    p.patient_id,
    p.name AS patient_name,
    p.phone,
    p.age_years,
    p.gender,
    u.name AS doctor_name,
    d.specialization,
    c.name as clinic_name,
    q.queue_number,
    q.token_number,
    q.status AS queue_status,
    a.checked_in_at,
    a.visit_started_at
FROM appointments a
JOIN patients p ON p.id = a.patient_id
JOIN doctors d ON d.id = a.doctor_id
JOIN users u ON u.id = d.user_id
JOIN clinics c ON c.id = a.clinic_id
LEFT JOIN queue q ON q.appointment_id = a.id
WHERE a.appointment_date = CURRENT_DATE
ORDER BY a.appointment_time;

-- 5. Active Admissions
CREATE OR REPLACE VIEW vw_ActiveAdmissions AS
SELECT 
    pa.id,
    pa.admission_number,
    pa.admission_date,
    pa.admission_type,
    pa.status,
    p.patient_id,
    p.name AS patient_name,
    p.phone,
    p.age_years,
    p.gender,
    u.name AS doctor_name,
    d.specialization,
    c.name as clinic_name,
    r.room_number,
    rt.type_name as room_type,
    b.bed_number,
    pa.provisional_diagnosis,
    DATEDIFF(COALESCE(pa.discharge_date, CURDATE()), pa.admission_date) AS days_admitted,
    ab.net_payable,
    ab.amount_paid,
    ab.balance_due,
    ab.payment_status
FROM patient_admissions pa
JOIN patients p ON p.id = pa.patient_id
JOIN doctors d ON d.id = pa.doctor_id
JOIN users u ON u.id = d.user_id
JOIN clinics c ON c.id = pa.clinic_id
LEFT JOIN rooms r ON r.id = pa.room_id
LEFT JOIN room_types rt ON rt.id = r.room_type_id
LEFT JOIN beds b ON b.id = pa.bed_id
LEFT JOIN admission_bills ab ON ab.admission_id = pa.id
WHERE pa.status = 'admitted';

-- 6. Monthly Revenue
CREATE OR REPLACE VIEW vw_MonthlyRevenue AS
SELECT 
    c.id AS clinic_id,
    c.name AS clinic_name,
    DATE_FORMAT(b.bill_date, '%Y-%m') AS bill_month,
    COUNT(b.id) AS total_bills,
    SUM(b.total_amount) AS gross_revenue,
    SUM(b.amount_paid) AS collected,
    SUM(b.balance_due) AS pending_collection,
    AVG(b.total_amount) as avg_bill_amount
FROM clinics c
LEFT JOIN bills b ON b.clinic_id = c.id 
    AND b.bill_date >= DATE_SUB(CURRENT_DATE, INTERVAL 24 MONTH)
GROUP BY c.id, bill_month
ORDER BY bill_month DESC;

-- 7. Pending Bills
CREATE OR REPLACE VIEW vw_PendingBills AS
SELECT 
    b.id,
    b.bill_number,
    b.bill_date,
    b.due_date,
    b.total_amount,
    b.amount_paid,
    b.balance_due,
    b.payment_status,
    p.patient_id,
    p.name as patient_name,
    p.phone,
    u.name as doctor_name,
    c.name as clinic_name,
    DATEDIFF(CURDATE(), b.bill_date) as days_pending
FROM bills b
JOIN patients p ON b.patient_id = p.id
LEFT JOIN doctors d ON b.doctor_id = d.id
LEFT JOIN users u ON d.user_id = u.id
JOIN clinics c ON b.clinic_id = c.id
WHERE b.payment_status IN ('pending', 'partial', 'overdue')
  AND b.balance_due > 0
ORDER BY b.bill_date DESC;

-- 8. Queue Status
CREATE OR REPLACE VIEW vw_QueueStatus AS
SELECT 
    q.id,
    q.token_number,
    q.queue_number,
    q.status,
    q.priority,
    q.check_in_time,
    q.called_at,
    q.start_time,
    q.wait_duration_minutes,
    p.patient_id,
    p.name as patient_name,
    p.phone,
    u.name as doctor_name,
    d.specialization,
    c.name as clinic_name,
    a.appointment_time
FROM queue q
JOIN patients p ON q.patient_id = p.id
JOIN doctors d ON q.doctor_id = d.id
JOIN users u ON d.user_id = u.id
JOIN clinics c ON q.clinic_id = c.id
LEFT JOIN appointments a ON q.appointment_id = a.id
WHERE q.check_in_date = CURDATE()
ORDER BY q.priority DESC, q.check_in_time ASC;

-- ========================================================================
-- SECTION 3: TRIGGERS (12 Smart Triggers)
-- ========================================================================

DELIMITER $$

-- 1. Auto BMI Insert
DROP TRIGGER IF EXISTS trg_CalculateBMI$$
CREATE TRIGGER trg_CalculateBMI 
BEFORE INSERT ON patient_vitals
FOR EACH ROW
BEGIN
    IF NEW.height_cm IS NOT NULL AND NEW.height_cm > 0 
       AND NEW.weight_kg IS NOT NULL THEN
        SET NEW.bmi = ROUND(NEW.weight_kg / POWER(NEW.height_cm/100, 2), 2);
    END IF;
END$$

-- 2. Auto BMI Update
DROP TRIGGER IF EXISTS trg_CalculateBMIUpdate$$
CREATE TRIGGER trg_CalculateBMIUpdate 
BEFORE UPDATE ON patient_vitals
FOR EACH ROW
BEGIN
    IF NEW.height_cm IS NOT NULL AND NEW.height_cm > 0 
       AND NEW.weight_kg IS NOT NULL THEN
        SET NEW.bmi = ROUND(NEW.weight_kg / POWER(NEW.height_cm/100, 2), 2);
    END IF;
END$$

-- 3. Update Patient Stats on Appointment
DROP TRIGGER IF EXISTS trg_UpdatePatientLastVisit$$
CREATE TRIGGER trg_UpdatePatientLastVisit 
AFTER UPDATE ON appointments
FOR EACH ROW
BEGIN
    IF NEW.status IN ('completed','in-progress') 
       AND (OLD.status NOT IN ('completed','in-progress') OR OLD.status IS NULL) THEN
        CALL sp_update_patient_stats(NEW.patient_id);
    END IF;
END$$

-- 4. Update Stats on New Bill
DROP TRIGGER IF EXISTS trg_UpdatePatientBilling$$
CREATE TRIGGER trg_UpdatePatientBilling 
AFTER INSERT ON bills
FOR EACH ROW
BEGIN
    CALL sp_update_patient_stats(NEW.patient_id);
END$$

-- 5. Update Stats on Bill Change
DROP TRIGGER IF EXISTS trg_UpdatePatientBillingUpdate$$
CREATE TRIGGER trg_UpdatePatientBillingUpdate 
AFTER UPDATE ON bills
FOR EACH ROW
BEGIN
    IF OLD.total_amount != NEW.total_amount 
       OR OLD.balance_due != NEW.balance_due THEN
        CALL sp_update_patient_stats(NEW.patient_id);
    END IF;
END$$

-- 6. Bill Total on Item Insert
DROP TRIGGER IF EXISTS trg_UpdateBillTotals$$
CREATE TRIGGER trg_UpdateBillTotals 
AFTER INSERT ON bill_items
FOR EACH ROW
BEGIN
    UPDATE bills b SET
        subtotal = (SELECT COALESCE(SUM(total_price),0) FROM bill_items WHERE bill_id = NEW.bill_id),
        total_amount = (SELECT COALESCE(SUM(total_price),0) FROM bill_items WHERE bill_id = NEW.bill_id),
        balance_due = (SELECT COALESCE(SUM(total_price),0) FROM bill_items WHERE bill_id = NEW.bill_id) - b.amount_paid
    WHERE b.id = NEW.bill_id;
END$$

-- 7. Bill Total on Item Update
DROP TRIGGER IF EXISTS trg_UpdateBillTotalsUpdate$$
CREATE TRIGGER trg_UpdateBillTotalsUpdate 
AFTER UPDATE ON bill_items
FOR EACH ROW
BEGIN
    UPDATE bills b SET
        subtotal = (SELECT COALESCE(SUM(total_price),0) FROM bill_items WHERE bill_id = NEW.bill_id),
        total_amount = (SELECT COALESCE(SUM(total_price),0) FROM bill_items WHERE bill_id = NEW.bill_id),
        balance_due = (SELECT COALESCE(SUM(total_price),0) FROM bill_items WHERE bill_id = NEW.bill_id) - b.amount_paid
    WHERE b.id = NEW.bill_id;
END$$

-- 8. Bill Total on Item Delete
DROP TRIGGER IF EXISTS trg_UpdateBillTotalsDelete$$
CREATE TRIGGER trg_UpdateBillTotalsDelete 
AFTER DELETE ON bill_items
FOR EACH ROW
BEGIN
    UPDATE bills b SET
        subtotal = (SELECT COALESCE(SUM(total_price),0) FROM bill_items WHERE bill_id = OLD.bill_id),
        total_amount = (SELECT COALESCE(SUM(total_price),0) FROM bill_items WHERE bill_id = OLD.bill_id),
        balance_due = (SELECT COALESCE(SUM(total_price),0) FROM bill_items WHERE bill_id = OLD.bill_id) - b.amount_paid
    WHERE b.id = OLD.bill_id;
END$$

-- 9. Medicine Usage Count
DROP TRIGGER IF EXISTS trg_UpdateMedicineUsage$$
CREATE TRIGGER trg_UpdateMedicineUsage 
AFTER INSERT ON prescription_items
FOR EACH ROW
BEGIN
    IF NEW.medicine_id IS NOT NULL THEN
        UPDATE medicines 
        SET usage_count = usage_count + 1,
            last_used_at = NOW()
        WHERE id = NEW.medicine_id;
    END IF;
END$$

-- 10. Auto Queue Token
DROP TRIGGER IF EXISTS trg_GenerateQueueToken$$
CREATE TRIGGER trg_GenerateQueueToken 
BEFORE INSERT ON queue
FOR EACH ROW
BEGIN
    IF NEW.token_number IS NULL OR NEW.token_number = '' THEN
        SET NEW.token_number = CONCAT(
            'T',
            DATE_FORMAT(NEW.check_in_date, '%y%m%d'),
            LPAD(
                (SELECT COALESCE(MAX(CAST(SUBSTRING(token_number, 8) AS UNSIGNED)), 0) + 1
                 FROM queue
                 WHERE check_in_date = NEW.check_in_date
                   AND doctor_id = NEW.doctor_id),
                3, '0'
            )
        );
    END IF;
END$$

-- 11. ICD Usage Count
DROP TRIGGER IF EXISTS trg_UpdateICDUsage$$
CREATE TRIGGER trg_UpdateICDUsage 
AFTER INSERT ON prescriptions
FOR EACH ROW
BEGIN
    IF NEW.diagnosis_icd_code IS NOT NULL THEN
        UPDATE icd_codes 
        SET usage_count = usage_count + 1
        WHERE icd_code = NEW.diagnosis_icd_code;
    END IF;
END$$

-- 12. Appointment Status History
DROP TRIGGER IF EXISTS trg_LogAppointmentStatus$$
CREATE TRIGGER trg_LogAppointmentStatus 
AFTER UPDATE ON appointments
FOR EACH ROW
BEGIN
    IF OLD.status != NEW.status THEN
        INSERT INTO appointment_status_history (
            appointment_id, old_status, new_status, created_at
        ) VALUES (
            NEW.id, OLD.status, NEW.status, NOW()
        );
    END IF;
END$$

DELIMITER ;

-- ========================================================================
-- SECTION 4: PERFORMANCE INDEXES (30+ Critical Indexes)
-- ========================================================================
USE patient_management;
SET FOREIGN_KEY_CHECKS = 0;

-- Patient Indexes
CREATE INDEX idx_patients_search_fast ON patients(name(50), phone(15), patient_id);
CREATE INDEX idx_patients_clinic_active_date ON patients(clinic_id, deleted_at, registered_date);
CREATE INDEX idx_patients_name_clinic ON patients(clinic_id, name(30));
CREATE INDEX idx_patients_phone_clinic ON patients(clinic_id, phone);
CREATE INDEX idx_patients_email_clinic ON patients(clinic_id, email);
CREATE INDEX idx_patients_vip ON patients(is_vip, vip_tier);
CREATE INDEX idx_patients_outstanding ON patients(outstanding_balance);

-- Appointment Indexes
CREATE INDEX idx_appt_dashboard ON appointments(clinic_id, appointment_date, status, doctor_id);
CREATE INDEX idx_appt_doctor_date_status ON appointments(doctor_id, appointment_date, status);
CREATE INDEX idx_appt_today ON appointments(appointment_date, clinic_id, status);
CREATE INDEX idx_appt_payment_status ON appointments(payment_status, clinic_id);
CREATE INDEX idx_appt_priority_date ON appointments(priority, appointment_date, status);

-- Queue Indexes
CREATE INDEX idx_queue_active_lookup ON queue(doctor_id, clinic_id, status, priority, check_in_time);
CREATE INDEX idx_queue_daily_status ON queue(check_in_date, doctor_id, status);
CREATE INDEX idx_queue_token_search ON queue(token_number, check_in_date);

-- Bill Indexes
CREATE INDEX idx_bills_clinic_date_status ON bills(clinic_id, bill_date, payment_status);
CREATE INDEX idx_bills_outstanding_fast ON bills(clinic_id, balance_due, bill_date);
CREATE INDEX idx_bills_patient_date ON bills(patient_id, bill_date);
CREATE INDEX idx_bills_doctor_date ON bills(doctor_id, bill_date);
CREATE INDEX idx_bills_payment_method ON bills(payment_method, bill_date);
CREATE INDEX idx_bills_revenue_tracking ON bills(clinic_id, bill_date, total_amount);
CREATE INDEX idx_bill_payments_date ON bill_payments(payment_date, bill_id);

-- Prescription Indexes
CREATE INDEX idx_prescriptions_recent ON prescriptions(clinic_id, doctor_id, prescribed_date);
CREATE INDEX idx_prescriptions_patient_date ON prescriptions(patient_id, prescribed_date);
CREATE INDEX idx_prescriptions_icd ON prescriptions(diagnosis_icd_code, prescribed_date);
CREATE INDEX idx_prescriptions_status ON prescriptions(status, clinic_id);

-- Vitals Indexes
CREATE INDEX idx_patient_vitals_latest ON patient_vitals(patient_id, recorded_at);
CREATE INDEX idx_patient_vitals_date_range ON patient_vitals(patient_id, recorded_at);

-- Lab Indexes
CREATE INDEX idx_lab_clinic_date_status ON lab_investigations(clinic_id, ordered_date, status);
CREATE INDEX idx_lab_patient_date ON lab_investigations(patient_id, ordered_date);
CREATE INDEX idx_lab_doctor_date ON lab_investigations(doctor_id, ordered_date);
CREATE INDEX idx_lab_status_pending ON lab_investigations(status, ordered_date);

-- Admission Indexes
CREATE INDEX idx_admissions_active_lookup ON patient_admissions(clinic_id, status, admission_date);
CREATE INDEX idx_admissions_patient ON patient_admissions(patient_id, admission_date);
CREATE INDEX idx_admissions_doctor ON patient_admissions(doctor_id, admission_date);
CREATE INDEX idx_admissions_room ON patient_admissions(room_id, status);

-- Medicine/ICD Indexes
CREATE INDEX idx_medicines_search_fast ON medicines(name(50), generic_name(50), brand(50));
CREATE INDEX idx_medicines_active_usage ON medicines(is_active, usage_count);
CREATE INDEX idx_medicines_category_active ON medicines(category, is_active);
CREATE INDEX idx_icd_search_fast ON icd_codes(icd_code, primary_description(100));
CREATE INDEX idx_icd_usage ON icd_codes(usage_count, status);

-- Allergy/Chronic Indexes
CREATE INDEX idx_patient_allergies_active ON patient_allergies(patient_id, is_active, severity);
CREATE INDEX idx_patient_chronic_active ON patient_chronic_conditions(patient_id, status);

-- System Indexes
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read, created_at);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity, entity_id, created_at);
CREATE INDEX idx_audit_logs_user_date ON audit_logs(user_id, created_at);
CREATE INDEX idx_appt_revenue_tracking ON appointments(clinic_id, appointment_date, consultation_fee);





-- Full patient search (name, phone, patient_id)
ALTER TABLE patients 
ADD FULLTEXT ft_patient_full_search (name, phone, patient_id);

-- Optional: separate one focused on name only (higher relevance for name searches)
ALTER TABLE patients 
ADD FULLTEXT ft_patient_name (name);

-- Medicines search
ALTER TABLE medicines 
ADD FULLTEXT ft_medicine_search (name, generic_name, brand);

-- ICD diagnosis search
ALTER TABLE icd_codes 
ADD FULLTEXT ft_icd_search (primary_description, short_description, icd_code);

ALTER TABLE patients 
ADD FULLTEXT ft_patient_full_search (name, phone, patient_id);

ALTER TABLE medicines 
ADD FULLTEXT ft_medicine_search (name, generic_name, brand);

ALTER TABLE icd_codes 
ADD FULLTEXT ft_icd_search (primary_description, short_description, icd_code);

-- Then re-analyze
ANALYZE TABLE patients, medicines, icd_codes;

SET FOREIGN_KEY_CHECKS = 1;