config/db/patient_management.sql config/db/CORRECTED_PROCEDURES.sql-- ========================================================================
-- PART 1: CORE SCHEMA (Clinics, Users, ABHA, Patients)
-- MariaDB 10.6+ Compatible
-- 
-- LIVE DATABASE CHANGES APPLIED:
-- 1. Added visit_status ENUM('with_staff','unbilled','billed') to queue table
-- 2. Updated queue table defaults for priority, status, check_in_time
-- 3. Updated patients table defaults for VIP, billing, visits
-- 4. Updated bills table defaults for payment amounts and status
-- ========================================================================

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET FOREIGN_KEY_CHECKS = 0;
SET time_zone = "+00:00";

CREATE DATABASE IF NOT EXISTS patient_management
  DEFAULT CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE patient_management;

-- =========================
-- SEQUENCES
-- =========================
DROP TABLE IF EXISTS admission_sequences;
DROP TABLE IF EXISTS bill_sequences;

CREATE TABLE bill_sequences (
  clinic_id INT NOT NULL,
  seq_year INT NOT NULL,
  last_no INT NOT NULL DEFAULT 0,
  PRIMARY KEY (clinic_id, seq_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE admission_sequences (
  clinic_id INT NOT NULL,
  seq_year INT NOT NULL,
  last_no INT NOT NULL DEFAULT 0,
  PRIMARY KEY (clinic_id, seq_year)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- CLINICS
-- =========================
DROP TABLE IF EXISTS user_sessions;
DROP TABLE IF EXISTS sub_admin_permissions;
DROP TABLE IF EXISTS doctor_staff;
DROP TABLE IF EXISTS clinic_staff;
DROP TABLE IF EXISTS doctors;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS clinics;

CREATE TABLE clinics (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) DEFAULT NULL,
  address TEXT DEFAULT NULL,
  city VARCHAR(100) DEFAULT NULL,
  state VARCHAR(100) DEFAULT NULL,
  pincode VARCHAR(20) DEFAULT NULL,
  country VARCHAR(100) DEFAULT 'India',
  phone VARCHAR(20) DEFAULT NULL,
  alternate_phone VARCHAR(20) DEFAULT NULL,
  email VARCHAR(255) DEFAULT NULL,
  website VARCHAR(255) DEFAULT NULL,
  logo_url VARCHAR(500) DEFAULT NULL,
  header_image LONGTEXT DEFAULT NULL,
  footer_image LONGTEXT DEFAULT NULL,
  registration_number VARCHAR(100) DEFAULT NULL,
  gstin VARCHAR(20) DEFAULT NULL,
  pan_number VARCHAR(20) DEFAULT NULL,
  timezone VARCHAR(50) DEFAULT 'Asia/Kolkata',
  currency VARCHAR(10) DEFAULT 'INR',
  date_format VARCHAR(20) DEFAULT 'DD/MM/YYYY',
  time_format VARCHAR(10) DEFAULT '12h',
  is_active TINYINT(1) DEFAULT 1,
  subscription_type ENUM('free','basic','premium','enterprise') DEFAULT 'free',
  subscription_expires_at DATE DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_clinics_code (code),
  UNIQUE KEY uk_clinics_email (email),
  KEY idx_clinics_city (city),
  KEY idx_clinics_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- USERS
-- =========================
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  password VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  profile_image VARCHAR(500) DEFAULT NULL,
  role ENUM('super_admin','admin','doctor','staff','sub_admin','receptionist','nurse','lab_tech','pharmacist')
    NOT NULL DEFAULT 'staff',
  clinic_id INT NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  email_verified_at TIMESTAMP NULL DEFAULT NULL,
  last_login TIMESTAMP NULL DEFAULT NULL,
  last_login_ip VARCHAR(45) DEFAULT NULL,
  failed_login_attempts INT DEFAULT 0,
  locked_until TIMESTAMP NULL DEFAULT NULL,
  password_reset_token VARCHAR(255) DEFAULT NULL,
  password_reset_expires TIMESTAMP NULL DEFAULT NULL,
  two_factor_enabled TINYINT(1) DEFAULT 0,
  two_factor_secret VARCHAR(255) DEFAULT NULL,
  preferences JSON DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  UNIQUE KEY uk_users_email (email),
  KEY idx_users_phone (phone),
  KEY idx_users_role (role),
  KEY idx_users_clinic (clinic_id),
  KEY idx_users_active (is_active, deleted_at),
  CONSTRAINT fk_users_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- DOCTORS
-- =========================
CREATE TABLE doctors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  clinic_id INT NOT NULL,
  specialization VARCHAR(100) DEFAULT NULL,
  sub_specialization VARCHAR(100) DEFAULT NULL,
  qualification VARCHAR(255) DEFAULT NULL,
  license_number VARCHAR(100) DEFAULT NULL,
  medical_council VARCHAR(100) DEFAULT NULL,
  experience_years INT DEFAULT 0,
  consultation_fee DECIMAL(12,2) DEFAULT NULL,
  followup_fee DECIMAL(12,2) DEFAULT NULL,
  online_consultation_fee DECIMAL(12,2) DEFAULT NULL,
  emergency_fee DECIMAL(12,2) DEFAULT NULL,
  available_from TIME DEFAULT NULL,
  available_to TIME DEFAULT NULL,
  max_patients_per_day INT DEFAULT 40,
  slot_duration_minutes INT DEFAULT 15,
  slot_buffer_minutes INT DEFAULT 5,
  available_days JSON DEFAULT NULL,
  available_time_slots JSON DEFAULT NULL,
  signature_image LONGTEXT DEFAULT NULL,
  prescription_header LONGTEXT DEFAULT NULL,
  prescription_footer LONGTEXT DEFAULT NULL,
  eka_credits DECIMAL(12,2) DEFAULT 0.00,
  status ENUM('active','inactive','on_leave','suspended') DEFAULT 'active',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_doctors_user (user_id),
  UNIQUE KEY uk_doctors_license (license_number),
  KEY idx_doctors_spec (specialization),
  KEY idx_doctors_clinic (clinic_id),
  KEY idx_doctors_status (status),
  CONSTRAINT fk_doctors_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_doctors_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- CLINIC STAFF
-- =========================
CREATE TABLE clinic_staff (
  id INT AUTO_INCREMENT PRIMARY KEY,
  clinic_id INT NOT NULL,
  user_id INT NOT NULL,
  role ENUM('receptionist','nurse','admin','doctor','lab_tech','pharmacist','accountant','manager')
    DEFAULT 'receptionist',
  department VARCHAR(100) DEFAULT NULL,
  is_primary TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_clinic_staff (clinic_id, user_id),
  KEY idx_clinic_staff_clinic (clinic_id),
  KEY idx_clinic_staff_user (user_id),
  CONSTRAINT fk_clinicstaff_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_clinicstaff_user FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- DOCTOR STAFF
-- =========================
CREATE TABLE doctor_staff (
  id INT AUTO_INCREMENT PRIMARY KEY,
  doctor_id INT NOT NULL,
  staff_user_id INT NOT NULL,
  role ENUM('nurse','assistant','technician','receptionist','other') DEFAULT 'assistant',
  can_view_patients TINYINT(1) DEFAULT 1,
  can_create_appointments TINYINT(1) DEFAULT 1,
  can_view_prescriptions TINYINT(1) DEFAULT 1,
  can_create_prescriptions TINYINT(1) DEFAULT 0,
  can_view_billing TINYINT(1) DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_doctor_staff (doctor_id, staff_user_id),
  CONSTRAINT fk_doctorstaff_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
  CONSTRAINT fk_doctorstaff_user  FOREIGN KEY (staff_user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- SUB-ADMIN PERMISSIONS
-- =========================
CREATE TABLE sub_admin_permissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  can_manage_patients TINYINT(1) DEFAULT 0,
  can_view_patient_history TINYINT(1) DEFAULT 0,
  can_delete_patients TINYINT(1) DEFAULT 0,
  can_manage_appointments TINYINT(1) DEFAULT 0,
  can_cancel_appointments TINYINT(1) DEFAULT 0,
  can_manage_billing TINYINT(1) DEFAULT 0,
  can_give_discounts TINYINT(1) DEFAULT 0,
  can_process_refunds TINYINT(1) DEFAULT 0,
  max_discount_percent DECIMAL(5,2) DEFAULT 0,
  can_view_reports TINYINT(1) DEFAULT 0,
  can_export_reports TINYINT(1) DEFAULT 0,
  can_manage_staff TINYINT(1) DEFAULT 0,
  can_manage_settings TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_subadmin_user (user_id),
  CONSTRAINT fk_subadmin_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- USER SESSIONS
-- =========================
CREATE TABLE user_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  session_token VARCHAR(255) NOT NULL,
  refresh_token VARCHAR(255) DEFAULT NULL,
  device_type VARCHAR(50) DEFAULT NULL,
  device_name VARCHAR(255) DEFAULT NULL,
  browser VARCHAR(100) DEFAULT NULL,
  os VARCHAR(100) DEFAULT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1,
  last_activity TIMESTAMP NULL DEFAULT NULL,
  expires_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_session_token (session_token),
  KEY idx_user_sessions (user_id, is_active),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Link sequences to clinics
ALTER TABLE bill_sequences
  ADD CONSTRAINT fk_bill_seq_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;
ALTER TABLE admission_sequences
  ADD CONSTRAINT fk_adm_seq_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE;

-- =========================
-- ABHA ACCOUNTS
-- =========================
DROP TABLE IF EXISTS patient_documents;
DROP TABLE IF EXISTS patient_tags;
DROP TABLE IF EXISTS patients;
DROP TABLE IF EXISTS abha_meta;
DROP TABLE IF EXISTS abha_api_logs;
DROP TABLE IF EXISTS abha_login_sessions;
DROP TABLE IF EXISTS abha_registration_sessions;
DROP TABLE IF EXISTS abha_consent_requests;
DROP TABLE IF EXISTS abha_accounts;

CREATE TABLE abha_accounts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  abha_number VARCHAR(17) NOT NULL,
  abha_address VARCHAR(255) DEFAULT NULL,
  health_id VARCHAR(255) DEFAULT NULL,
  name VARCHAR(255) DEFAULT NULL,
  first_name VARCHAR(100) DEFAULT NULL,
  middle_name VARCHAR(100) DEFAULT NULL,
  last_name VARCHAR(100) DEFAULT NULL,
  gender ENUM('M','F','O','U') DEFAULT NULL,
  date_of_birth DATE DEFAULT NULL,
  year_of_birth YEAR DEFAULT NULL,
  month_of_birth TINYINT DEFAULT NULL,
  day_of_birth TINYINT DEFAULT NULL,
  mobile VARCHAR(15) DEFAULT NULL,
  email VARCHAR(255) DEFAULT NULL,
  address_line TEXT DEFAULT NULL,
  village VARCHAR(100) DEFAULT NULL,
  town VARCHAR(100) DEFAULT NULL,
  district VARCHAR(100) DEFAULT NULL,
  district_code VARCHAR(10) DEFAULT NULL,
  state VARCHAR(100) DEFAULT NULL,
  state_code VARCHAR(10) DEFAULT NULL,
  pincode VARCHAR(10) DEFAULT NULL,
  profile_photo LONGTEXT DEFAULT NULL,
  kyc_verified TINYINT(1) DEFAULT 0,
  kyc_type ENUM('aadhaar','driving_license','passport','pan','other') DEFAULT NULL,
  aadhaar_verified TINYINT(1) DEFAULT 0,
  mobile_verified TINYINT(1) DEFAULT 0,
  email_verified TINYINT(1) DEFAULT 0,
  verification_status ENUM('pending','verified','rejected','expired') DEFAULT 'pending',
  verification_date TIMESTAMP NULL DEFAULT NULL,
  status ENUM('active','inactive','deactivated','suspended') DEFAULT 'active',
  abdm_access_token TEXT DEFAULT NULL,
  abdm_refresh_token TEXT DEFAULT NULL,
  token_expires_at TIMESTAMP NULL DEFAULT NULL,
  linked_hip_ids JSON DEFAULT NULL,
  linked_hiu_ids JSON DEFAULT NULL,
  registered_at TIMESTAMP NULL DEFAULT NULL,
  last_synced_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_abha_number (abha_number),
  UNIQUE KEY uk_abha_address (abha_address),
  KEY idx_abha_mobile (mobile),
  KEY idx_abha_email (email),
  KEY idx_abha_status (status),
  KEY idx_abha_verification (verification_status),
  KEY idx_state_district (state_code, district_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE abha_consent_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  abha_account_id INT DEFAULT NULL,
  consent_request_id VARCHAR(100) DEFAULT NULL,
  consent_id VARCHAR(100) DEFAULT NULL,
  abha_address VARCHAR(255) DEFAULT NULL,
  requester_name VARCHAR(255) DEFAULT NULL,
  requester_id VARCHAR(100) DEFAULT NULL,
  purpose_code VARCHAR(50) DEFAULT NULL,
  purpose_text VARCHAR(255) DEFAULT NULL,
  hi_types JSON DEFAULT NULL,
  date_range_from DATE DEFAULT NULL,
  date_range_to DATE DEFAULT NULL,
  data_erasure_at TIMESTAMP NULL DEFAULT NULL,
  status ENUM('requested','granted','denied','revoked','expired') DEFAULT 'requested',
  requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  granted_at TIMESTAMP NULL DEFAULT NULL,
  denied_at TIMESTAMP NULL DEFAULT NULL,
  revoked_at TIMESTAMP NULL DEFAULT NULL,
  expires_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_consent_request_id (consent_request_id),
  KEY idx_consent_abha (abha_account_id),
  KEY idx_consent_status (status),
  CONSTRAINT fk_acr_abha FOREIGN KEY (abha_account_id) REFERENCES abha_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE abha_registration_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(255) NOT NULL,
  txn_id VARCHAR(255) DEFAULT NULL,
  registration_type ENUM('aadhaar','mobile','email','driving_license') DEFAULT 'aadhaar',
  aadhaar_number_masked VARCHAR(16) DEFAULT NULL,
  mobile_number VARCHAR(15) DEFAULT NULL,
  email_address VARCHAR(255) DEFAULT NULL,
  otp_sent_at TIMESTAMP NULL DEFAULT NULL,
  otp_verified_at TIMESTAMP NULL DEFAULT NULL,
  otp_attempts INT DEFAULT 0,
  status ENUM('initiated','otp_sent','otp_verified','profile_fetched','abha_created','completed','failed','expired')
    DEFAULT 'initiated',
  current_step VARCHAR(50) DEFAULT NULL,
  created_abha_number VARCHAR(17) DEFAULT NULL,
  created_abha_address VARCHAR(255) DEFAULT NULL,
  request_data JSON DEFAULT NULL,
  response_data JSON DEFAULT NULL,
  error_message TEXT DEFAULT NULL,
  error_code VARCHAR(50) DEFAULT NULL,
  expires_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_reg_session (session_id),
  KEY idx_reg_txn (txn_id),
  KEY idx_reg_status (status),
  KEY idx_reg_mobile (mobile_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE abha_login_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  abha_account_id INT DEFAULT NULL,
  abha_number VARCHAR(17) DEFAULT NULL,
  abha_address VARCHAR(255) DEFAULT NULL,
  session_id VARCHAR(255) NOT NULL,
  txn_id VARCHAR(255) DEFAULT NULL,
  auth_method ENUM('aadhaar_otp','mobile_otp','password','demographics','biometric') DEFAULT 'mobile_otp',
  otp_sent_at TIMESTAMP NULL DEFAULT NULL,
  otp_verified_at TIMESTAMP NULL DEFAULT NULL,
  otp_attempts INT DEFAULT 0,
  status ENUM('initiated','otp_sent','authenticated','failed','expired') DEFAULT 'initiated',
  request_data JSON DEFAULT NULL,
  response_data JSON DEFAULT NULL,
  error_message TEXT DEFAULT NULL,
  expires_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_login_session (session_id),
  KEY idx_login_abha (abha_account_id),
  KEY idx_login_status (status),
  CONSTRAINT fk_abha_login_account FOREIGN KEY (abha_account_id) REFERENCES abha_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE abha_api_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  abha_account_id INT DEFAULT NULL,
  session_id VARCHAR(255) DEFAULT NULL,
  api_endpoint VARCHAR(500) NOT NULL,
  http_method VARCHAR(10) NOT NULL,
  request_headers JSON DEFAULT NULL,
  request_body JSON DEFAULT NULL,
  response_status INT DEFAULT NULL,
  response_headers JSON DEFAULT NULL,
  response_body JSON DEFAULT NULL,
  response_time_ms INT DEFAULT NULL,
  is_error TINYINT(1) DEFAULT 0,
  error_message TEXT DEFAULT NULL,
  error_code VARCHAR(50) DEFAULT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  user_agent TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_abha_log_account (abha_account_id),
  CONSTRAINT fk_abha_api_logs_account FOREIGN KEY (abha_account_id) REFERENCES abha_accounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE abha_meta (
  id INT AUTO_INCREMENT PRIMARY KEY,
  meta_key VARCHAR(100) NOT NULL,
  meta_value TEXT DEFAULT NULL,
  meta_type ENUM('string','json','encrypted') DEFAULT 'string',
  description VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_abha_meta_key (meta_key)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- PATIENTS
-- =========================
CREATE TABLE patients (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) DEFAULT NULL,
  phone VARCHAR(20) DEFAULT NULL,
  alternate_phone VARCHAR(20) DEFAULT NULL,
  abha_account_id INT DEFAULT NULL,
  dob DATE DEFAULT NULL,
  age_years INT DEFAULT NULL,
  age_months INT DEFAULT NULL,
  gender ENUM('M','F','O','U') DEFAULT NULL,
  marital_status ENUM('Single','Married','Divorced','Widowed','Separated','Other') DEFAULT NULL,
  occupation VARCHAR(100) DEFAULT NULL,
  education VARCHAR(100) DEFAULT NULL,
  blood_group ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-','Unknown') DEFAULT NULL,
  address TEXT DEFAULT NULL,
  landmark VARCHAR(255) DEFAULT NULL,
  city VARCHAR(100) DEFAULT NULL,
  district VARCHAR(100) DEFAULT NULL,
  state VARCHAR(100) DEFAULT NULL,
  pincode VARCHAR(20) DEFAULT NULL,
  country VARCHAR(100) DEFAULT 'India',
  emergency_contact_name VARCHAR(255) DEFAULT NULL,
  emergency_contact_phone VARCHAR(20) DEFAULT NULL,
  emergency_contact_relation VARCHAR(50) DEFAULT NULL,
  medical_conditions TEXT DEFAULT NULL,
  allergies TEXT DEFAULT NULL,
  current_medications TEXT DEFAULT NULL,
  aadhaar_number_masked VARCHAR(16) DEFAULT NULL,
  id_proof_type VARCHAR(50) DEFAULT NULL,
  id_proof_number VARCHAR(50) DEFAULT NULL,
  is_vip TINYINT(1) DEFAULT 0,
  vip_tier ENUM('Bronze','Silver','Gold','Platinum') DEFAULT NULL,
  vip_notes TEXT DEFAULT NULL,
  priority INT DEFAULT 0,
  clinic_id INT NOT NULL,
  primary_doctor_id INT DEFAULT NULL,
  referral_source VARCHAR(255) DEFAULT NULL,
  referral_doctor VARCHAR(255) DEFAULT NULL,
  last_visit_date DATE DEFAULT NULL,
  total_visits INT DEFAULT 0,
  total_billing DECIMAL(12,2) DEFAULT 0.00,
  outstanding_balance DECIMAL(12,2) DEFAULT 0.00,
  created_by INT DEFAULT NULL,
  updated_by INT DEFAULT NULL,
  registered_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  UNIQUE KEY uk_patient_id (patient_id),
  KEY idx_patients_phone (phone),
  KEY idx_patients_name (name),
  KEY idx_patients_email (email),
  KEY idx_patients_city (city),
  KEY idx_patients_clinic (clinic_id),
  KEY idx_abha (abha_account_id),
  CONSTRAINT fk_patients_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT fk_patients_abha FOREIGN KEY (abha_account_id) REFERENCES abha_accounts(id) ON DELETE SET NULL,
  CONSTRAINT fk_patients_primary_doctor FOREIGN KEY (primary_doctor_id) REFERENCES doctors(id) ON DELETE SET NULL,
  CONSTRAINT fk_patients_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE patient_tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  tag_name VARCHAR(100) NOT NULL,
  tag_category VARCHAR(100) DEFAULT 'general',
  color_code VARCHAR(10) DEFAULT '#3B82F6',
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_patient_tag (patient_id, tag_name),
  CONSTRAINT fk_patient_tags_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_patient_tags_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE patient_documents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  document_type ENUM('id_proof','insurance','medical_report','prescription','lab_report','imaging','consent','other')
    DEFAULT 'other',
  document_name VARCHAR(255) NOT NULL,
  description TEXT DEFAULT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) DEFAULT NULL,
  file_size INT DEFAULT NULL,
  mime_type VARCHAR(100) DEFAULT NULL,
  source ENUM('upload','scan','abdm','generated') DEFAULT 'upload',
  document_date DATE DEFAULT NULL,
  expiry_date DATE DEFAULT NULL,
  tags JSON DEFAULT NULL,
  is_public TINYINT(1) DEFAULT 0,
  shared_with_abdm TINYINT(1) DEFAULT 0,
  uploaded_by INT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_patient_docs_patient (patient_id),
  CONSTRAINT fk_patient_docs_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_patient_docs_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================================================
-- PART 2: ICD-10, ICD-11, SNOMED, MEDICINES, DOSAGE REFERENCES
-- MariaDB 10.6+ Compatible
-- ========================================================================

USE patient_management;
SET FOREIGN_KEY_CHECKS = 0;

-- Drop all ICD/SNOMED/Medicine tables
DROP TABLE IF EXISTS tb_treatment_guidelines;
DROP TABLE IF EXISTS diagnosis_medication_mapping;
DROP TABLE IF EXISTS symptom_medication_mapping;
DROP TABLE IF EXISTS dosage_adjustments;
DROP TABLE IF EXISTS medication_allergies;
DROP TABLE IF EXISTS drug_interactions;
DROP TABLE IF EXISTS dosage_references;
DROP TABLE IF EXISTS medicines;

DROP TABLE IF EXISTS snomed_crossreferences;
DROP TABLE IF EXISTS snomed_dosage_mapping;
DROP TABLE IF EXISTS snomed_drug_attributes;
DROP TABLE IF EXISTS snomed_procedures;
DROP TABLE IF EXISTS snomed_medications;
DROP TABLE IF EXISTS snomed_clinical_findings;
DROP TABLE IF EXISTS snomed_refsets;
DROP TABLE IF EXISTS snomed_relationships;
DROP TABLE IF EXISTS snomed_descriptions;
DROP TABLE IF EXISTS snomed_concepts;

DROP TABLE IF EXISTS icd11_search_cache;
DROP TABLE IF EXISTS icd11_medication_mapping;
DROP TABLE IF EXISTS icd11_codes;
DROP TABLE IF EXISTS icd11_blocks;
DROP TABLE IF EXISTS icd11_chapters;

DROP TABLE IF EXISTS icd_search_cache;
DROP TABLE IF EXISTS icd_medication_mapping;
DROP TABLE IF EXISTS icd_codes;
DROP TABLE IF EXISTS icd_groups;
DROP TABLE IF EXISTS icd_chapters;

-- =========================
-- ICD-10
-- =========================
CREATE TABLE icd_chapters (
  id INT AUTO_INCREMENT PRIMARY KEY,
  chapter_code VARCHAR(10) NOT NULL,
  chapter_number INT DEFAULT NULL,
  chapter_title TEXT NOT NULL,
  description TEXT DEFAULT NULL,
  code_range_start VARCHAR(10) DEFAULT NULL,
  code_range_end VARCHAR(10) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_chapter_code (chapter_code),
  KEY idx_icd_chapters_chapter_number (chapter_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE icd_groups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_code VARCHAR(20) NOT NULL,
  group_description TEXT NOT NULL,
  chapter_code VARCHAR(10) DEFAULT NULL,
  code_range_start VARCHAR(10) DEFAULT NULL,
  code_range_end VARCHAR(10) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_group_code (group_code),
  KEY idx_icd_groups_group_chapter (chapter_code),
  CONSTRAINT fk_icd_groups_chapter
    FOREIGN KEY (chapter_code) REFERENCES icd_chapters(chapter_code) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE icd_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  icd_code VARCHAR(20) NOT NULL,
  icd_code_formatted VARCHAR(20) DEFAULT NULL,
  parent_code VARCHAR(20) DEFAULT NULL,
  level INT DEFAULT 1,
  code_type ENUM('category','subcategory','code','extension') DEFAULT 'code',
  primary_description TEXT NOT NULL,
  secondary_description TEXT DEFAULT NULL,
  short_description VARCHAR(255) DEFAULT NULL,
  chapter_code VARCHAR(10) DEFAULT NULL,
  group_code VARCHAR(20) DEFAULT NULL,
  category_code VARCHAR(10) DEFAULT NULL,
  status ENUM('active','deprecated','replaced') DEFAULT 'active',
  billable TINYINT(1) DEFAULT 1,
  usage_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_icd_code (icd_code),
  KEY idx_icd_codes_parent (parent_code),
  KEY idx_icd_codes_chapter (chapter_code),
  KEY idx_icd_codes_group (group_code),
  KEY idx_icd_codes_status (status),
  KEY idx_icd_codes_billable (billable),
  KEY idx_icd_codes_usage (usage_count),
  FULLTEXT KEY ft_icd_codes_description (primary_description, secondary_description, short_description),
  CONSTRAINT fk_icd_codes_chapter
    FOREIGN KEY (chapter_code) REFERENCES icd_chapters(chapter_code) ON DELETE SET NULL,
  CONSTRAINT fk_icd_codes_group
    FOREIGN KEY (group_code) REFERENCES icd_groups(group_code) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE icd_medication_mapping (
  id INT AUTO_INCREMENT PRIMARY KEY,
  icd_code VARCHAR(20) NOT NULL,
  medication_name VARCHAR(255) NOT NULL,
  generic_name VARCHAR(255) DEFAULT NULL,
  dosage_form VARCHAR(100) DEFAULT NULL,
  strength VARCHAR(100) DEFAULT NULL,
  recommended_frequency VARCHAR(100) DEFAULT NULL,
  recommended_duration VARCHAR(100) DEFAULT NULL,
  recommended_route VARCHAR(50) DEFAULT NULL,
  indication TEXT DEFAULT NULL,
  contraindications TEXT DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  evidence_level ENUM('A','B','C','D','Expert') DEFAULT 'C',
  guideline_source VARCHAR(255) DEFAULT NULL,
  is_first_line TINYINT(1) DEFAULT 0,
  priority INT DEFAULT 10,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_icd_medication_mapping_icd (icd_code),
  KEY idx_icd_medication_mapping_med_name (medication_name),
  KEY idx_icd_medication_mapping_first_line (is_first_line, priority),
  CONSTRAINT fk_icd_med_code
    FOREIGN KEY (icd_code) REFERENCES icd_codes(icd_code) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE icd_search_cache (
  id INT AUTO_INCREMENT PRIMARY KEY,
  search_term VARCHAR(255) NOT NULL,
  icd_code VARCHAR(20) NOT NULL,
  relevance_score DECIMAL(5,2) DEFAULT 0,
  search_count INT DEFAULT 1,
  last_searched TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_icd_search_cache_search_code (search_term, icd_code),
  KEY idx_icd_search_cache_search_term (search_term),
  KEY idx_icd_search_cache_relevance (relevance_score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- ICD-11 (Same pattern)
-- =========================
CREATE TABLE icd11_chapters (
  id INT AUTO_INCREMENT PRIMARY KEY,
  chapter_code VARCHAR(10) NOT NULL,
  chapter_number INT DEFAULT NULL,
  chapter_title TEXT NOT NULL,
  description TEXT DEFAULT NULL,
  code_range_start VARCHAR(20) DEFAULT NULL,
  code_range_end VARCHAR(20) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_icd11_chapter_code (chapter_code),
  KEY idx_icd11_chapters_chapter_number (chapter_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE icd11_blocks (
  id INT AUTO_INCREMENT PRIMARY KEY,
  block_code VARCHAR(20) NOT NULL,
  block_title TEXT NOT NULL,
  chapter_code VARCHAR(10) DEFAULT NULL,
  code_range_start VARCHAR(20) DEFAULT NULL,
  code_range_end VARCHAR(20) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_icd11_block_code (block_code),
  KEY idx_icd11_blocks_block_chapter (chapter_code),
  CONSTRAINT fk_icd11_blocks_chapter
    FOREIGN KEY (chapter_code) REFERENCES icd11_chapters(chapter_code) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE icd11_codes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  icd11_code VARCHAR(20) NOT NULL,
  icd11_code_formatted VARCHAR(20) DEFAULT NULL,
  parent_code VARCHAR(20) DEFAULT NULL,
  level INT DEFAULT 1,
  code_type ENUM('chapter','block','category','subcategory','code','extension') DEFAULT 'code',
  preferred_label TEXT NOT NULL,
  full_title TEXT DEFAULT NULL,
  short_definition TEXT DEFAULT NULL,
  chapter_code VARCHAR(10) DEFAULT NULL,
  block_code VARCHAR(20) DEFAULT NULL,
  linearization VARCHAR(50) DEFAULT NULL,
  classification_status ENUM('active','deprecated','replaced','draft') DEFAULT 'active',
  billable TINYINT(1) DEFAULT 1,
  usage_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_icd11_code (icd11_code),
  KEY idx_icd11_codes_parent (parent_code),
  KEY idx_icd11_codes_chapter (chapter_code),
  KEY idx_icd11_codes_block (block_code),
  KEY idx_icd11_codes_status (classification_status),
  KEY idx_icd11_codes_billable (billable),
  KEY idx_icd11_codes_usage (usage_count),
  FULLTEXT KEY ft_icd11_codes_description (preferred_label, full_title, short_definition),
  CONSTRAINT fk_icd11_codes_chapter
    FOREIGN KEY (chapter_code) REFERENCES icd11_chapters(chapter_code) ON DELETE SET NULL,
  CONSTRAINT fk_icd11_codes_block
    FOREIGN KEY (block_code) REFERENCES icd11_blocks(block_code) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE icd11_medication_mapping (
  id INT AUTO_INCREMENT PRIMARY KEY,
  icd11_code VARCHAR(20) NOT NULL,
  medication_name VARCHAR(255) NOT NULL,
  generic_name VARCHAR(255) DEFAULT NULL,
  dosage_form VARCHAR(100) DEFAULT NULL,
  strength VARCHAR(100) DEFAULT NULL,
  recommended_frequency VARCHAR(100) DEFAULT NULL,
  recommended_duration VARCHAR(100) DEFAULT NULL,
  recommended_route VARCHAR(50) DEFAULT NULL,
  indication TEXT DEFAULT NULL,
  contraindications TEXT DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  evidence_level ENUM('A','B','C','D','Expert') DEFAULT 'C',
  guideline_source VARCHAR(255) DEFAULT NULL,
  is_first_line TINYINT(1) DEFAULT 0,
  priority INT DEFAULT 10,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_icd11_medication_mapping_icd11 (icd11_code),
  KEY idx_icd11_medication_mapping_med_name (medication_name),
  KEY idx_icd11_medication_mapping_first_line (is_first_line, priority),
  CONSTRAINT fk_icd11_med_code
    FOREIGN KEY (icd11_code) REFERENCES icd11_codes(icd11_code) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE icd11_search_cache (
  id INT AUTO_INCREMENT PRIMARY KEY,
  search_term VARCHAR(255) NOT NULL,
  icd11_code VARCHAR(20) NOT NULL,
  relevance_score DECIMAL(5,2) DEFAULT 0,
  search_count INT DEFAULT 1,
  last_searched TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_icd11_search_cache_search_code (search_term, icd11_code),
  KEY idx_icd11_search_cache_search_term (search_term),
  KEY idx_icd11_search_cache_relevance (relevance_score)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- SNOMED CT
-- =========================
CREATE TABLE snomed_concepts (
  snomed_id BIGINT UNSIGNED NOT NULL,
  fsn TEXT DEFAULT NULL,
  preferred_term VARCHAR(700) NOT NULL,
  concept_status TINYINT(1) DEFAULT 1,
  definition_status ENUM('Primitive','Fully Defined') DEFAULT 'Primitive',
  module_id BIGINT UNSIGNED DEFAULT NULL,
  effective_time DATE DEFAULT NULL,
  parent_concept_id BIGINT UNSIGNED DEFAULT NULL,
  hierarchy_level INT DEFAULT 0,
  usage_count INT DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (snomed_id),
  KEY idx_snomed_concepts_status (concept_status),
  KEY idx_snomed_concepts_effective (effective_time),
  KEY idx_snomed_concepts_parent (parent_concept_id),
  KEY idx_snomed_concepts_usage (usage_count),
  FULLTEXT KEY ft_snomed_concepts_preferred_term (preferred_term)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE snomed_descriptions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  description_id BIGINT UNSIGNED NOT NULL,
  snomed_id BIGINT UNSIGNED NOT NULL,
  description_text TEXT NOT NULL,
  description_type ENUM('FSN','Synonym','Definition','Text Definition') DEFAULT 'Synonym',
  language_code VARCHAR(5) DEFAULT 'en',
  acceptability ENUM('Preferred','Acceptable') DEFAULT 'Acceptable',
  case_significance ENUM('Case insensitive','Case sensitive','Initial character case insensitive') DEFAULT 'Case insensitive',
  is_active TINYINT(1) DEFAULT 1,
  effective_time DATE DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_snomed_descriptions_description_id (description_id),
  KEY idx_snomed_descriptions_snomed_id (snomed_id),
  KEY idx_snomed_descriptions_type (description_type),
  KEY idx_snomed_descriptions_active (is_active),
  FULLTEXT KEY ft_snomed_descriptions_description (description_text),
  CONSTRAINT fk_snomed_descriptions_concept
    FOREIGN KEY (snomed_id) REFERENCES snomed_concepts(snomed_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE snomed_relationships (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  relationship_id BIGINT UNSIGNED NOT NULL,
  source_id BIGINT UNSIGNED NOT NULL,
  target_id BIGINT UNSIGNED NOT NULL,
  relationship_type_id BIGINT UNSIGNED NOT NULL,
  relationship_type_name VARCHAR(255) DEFAULT NULL,
  relationship_group INT DEFAULT 0,
  characteristic_type ENUM('Stated','Inferred','Additional') DEFAULT 'Stated',
  modifier ENUM('Existential','Universal') DEFAULT 'Existential',
  is_active TINYINT(1) DEFAULT 1,
  effective_time DATE DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_snomed_relationships_relationship_id (relationship_id),
  KEY idx_snomed_relationships_source (source_id),
  KEY idx_snomed_relationships_target (target_id),
  KEY idx_snomed_relationships_type (relationship_type_id),
  KEY idx_snomed_relationships_active (is_active),
  CONSTRAINT fk_snomed_relationships_source
    FOREIGN KEY (source_id) REFERENCES snomed_concepts(snomed_id) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_snomed_relationships_target
    FOREIGN KEY (target_id) REFERENCES snomed_concepts(snomed_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE snomed_refsets (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  refset_id BIGINT UNSIGNED NOT NULL,
  refset_name VARCHAR(255) DEFAULT NULL,
  referenced_concept_id BIGINT UNSIGNED NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  effective_time DATE DEFAULT NULL,
  module_id BIGINT UNSIGNED DEFAULT NULL,
  refset_type VARCHAR(100) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_snomed_refsets_refset_member (refset_id, referenced_concept_id),
  KEY idx_snomed_refsets_referenced (referenced_concept_id),
  KEY idx_snomed_refsets_refset (refset_id),
  CONSTRAINT fk_snomed_refsets_concept
    FOREIGN KEY (referenced_concept_id) REFERENCES snomed_concepts(snomed_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE snomed_clinical_findings (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  snomed_id BIGINT UNSIGNED NOT NULL,
  clinical_term VARCHAR(700) NOT NULL,
  finding_type ENUM('Diagnosis','Symptom','Sign','Finding','Disorder','Disease') DEFAULT 'Finding',
  clinical_domain VARCHAR(100) DEFAULT NULL,
  body_site VARCHAR(255) DEFAULT NULL,
  body_site_snomed_id BIGINT UNSIGNED DEFAULT NULL,
  laterality ENUM('Left','Right','Bilateral','Unspecified') DEFAULT NULL,
  severity ENUM('Mild','Moderate','Severe','Life-threatening') DEFAULT NULL,
  associated_morphology VARCHAR(255) DEFAULT NULL,
  icd_code VARCHAR(20) DEFAULT NULL,
  icd_description VARCHAR(500) DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_snomed_clinical_findings_snomed (snomed_id),
  KEY idx_snomed_clinical_findings_finding_type (finding_type),
  KEY idx_snomed_clinical_findings_domain (clinical_domain),
  KEY idx_snomed_clinical_findings_icd (icd_code),
  KEY idx_snomed_clinical_findings_body_site (body_site_snomed_id),
  FULLTEXT KEY ft_snomed_clinical_findings_clinical_term (clinical_term),
  CONSTRAINT fk_snomed_clinical_findings_concept
    FOREIGN KEY (snomed_id) REFERENCES snomed_concepts(snomed_id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_snomed_clinical_findings_icd_code
    FOREIGN KEY (icd_code) REFERENCES icd_codes(icd_code) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE snomed_medications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  snomed_id BIGINT UNSIGNED NOT NULL,
  medication_name VARCHAR(500) NOT NULL,
  brand_name VARCHAR(255) DEFAULT NULL,
  substance_name VARCHAR(500) DEFAULT NULL,
  dose_form VARCHAR(100) DEFAULT NULL,
  strength_value DECIMAL(10,4) DEFAULT NULL,
  strength_unit VARCHAR(50) DEFAULT NULL,
  route_of_administration VARCHAR(100) DEFAULT NULL,
  unit_of_presentation VARCHAR(50) DEFAULT NULL,
  atc_code VARCHAR(10) DEFAULT NULL,
  therapeutic_class VARCHAR(255) DEFAULT NULL,
  pharmacological_class VARCHAR(255) DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1,
  is_controlled TINYINT(1) DEFAULT 0,
  schedule VARCHAR(20) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_snomed_medications_snomed (snomed_id),
  KEY idx_snomed_medications_atc (atc_code),
  KEY idx_snomed_medications_therapeutic (therapeutic_class),
  KEY idx_snomed_medications_controlled (is_controlled),
  FULLTEXT KEY ft_snomed_medications_medication (medication_name, substance_name, brand_name),
  CONSTRAINT fk_snomed_medications_concept
    FOREIGN KEY (snomed_id) REFERENCES snomed_concepts(snomed_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE snomed_procedures (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  snomed_id BIGINT UNSIGNED NOT NULL,
  procedure_name VARCHAR(700) NOT NULL,
  procedure_category VARCHAR(100) DEFAULT NULL,
  method VARCHAR(255) DEFAULT NULL,
  method_type VARCHAR(100) DEFAULT NULL,
  access_instrument VARCHAR(255) DEFAULT NULL,
  body_site VARCHAR(255) DEFAULT NULL,
  body_site_snomed_id BIGINT UNSIGNED DEFAULT NULL,
  laterality VARCHAR(50) DEFAULT NULL,
  cpt_code VARCHAR(20) DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_snomed_procedures_snomed (snomed_id),
  KEY idx_snomed_procedures_category (procedure_category),
  KEY idx_snomed_procedures_cpt (cpt_code),
  FULLTEXT KEY ft_snomed_procedures_procedure (procedure_name),
  CONSTRAINT fk_snomed_procedures_concept
    FOREIGN KEY (snomed_id) REFERENCES snomed_concepts(snomed_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE snomed_drug_attributes (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  concept_id BIGINT UNSIGNED NOT NULL,
  ingredient_concept_id BIGINT UNSIGNED DEFAULT NULL,
  ingredient_name VARCHAR(500) DEFAULT NULL,
  strength_value DECIMAL(10,4) DEFAULT NULL,
  strength_unit VARCHAR(64) DEFAULT NULL,
  dose_form_concept_id BIGINT UNSIGNED DEFAULT NULL,
  dose_form_name VARCHAR(255) DEFAULT NULL,
  route_concept_id BIGINT UNSIGNED DEFAULT NULL,
  route_name VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_snomed_drug_attributes_concept_ingredient (concept_id, ingredient_concept_id),
  KEY idx_snomed_drug_attributes_ingredient (ingredient_concept_id),
  KEY idx_snomed_drug_attributes_dose_form (dose_form_concept_id),
  CONSTRAINT fk_snomed_drug_attributes_concept
    FOREIGN KEY (concept_id) REFERENCES snomed_concepts(snomed_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE snomed_dosage_mapping (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  snomed_id BIGINT UNSIGNED NOT NULL,
  medication_name VARCHAR(255) NOT NULL,
  dosage_form VARCHAR(100) DEFAULT NULL,
  strength VARCHAR(100) DEFAULT NULL,
  route VARCHAR(100) DEFAULT NULL,
  frequency VARCHAR(100) DEFAULT NULL,
  duration VARCHAR(100) DEFAULT NULL,
  age_group ENUM('Neonate','Infant','Child','Adolescent','Adult','Elderly','All') DEFAULT 'Adult',
  min_age_years INT DEFAULT NULL,
  max_age_years INT DEFAULT NULL,
  is_weight_based TINYINT(1) DEFAULT 0,
  dose_per_kg DECIMAL(10,4) DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_snomed_dosage_mapping_snomed (snomed_id),
  KEY idx_snomed_dosage_mapping_medication (medication_name),
  KEY idx_snomed_dosage_mapping_age (age_group),
  CONSTRAINT fk_snomed_dosage_mapping_concept
    FOREIGN KEY (snomed_id) REFERENCES snomed_concepts(snomed_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE snomed_crossreferences (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  snomed_id BIGINT UNSIGNED NOT NULL,
  reference_type ENUM('ICD-10','ICD-11','LOINC','ATC','CPT','HCPCS','RxNorm','NDC','Other') NOT NULL,
  reference_code VARCHAR(50) NOT NULL,
  reference_description VARCHAR(500) DEFAULT NULL,
  relationship_strength ENUM('Exact','Equivalent','Narrow','Broad','Related','Approximate') DEFAULT 'Related',
  is_primary_map TINYINT(1) DEFAULT 0,
  mapping_source VARCHAR(100) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_snomed_crossreferences_snomed_reference (snomed_id, reference_type, reference_code),
  KEY idx_snomed_crossreferences_reference (reference_type, reference_code),
  KEY idx_snomed_crossreferences_primary (is_primary_map),
  CONSTRAINT fk_snomed_crossreferences_concept
    FOREIGN KEY (snomed_id) REFERENCES snomed_concepts(snomed_id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- MEDICINES MASTER
-- =========================
CREATE TABLE medicines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  generic_name VARCHAR(255) DEFAULT NULL,
  brand VARCHAR(255) DEFAULT NULL,
  manufacturer VARCHAR(255) DEFAULT NULL,
  dosage_form VARCHAR(100) DEFAULT NULL,
  strength VARCHAR(100) DEFAULT NULL,
  pack_size VARCHAR(100) DEFAULT NULL,
  category VARCHAR(100) DEFAULT NULL,
  therapeutic_class VARCHAR(255) DEFAULT NULL,
  pharmacological_class VARCHAR(255) DEFAULT NULL,
  atc_code VARCHAR(10) DEFAULT NULL,
  snomed_id BIGINT UNSIGNED DEFAULT NULL,
  rxnorm_id VARCHAR(20) DEFAULT NULL,
  mrp DECIMAL(12,2) DEFAULT NULL,
  purchase_price DECIMAL(12,2) DEFAULT NULL,
  schedule VARCHAR(20) DEFAULT NULL,
  is_controlled TINYINT(1) DEFAULT 0,
  is_narcotic TINYINT(1) DEFAULT 0,
  requires_prescription TINYINT(1) DEFAULT 1,
  default_dosage VARCHAR(100) DEFAULT NULL,
  default_frequency VARCHAR(100) DEFAULT NULL,
  default_duration VARCHAR(100) DEFAULT NULL,
  default_route VARCHAR(50) DEFAULT 'Oral',
  default_instructions TEXT DEFAULT NULL,
  usage_count INT DEFAULT 0,
  last_used_at TIMESTAMP NULL DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_medicines_name (name),
  KEY idx_medicines_generic (generic_name),
  KEY idx_medicines_brand (brand),
  KEY idx_medicines_category (category),
  KEY idx_medicines_therapeutic (therapeutic_class),
  KEY idx_medicines_atc (atc_code),
  KEY idx_medicines_snomed (snomed_id),
  KEY idx_medicines_active_popular (is_active, usage_count),
  KEY idx_medicines_controlled (is_controlled),
  FULLTEXT KEY ft_medicines_search (name, generic_name, brand),
  CONSTRAINT fk_medicines_snomed
    FOREIGN KEY (snomed_id) REFERENCES snomed_concepts(snomed_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE dosage_references (
  id INT AUTO_INCREMENT PRIMARY KEY,
  medication_name VARCHAR(255) NOT NULL,
  active_ingredient VARCHAR(255) DEFAULT NULL,
  dosage_form VARCHAR(100) NOT NULL,
  strength VARCHAR(100) NOT NULL,
  pack_size VARCHAR(100) DEFAULT NULL,
  route_of_administration VARCHAR(100) DEFAULT NULL,
  standard_dosage VARCHAR(255) DEFAULT NULL,
  max_daily_dose VARCHAR(255) DEFAULT NULL,
  recommended_frequency VARCHAR(100) DEFAULT NULL,
  recommended_duration VARCHAR(100) DEFAULT NULL,
  age_group ENUM('Neonate','Infant','Pediatric','Adolescent','Adult','Geriatric','All') DEFAULT 'Adult',
  min_age_years INT DEFAULT NULL,
  max_age_years INT DEFAULT NULL,
  is_weight_based TINYINT(1) DEFAULT 0,
  dose_per_kg DECIMAL(10,4) DEFAULT NULL,
  renal_adjustment_needed TINYINT(1) DEFAULT 0,
  hepatic_adjustment_needed TINYINT(1) DEFAULT 0,
  special_instructions TEXT DEFAULT NULL,
  contraindications TEXT DEFAULT NULL,
  side_effects TEXT DEFAULT NULL,
  drug_interactions TEXT DEFAULT NULL,
  pregnancy_category VARCHAR(10) DEFAULT NULL,
  lactation_safety VARCHAR(50) DEFAULT NULL,
  category VARCHAR(100) DEFAULT 'General',
  therapeutic_category VARCHAR(100) DEFAULT NULL,
  evidence_level ENUM('A','B','C','D','Expert') DEFAULT 'C',
  guideline_source VARCHAR(255) DEFAULT NULL,
  atc_code VARCHAR(10) DEFAULT NULL,
  snomed_id BIGINT UNSIGNED DEFAULT NULL,
  icd_code VARCHAR(20) DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_dosage_references_medication (medication_name),
  KEY idx_dosage_references_ingredient (active_ingredient),
  KEY idx_dosage_references_age_group (age_group),
  KEY idx_dosage_references_category (category),
  FULLTEXT KEY ft_dosage_references_search (medication_name, active_ingredient, notes),
  CONSTRAINT fk_dosage_references_snomed
    FOREIGN KEY (snomed_id) REFERENCES snomed_concepts(snomed_id) ON DELETE SET NULL,
  CONSTRAINT fk_dosage_references_icd
    FOREIGN KEY (icd_code) REFERENCES icd_codes(icd_code) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE drug_interactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  drug1_name VARCHAR(255) NOT NULL,
  drug1_medicine_id INT DEFAULT NULL,
  drug2_name VARCHAR(255) NOT NULL,
  drug2_medicine_id INT DEFAULT NULL,
  interaction_severity ENUM('Minor','Moderate','Severe','Contraindicated') DEFAULT 'Moderate',
  interaction_type VARCHAR(100) DEFAULT NULL,
  interaction_description TEXT NOT NULL,
  clinical_significance VARCHAR(255) DEFAULT NULL,
  onset VARCHAR(50) DEFAULT NULL,
  documentation ENUM('Established','Probable','Suspected','Possible','Unlikely') DEFAULT 'Probable',
  management_recommendation TEXT DEFAULT NULL,
  monitoring_parameters TEXT DEFAULT NULL,
  alternative_drugs TEXT DEFAULT NULL,
  evidence_level VARCHAR(50) DEFAULT NULL,
  reference_source VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_drug_interactions_interaction (drug1_name, drug2_name),
  KEY idx_drug_interactions_drug1 (drug1_name),
  KEY idx_drug_interactions_drug2 (drug2_name),
  KEY idx_drug_interactions_severity (interaction_severity),
  CONSTRAINT fk_drug_interactions_drug1
    FOREIGN KEY (drug1_medicine_id) REFERENCES medicines(id) ON DELETE SET NULL,
  CONSTRAINT fk_drug_interactions_drug2
    FOREIGN KEY (drug2_medicine_id) REFERENCES medicines(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE medication_allergies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  medication_name VARCHAR(255) NOT NULL,
  allergen_class VARCHAR(100) DEFAULT NULL,
  allergy_type ENUM('Allergy','Sensitivity','Intolerance','Adverse Reaction') DEFAULT 'Allergy',
  reaction_severity ENUM('Mild','Moderate','Severe','Life-threatening') DEFAULT 'Moderate',
  reaction_description TEXT DEFAULT NULL,
  cross_reactivity TEXT DEFAULT NULL,
  cross_reactive_classes JSON DEFAULT NULL,
  management_protocol TEXT DEFAULT NULL,
  alternative_medications TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_medication_allergies_medication (medication_name),
  KEY idx_medication_allergies_allergen_class (allergen_class),
  KEY idx_medication_allergies_severity (reaction_severity)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE dosage_adjustments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  medication_name VARCHAR(255) NOT NULL,
  medicine_id INT DEFAULT NULL,
  adjustment_type ENUM('Renal','Hepatic','Age-based','Weight-based','Pediatric','Geriatric') NOT NULL,
  impairment_level VARCHAR(50) DEFAULT NULL,
  gfr_range VARCHAR(50) DEFAULT NULL,
  child_pugh_class VARCHAR(10) DEFAULT NULL,
  adjusted_dosage VARCHAR(255) DEFAULT NULL,
  adjusted_frequency VARCHAR(100) DEFAULT NULL,
  max_adjusted_dose VARCHAR(100) DEFAULT NULL,
  monitoring_parameters TEXT DEFAULT NULL,
  monitoring_frequency VARCHAR(100) DEFAULT NULL,
  clinical_notes TEXT DEFAULT NULL,
  contraindicated TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_dosage_adjustments_medication (medication_name),
  KEY idx_dosage_adjustments_medicine (medicine_id),
  KEY idx_dosage_adjustments_adj_type (adjustment_type),
  CONSTRAINT fk_dosage_adjustments_medicine
    FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE symptom_medication_mapping (
  id INT AUTO_INCREMENT PRIMARY KEY,
  symptom_name VARCHAR(255) NOT NULL,
  symptom_snomed_id BIGINT UNSIGNED DEFAULT NULL,
  symptom_category VARCHAR(100) DEFAULT NULL,
  medication_name VARCHAR(255) NOT NULL,
  medicine_id INT DEFAULT NULL,
  dosage_form VARCHAR(100) DEFAULT NULL,
  strength VARCHAR(100) DEFAULT NULL,
  frequency VARCHAR(100) DEFAULT NULL,
  duration VARCHAR(100) DEFAULT NULL,
  severity_level ENUM('Mild','Moderate','Severe','Any') DEFAULT 'Any',
  age_group ENUM('Pediatric','Adult','Geriatric','All') DEFAULT 'All',
  recommendation_priority INT DEFAULT 10,
  is_first_line TINYINT(1) DEFAULT 0,
  evidence_based TINYINT(1) DEFAULT 1,
  evidence_level VARCHAR(10) DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_symptom_medication_mapping_symptom (symptom_name),
  KEY idx_symptom_medication_mapping_medication (medication_name),
  KEY idx_symptom_medication_mapping_severity (severity_level),
  KEY idx_symptom_medication_mapping_priority (recommendation_priority),
  FULLTEXT KEY ft_symptom_medication_mapping_symptom (symptom_name),
  CONSTRAINT fk_symptom_medication_mapping_medicine
    FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE SET NULL,
  CONSTRAINT fk_symptom_medication_mapping_snomed
    FOREIGN KEY (symptom_snomed_id) REFERENCES snomed_concepts(snomed_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE diagnosis_medication_mapping (
  id INT AUTO_INCREMENT PRIMARY KEY,
  icd_code VARCHAR(20) DEFAULT NULL,
  diagnosis_name VARCHAR(255) NOT NULL,
  diagnosis_snomed_id BIGINT UNSIGNED DEFAULT NULL,
  medication_name VARCHAR(255) NOT NULL,
  medicine_id INT DEFAULT NULL,
  dosage_form VARCHAR(100) DEFAULT NULL,
  strength VARCHAR(100) DEFAULT NULL,
  frequency VARCHAR(100) DEFAULT NULL,
  duration VARCHAR(100) DEFAULT NULL,
  indication TEXT DEFAULT NULL,
  line_of_therapy ENUM('First-line','Second-line','Third-line','Adjunct') DEFAULT 'First-line',
  alternative_medications TEXT DEFAULT NULL,
  contraindications_notes TEXT DEFAULT NULL,
  evidence_level ENUM('A','B','C','D','Expert') DEFAULT 'C',
  guideline_source VARCHAR(255) DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_icd (icd_code),
  KEY idx_diagnosis (diagnosis_name),
  KEY idx_diag_medication (medication_name),
  KEY idx_line (line_of_therapy),
  FULLTEXT KEY ft_diagnosis (diagnosis_name),
  CONSTRAINT fk_diag_med_icd FOREIGN KEY (icd_code) REFERENCES icd_codes(icd_code) ON DELETE SET NULL,
  CONSTRAINT fk_diag_med_medicine FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE SET NULL,
  CONSTRAINT fk_diag_med_snomed FOREIGN KEY (diagnosis_snomed_id) REFERENCES snomed_concepts(snomed_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE tb_treatment_guidelines (
  id INT AUTO_INCREMENT PRIMARY KEY,
  treatment_category VARCHAR(100) NOT NULL,
  patient_type VARCHAR(100) DEFAULT NULL,
  drug_regimen TEXT NOT NULL,
  intensive_phase_duration VARCHAR(50) DEFAULT NULL,
  intensive_phase_drugs TEXT DEFAULT NULL,
  continuation_phase_duration VARCHAR(50) DEFAULT NULL,
  continuation_phase_drugs TEXT DEFAULT NULL,
  duration_months INT DEFAULT NULL,
  monitoring_frequency VARCHAR(100) DEFAULT NULL,
  sputum_examination_schedule TEXT DEFAULT NULL,
  adverse_effects_monitoring TEXT DEFAULT NULL,
  expected_success_rate DECIMAL(5,2) DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  guideline_source VARCHAR(255) DEFAULT 'RNTCP',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  KEY idx_tb_category (treatment_category)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================================================
-- PART 3: CLINICAL (Appointments, Queue, Prescriptions, Vitals) + 
--         BILLING (OPD Bills, Services) + 
--         IPD (Admissions, Rooms, Insurance)
-- MariaDB 10.6+ Compatible
-- ========================================================================

USE patient_management;
SET FOREIGN_KEY_CHECKS = 0;

-- =========================
-- DROP ALL TABLES (SECTION 4: APPOINTMENTS + CLINICAL)
-- =========================
DROP TABLE IF EXISTS pad_configurations;
DROP TABLE IF EXISTS rx_template_config;
DROP TABLE IF EXISTS medical_certificates;
DROP TABLE IF EXISTS medical_certificate_templates;
DROP TABLE IF EXISTS prescription_allergy_alerts;
DROP TABLE IF EXISTS visit_advice;
DROP TABLE IF EXISTS medical_records;
DROP TABLE IF EXISTS frequently_used;
DROP TABLE IF EXISTS doctor_diagnosis_medicine_defaults;
DROP TABLE IF EXISTS prescription_diagnoses;
DROP TABLE IF EXISTS prescription_items;
DROP TABLE IF EXISTS prescriptions;
DROP TABLE IF EXISTS receipt_templates;
DROP TABLE IF EXISTS prescription_templates;
DROP TABLE IF EXISTS injection_templates;
DROP TABLE IF EXISTS medications_templates;
DROP TABLE IF EXISTS diagnosis_templates;
DROP TABLE IF EXISTS symptoms_templates;
DROP TABLE IF EXISTS medications;
DROP TABLE IF EXISTS family_history;
DROP TABLE IF EXISTS patient_surgical_history;
DROP TABLE IF EXISTS patient_chronic_conditions;
DROP TABLE IF EXISTS patient_allergies;
DROP TABLE IF EXISTS patient_vitals;
DROP TABLE IF EXISTS queue;
DROP TABLE IF EXISTS appointment_status_history;
DROP TABLE IF EXISTS appointment_reminders;
DROP TABLE IF EXISTS appointment_followups;
DROP TABLE IF EXISTS appointment_intents;
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS clinic_holidays;
DROP TABLE IF EXISTS blocked_slots;
DROP TABLE IF EXISTS appointment_slots;
DROP TABLE IF EXISTS doctor_time_slots;
DROP TABLE IF EXISTS doctor_availability;
DROP TABLE IF EXISTS doctor_schedules;

-- =========================
-- DOCTOR SCHEDULES & AVAILABILITY
-- =========================
CREATE TABLE doctor_schedules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  doctor_id INT NOT NULL,
  clinic_id INT NOT NULL,
  day_of_week ENUM('monday','tuesday','wednesday','thursday','friday','saturday','sunday') NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  slot_duration_minutes INT NOT NULL DEFAULT 15,
  max_patients_per_slot INT NOT NULL DEFAULT 1,
  break_start_time TIME DEFAULT NULL,
  break_end_time TIME DEFAULT NULL,
  effective_from DATE DEFAULT NULL,
  effective_until DATE DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_doc_day_eff (doctor_id, clinic_id, day_of_week, effective_from),
  KEY idx_sched_lookup (doctor_id, clinic_id, day_of_week, is_active),
  CONSTRAINT fk_sched_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
  CONSTRAINT fk_sched_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE doctor_availability (
  id INT AUTO_INCREMENT PRIMARY KEY,
  doctor_id INT NOT NULL,
  day_of_week TINYINT NOT NULL COMMENT '0=Sun..6=Sat',
  is_available TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_doc_day (doctor_id, day_of_week),
  CONSTRAINT fk_doc_avail FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE doctor_time_slots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  doctor_id INT NOT NULL,
  slot_time TIME NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  display_order INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_doc_slot_time (doctor_id, slot_time),
  CONSTRAINT fk_doc_slots FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE appointment_slots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  doctor_id INT NOT NULL,
  clinic_id INT NOT NULL,
  slot_date DATE NOT NULL,
  slot_time TIME NOT NULL,
  end_time TIME NOT NULL,
  status ENUM('available','booked','blocked','completed','cancelled') DEFAULT 'available',
  max_bookings INT NOT NULL DEFAULT 1,
  current_bookings INT NOT NULL DEFAULT 0,
  is_emergency_slot TINYINT(1) DEFAULT 0,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_doc_slot (doctor_id, slot_date, slot_time),
  KEY idx_slot_avail (doctor_id, clinic_id, slot_date, status, slot_time),
  CONSTRAINT fk_slot_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
  CONSTRAINT fk_slot_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE blocked_slots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  doctor_id INT NOT NULL,
  clinic_id INT NOT NULL,
  block_date DATE NOT NULL,
  start_time TIME DEFAULT NULL,
  end_time TIME DEFAULT NULL,
  is_full_day TINYINT(1) DEFAULT 0,
  reason VARCHAR(255) DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_block_lookup (doctor_id, clinic_id, block_date, is_full_day),
  CONSTRAINT fk_block_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
  CONSTRAINT fk_block_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT fk_block_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE clinic_holidays (
  id INT AUTO_INCREMENT PRIMARY KEY,
  clinic_id INT NOT NULL,
  doctor_id INT DEFAULT NULL,
  holiday_date DATE NOT NULL,
  title VARCHAR(255) NOT NULL,
  is_full_day TINYINT(1) DEFAULT 1,
  start_time TIME DEFAULT NULL,
  end_time TIME DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_holiday (clinic_id, doctor_id, holiday_date),
  KEY idx_holiday_lookup (clinic_id, holiday_date, doctor_id),
  CONSTRAINT fk_holiday_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT fk_holiday_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
  CONSTRAINT fk_holiday_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- APPOINTMENTS
-- =========================
CREATE TABLE appointments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  doctor_id INT NOT NULL,
  clinic_id INT NOT NULL,
  appointment_slot_id INT DEFAULT NULL,
  appointment_date DATE NOT NULL,
  appointment_time TIME NOT NULL,
  estimated_duration_minutes INT DEFAULT 15,
  arrival_type ENUM('online','walk-in','referral','emergency','phone','app') DEFAULT 'walk-in',
  consultation_type ENUM('new','followup','tele','video','procedure','review') DEFAULT 'new',
  priority ENUM('normal','urgent','emergency','vip') DEFAULT 'normal',
  status ENUM('scheduled','confirmed','checked-in','in-progress','completed','cancelled','no-show','rescheduled')
    DEFAULT 'scheduled',
  payment_status ENUM('pending','partial','paid','refunded','waived','insurance') DEFAULT 'pending',
  consultation_fee DECIMAL(12,2) DEFAULT NULL,
  amount_paid DECIMAL(12,2) DEFAULT 0.00,
  payment_method VARCHAR(50) DEFAULT NULL,
  checked_in_at TIMESTAMP NULL DEFAULT NULL,
  called_at TIMESTAMP NULL DEFAULT NULL,
  visit_started_at TIMESTAMP NULL DEFAULT NULL,
  visit_ended_at TIMESTAMP NULL DEFAULT NULL,
  reason_for_visit TEXT DEFAULT NULL,
  chief_complaint TEXT DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  booked_by INT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_appt_patient (patient_id, appointment_date),
  KEY idx_appt_doc_date (doctor_id, appointment_date, status, clinic_id),
  KEY idx_appt_clinic_date (clinic_id, appointment_date, status),
  KEY idx_appt_slot (appointment_slot_id),
  CONSTRAINT fk_appt_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_appt_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
  CONSTRAINT fk_appt_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT fk_appt_slot FOREIGN KEY (appointment_slot_id) REFERENCES appointment_slots(id) ON DELETE SET NULL,
  CONSTRAINT fk_appt_booked_by FOREIGN KEY (booked_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE appointment_intents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255) DEFAULT NULL,
  speciality VARCHAR(100) DEFAULT NULL,
  preferred_date DATE DEFAULT NULL,
  message TEXT DEFAULT NULL,
  status ENUM('new','contacted','scheduled','cancelled') DEFAULT 'new',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_intent_status (status),
  KEY idx_intent_phone (phone)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE appointment_followups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  appointment_id INT NOT NULL,
  followup_date DATE NOT NULL,
  reason TEXT DEFAULT NULL,
  status ENUM('pending','completed','cancelled') DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_af_appt FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE appointment_reminders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  appointment_id INT NOT NULL,
  reminder_type ENUM('SMS','Email','WhatsApp','IVR','Push') DEFAULT 'SMS',
  scheduled_at DATETIME NOT NULL,
  sent_at DATETIME DEFAULT NULL,
  status ENUM('Pending','Sent','Failed','Cancelled') DEFAULT 'Pending',
  error_message TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_reminder_schedule (scheduled_at, status),
  CONSTRAINT fk_rem_appt FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE appointment_status_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  appointment_id INT NOT NULL,
  old_status VARCHAR(50) DEFAULT NULL,
  new_status VARCHAR(50) NOT NULL,
  changed_by INT DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ash_appt (appointment_id, created_at),
  CONSTRAINT fk_ash_appt FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE CASCADE,
  CONSTRAINT fk_ash_user FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- QUEUE (MariaDB safe: NO generated column, uses triggers)
-- =========================
CREATE TABLE queue (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  doctor_id INT NOT NULL,
  clinic_id INT NOT NULL,
  appointment_id INT DEFAULT NULL,
  queue_number INT DEFAULT NULL,
  token_number VARCHAR(20) DEFAULT NULL,
  priority INT DEFAULT 0,
  status ENUM('waiting','called','in_progress','completed','cancelled','no-show','skipped') DEFAULT 'waiting',
  check_in_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  check_in_date DATE DEFAULT NULL,
  called_at TIMESTAMP NULL DEFAULT NULL,
  start_time TIMESTAMP NULL DEFAULT NULL,
  end_time TIMESTAMP NULL DEFAULT NULL,
  completed_at TIMESTAMP NULL DEFAULT NULL,
  wait_duration_minutes INT DEFAULT NULL,
  consultation_duration_minutes INT DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  visit_status ENUM('with_staff','unbilled','billed') DEFAULT 'unbilled',
  KEY idx_queue_active (doctor_id, clinic_id, status, priority, check_in_time),
  KEY idx_queue_daily (check_in_date, doctor_id, status),
  KEY idx_queue_appt (appointment_id),
  KEY idx_queue_token (token_number),
  CONSTRAINT fk_queue_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_queue_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
  CONSTRAINT fk_queue_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT fk_queue_appt FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Triggers to maintain check_in_date (MariaDB compatible)
DELIMITER $$

DROP TRIGGER IF EXISTS tr_queue_set_date_ins $$
CREATE TRIGGER tr_queue_set_date_ins
BEFORE INSERT ON queue
FOR EACH ROW
BEGIN
  IF NEW.check_in_time IS NULL THEN
    SET NEW.check_in_time = CURRENT_TIMESTAMP;
  END IF;
  SET NEW.check_in_date = DATE(NEW.check_in_time);
END$$

DROP TRIGGER IF EXISTS tr_queue_set_date_upd $$
CREATE TRIGGER tr_queue_set_date_upd
BEFORE UPDATE ON queue
FOR EACH ROW
BEGIN
  IF NEW.check_in_time IS NOT NULL THEN
    SET NEW.check_in_date = DATE(NEW.check_in_time);
  END IF;
END$$

DELIMITER ;

-- =========================
-- PATIENT VITALS + ALLERGIES + CHRONIC + SURGICAL + FAMILY + MEDICATIONS
-- =========================
CREATE TABLE patient_vitals (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  appointment_id INT DEFAULT NULL,
  height_cm DECIMAL(5,2) DEFAULT NULL,
  weight_kg DECIMAL(5,2) DEFAULT NULL,
  bmi DECIMAL(4,2) DEFAULT NULL,
  bp_systolic INT DEFAULT NULL,
  bp_diastolic INT DEFAULT NULL,
  blood_pressure VARCHAR(20) DEFAULT NULL,
  pulse INT DEFAULT NULL,
  temperature DECIMAL(4,1) DEFAULT NULL,
  temperature_unit ENUM('C','F') DEFAULT 'C',
  spo2 INT DEFAULT NULL,
  respiratory_rate INT DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  recorded_by INT DEFAULT NULL,
  recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_pv_patient_date (patient_id, recorded_at),
  CONSTRAINT fk_vitals_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_vitals_appt FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
  CONSTRAINT fk_vitals_user FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE patient_allergies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  clinic_id INT NOT NULL,
  category ENUM('drug','food','environmental','insect','latex','other') NOT NULL,
  allergen_name VARCHAR(255) NOT NULL,
  snomed_id BIGINT UNSIGNED DEFAULT NULL,
  severity ENUM('mild','moderate','severe','life_threatening') DEFAULT 'moderate',
  reaction TEXT DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_allergy (patient_id, category, allergen_name),
  KEY idx_allergy_patient (patient_id, is_active),
  CONSTRAINT fk_pa_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_pa_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT fk_pa_snomed FOREIGN KEY (snomed_id) REFERENCES snomed_concepts(snomed_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE patient_chronic_conditions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  clinic_id INT NOT NULL,
  condition_name VARCHAR(255) NOT NULL,
  icd_code VARCHAR(20) DEFAULT NULL,
  snomed_id BIGINT UNSIGNED DEFAULT NULL,
  start_date DATE DEFAULT NULL,
  status ENUM('Active','Inactive','Resolved') DEFAULT 'Active',
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_pcc_patient (patient_id, status),
  CONSTRAINT fk_pcc_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_pcc_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT fk_pcc_icd FOREIGN KEY (icd_code) REFERENCES icd_codes(icd_code) ON DELETE SET NULL,
  CONSTRAINT fk_pcc_snomed FOREIGN KEY (snomed_id) REFERENCES snomed_concepts(snomed_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE patient_surgical_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  surgery_name VARCHAR(255) NOT NULL,
  surgery_date DATE DEFAULT NULL,
  hospital VARCHAR(255) DEFAULT NULL,
  surgeon VARCHAR(255) DEFAULT NULL,
  complications TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_psh_patient (patient_id, surgery_date),
  CONSTRAINT fk_psh_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- FIX: 'condition' is reserved word -> use 'condition_name'
CREATE TABLE family_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  relation ENUM('father','mother','brother','sister','grandparent','child','other') DEFAULT 'other',
  condition_name VARCHAR(255) DEFAULT NULL,
  icd_code VARCHAR(20) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_fh_patient (patient_id),
  CONSTRAINT fk_fh_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_fh_icd FOREIGN KEY (icd_code) REFERENCES icd_codes(icd_code) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE medications (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  medicine_id INT DEFAULT NULL,
  medication_name VARCHAR(255) NOT NULL,
  dosage VARCHAR(100) DEFAULT NULL,
  frequency VARCHAR(100) DEFAULT NULL,
  start_date DATE DEFAULT NULL,
  end_date DATE DEFAULT NULL,
  is_current TINYINT(1) DEFAULT 1,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_med_patient (patient_id, is_current),
  CONSTRAINT fk_med_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_med_master FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- TEMPLATES
-- =========================
CREATE TABLE symptoms_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) DEFAULT NULL,
  symptoms JSON NOT NULL,
  description TEXT DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_by INT DEFAULT NULL,
  clinic_id INT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_sym_tpl (clinic_id, is_active),
  CONSTRAINT fk_sym_tpl_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT fk_sym_tpl_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE diagnosis_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) DEFAULT NULL,
  diagnoses JSON NOT NULL,
  description TEXT DEFAULT NULL,
  doctor_id INT DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_diag_tpl_doc (doctor_id),
  CONSTRAINT fk_diag_tpl_doc FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE medications_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  category VARCHAR(100) DEFAULT NULL,
  medications JSON NOT NULL,
  description TEXT DEFAULT NULL,
  doctor_id INT DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_med_tpl_doc (doctor_id),
  CONSTRAINT fk_med_tpl_doc FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE injection_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  doctor_id INT DEFAULT NULL COMMENT 'Stores user_id of doctor',
  template_name VARCHAR(255) NOT NULL,
  injection_name VARCHAR(255) NOT NULL,
  generic_name VARCHAR(255) DEFAULT NULL,
  dose VARCHAR(120) NOT NULL,
  route VARCHAR(50) NOT NULL,
  infusion_rate VARCHAR(100) DEFAULT NULL,
  frequency VARCHAR(100) NOT NULL,
  duration VARCHAR(60) NOT NULL,
  timing VARCHAR(80) DEFAULT NULL,
  instructions TEXT DEFAULT NULL,
  usage_count INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_inj_tpl_active (is_active, usage_count),
  KEY idx_inj_tpl_doctor (doctor_id),
  CONSTRAINT fk_inj_tpl_user FOREIGN KEY (doctor_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE prescription_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  template_name VARCHAR(255) NOT NULL,
  category VARCHAR(100) DEFAULT NULL,
  description TEXT DEFAULT NULL,
  symptoms JSON DEFAULT NULL,
  diagnoses JSON DEFAULT NULL,
  medications JSON DEFAULT NULL,
  investigations TEXT DEFAULT NULL,
  precautions TEXT DEFAULT NULL,
  diet_restrictions TEXT DEFAULT NULL,
  activities TEXT DEFAULT NULL,
  advice TEXT DEFAULT NULL,
  follow_up_days INT DEFAULT NULL,
  duration_days INT DEFAULT 7,
  is_active TINYINT(1) DEFAULT 1,
  is_global TINYINT(1) DEFAULT 0,
  doctor_id INT DEFAULT NULL,
  clinic_id INT DEFAULT NULL,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_rx_tpl (clinic_id, doctor_id, is_active, is_global),
  KEY idx_rx_category_active (category, is_active),
  CONSTRAINT fk_rx_tpl_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL,
  CONSTRAINT fk_rx_tpl_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT fk_rx_tpl_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Sample prescription templates
INSERT INTO prescription_templates (
  template_name, category, description, symptoms, diagnoses, medications,
  investigations, precautions, diet_restrictions, activities,
  advice, follow_up_days, duration_days, is_active, is_global, created_at
) VALUES 
(
  'Common Cold Treatment',
  'Respiratory',
  'Standard template for treating common cold/URTI',
  '["Fever","Cough","Sore Throat","Nasal Congestion"]',
  '["Upper Respiratory Tract Infection"]',
  '[{"name":"Paracetamol","dosage":"500mg","frequency":"1-1-1","route":"Oral","timing":"After Meal","duration":"5 days"},{"name":"Amoxicillin","dosage":"500mg","frequency":"1-1-1","route":"Oral","timing":"After Meal","duration":"5 days"}]',
  'CBC, Throat Culture if persists',
  'Avoid smoking, Stay hydrated, Avoid crowded places',
  'Avoid cold and spicy food, Drink warm water, Drink warm milk with turmeric',
  'Rest for 2 days, Light activities only, No strenuous exercise',
  'Complete the antibiotic course. If symptoms persist beyond 5 days or worsen, consult immediately.',
  7,
  5,
  1,
  1,
  NOW()
),
(
  'Hypertension Management',
  'Cardiovascular',
  'Template for initial hypertension management',
  '["High Blood Pressure","Headache","Dizziness"]',
  '["Essential Hypertension"]',
  '[{"name":"Amlodipine","dosage":"5mg","frequency":"1-0-0","route":"Oral","timing":"Morning","duration":"30 days"},{"name":"Enalapril","dosage":"5mg","frequency":"1-0-1","route":"Oral","timing":"Morning and Evening","duration":"30 days"}]',
  'BP Monitoring, Blood Urea, Creatinine, Lipid Profile',
  'Monitor BP regularly, Limit salt intake, No smoking, Reduce stress',
  'Low sodium diet, Avoid fatty foods, Reduce sugar intake',
  'Regular moderate exercise 30 mins daily, Maintain healthy weight, Manage stress',
  'Monitor blood pressure regularly at home. Maintain a chart. Return if BP remains high or drops too low.',
  14,
  30,
  1,
  1,
  NOW()
),
(
  'Type 2 Diabetes - Initial',
  'General',
  'Initial management template for Type 2 Diabetes',
  '["Increased Thirst","Frequent Urination","Fatigue","Blurred Vision"]',
  '["Type 2 Diabetes Mellitus"]',
  '[{"name":"Metformin","dosage":"500mg","frequency":"1-0-1","route":"Oral","timing":"After Meal","duration":"30 days"},{"name":"Glipizide","dosage":"5mg","frequency":"1-0-0","route":"Oral","timing":"Before Breakfast","duration":"30 days"}]',
  'Blood Sugar (Fasting and Random), HbA1c, Urine Routine, Lipid Profile, Renal Function',
  'No smoking, Avoid stress, Regular blood sugar monitoring, Maintain medication schedule',
  'Avoid sugar and sweets, Reduce refined carbs, Include whole grains, Avoid fried foods, Limit salt',
  'Walk 30 minutes daily, Regular exercise, Maintain consistent meal times, Adequate sleep',
  'Check blood sugar levels regularly. Maintain a diary. Follow diet strictly. Exercise regularly.',
  14,
  30,
  1,
  1,
  NOW()
)
ON DUPLICATE KEY UPDATE updated_at = NOW();

CREATE TABLE receipt_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  clinic_id INT NOT NULL,
  template_name VARCHAR(255) NOT NULL,
  template_type ENUM('bill','receipt','invoice','estimate') DEFAULT 'receipt',
  header_content TEXT DEFAULT NULL,
  header_image LONGTEXT DEFAULT NULL,
  footer_content TEXT DEFAULT NULL,
  footer_image LONGTEXT DEFAULT NULL,
  is_default TINYINT(1) DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_receipt_tpl (clinic_id, template_type, is_default),
  CONSTRAINT fk_receipt_tpl_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- PRESCRIPTIONS
-- =========================
CREATE TABLE prescriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  doctor_id INT NOT NULL,
  clinic_id INT NOT NULL,
  appointment_id INT DEFAULT NULL,
  template_id INT DEFAULT NULL,
  chief_complaint TEXT DEFAULT NULL,
  symptoms JSON DEFAULT NULL,
  diagnosis TEXT DEFAULT NULL,
  diagnosis_icd_code VARCHAR(20) DEFAULT NULL,
  diagnosis_icd11_code VARCHAR(20) DEFAULT NULL,
  investigations_advised TEXT DEFAULT NULL,
  advice TEXT DEFAULT NULL,
  prescribed_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  follow_up_date DATE DEFAULT NULL,
  status ENUM('draft','active','dispensed','completed','cancelled') DEFAULT 'active',
  is_active TINYINT(1) DEFAULT 1,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  KEY idx_presc_patient_date (patient_id, prescribed_date),
  KEY idx_presc_doctor_date (doctor_id, prescribed_date, clinic_id),
  KEY idx_presc_appt (appointment_id),
  CONSTRAINT fk_presc_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_presc_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
  CONSTRAINT fk_presc_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT fk_presc_appt FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
  CONSTRAINT fk_presc_tpl FOREIGN KEY (template_id) REFERENCES prescription_templates(id) ON DELETE SET NULL,
  CONSTRAINT fk_presc_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_presc_icd FOREIGN KEY (diagnosis_icd_code) REFERENCES icd_codes(icd_code) ON DELETE SET NULL,
  CONSTRAINT fk_presc_icd11 FOREIGN KEY (diagnosis_icd11_code) REFERENCES icd11_codes(icd11_code) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE prescription_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  prescription_id INT NOT NULL,
  medicine_id INT DEFAULT NULL,
  medicine_name VARCHAR(255) NOT NULL,
  dosage VARCHAR(120) DEFAULT NULL,
  frequency VARCHAR(80) DEFAULT NULL,
  duration VARCHAR(60) DEFAULT NULL,
  route VARCHAR(50) DEFAULT 'Oral',
  before_after_food ENUM('Before Food','After Food','With Food','Any Time','As Directed') DEFAULT 'After Food',
  notes TEXT DEFAULT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_pi_presc (prescription_id, sort_order),
  KEY idx_pi_med (medicine_id),
  CONSTRAINT fk_pi_presc FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE,
  CONSTRAINT fk_pi_med FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE prescription_diagnoses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  prescription_id INT NOT NULL,
  icd_code VARCHAR(20) DEFAULT NULL,
  icd11_code VARCHAR(20) DEFAULT NULL,
  snomed_id BIGINT UNSIGNED DEFAULT NULL,
  diagnosis_text VARCHAR(500) DEFAULT NULL,
  diagnosis_type ENUM('Primary','Secondary','Provisional','Differential') DEFAULT 'Primary',
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_pd_presc (prescription_id, sort_order),
  KEY idx_pd_icd (icd_code),
  KEY idx_pd_icd11 (icd11_code),
  CONSTRAINT fk_pd_presc FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE CASCADE,
  CONSTRAINT fk_pd_icd FOREIGN KEY (icd_code) REFERENCES icd_codes(icd_code) ON DELETE SET NULL,
  CONSTRAINT fk_pd_icd11 FOREIGN KEY (icd11_code) REFERENCES icd11_codes(icd11_code) ON DELETE SET NULL,
  CONSTRAINT fk_pd_snomed FOREIGN KEY (snomed_id) REFERENCES snomed_concepts(snomed_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE doctor_diagnosis_medicine_defaults (
  id INT AUTO_INCREMENT PRIMARY KEY,
  doctor_id INT NOT NULL,
  icd_code VARCHAR(20) DEFAULT NULL,
  medicine_id INT DEFAULT NULL,
  medicine_name VARCHAR(255) NOT NULL,
  default_dosage VARCHAR(120) DEFAULT NULL,
  default_frequency VARCHAR(80) DEFAULT NULL,
  default_duration VARCHAR(60) DEFAULT NULL,
  priority TINYINT DEFAULT 10,
  usage_count INT DEFAULT 0,
  is_favorite TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_doc_icd_med (doctor_id, icd_code, medicine_id),
  CONSTRAINT fk_ddmd_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE,
  CONSTRAINT fk_ddmd_icd FOREIGN KEY (icd_code) REFERENCES icd_codes(icd_code) ON DELETE SET NULL,
  CONSTRAINT fk_ddmd_med FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE frequently_used (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  item_type ENUM('medicine','diagnosis','procedure') DEFAULT 'medicine',
  item_id INT DEFAULT NULL,
  item_name VARCHAR(255) NOT NULL,
  item_data JSON DEFAULT NULL,
  usage_count INT DEFAULT 1,
  last_used TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_user_item (user_id, item_type, item_id),
  KEY idx_fu_user (user_id, item_type, usage_count),
  CONSTRAINT fk_fu_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE visit_advice (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  appointment_id INT DEFAULT NULL,
  prescription_id INT DEFAULT NULL,
  advice TEXT DEFAULT NULL,
  follow_up_days INT DEFAULT NULL,
  next_visit_date DATE DEFAULT NULL,
  special_instructions TEXT DEFAULT NULL,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_va_patient (patient_id, next_visit_date),
  CONSTRAINT fk_va_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_va_appt FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
  CONSTRAINT fk_va_presc FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE SET NULL,
  CONSTRAINT fk_va_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE prescription_allergy_alerts (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  prescription_id INT DEFAULT NULL,
  drug_name VARCHAR(255) DEFAULT NULL,
  allergen_name VARCHAR(255) NOT NULL,
  action ENUM('blocked','warned','proceeded') NOT NULL,
  message VARCHAR(500) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_alert_patient (patient_id, created_at),
  CONSTRAINT fk_paa_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_paa_presc FOREIGN KEY (prescription_id) REFERENCES prescriptions(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE medical_records (
  id INT AUTO_INCREMENT PRIMARY KEY,
  clinic_id INT NOT NULL,
  patient_id INT NOT NULL,
  doctor_id INT DEFAULT NULL,
  appointment_id INT DEFAULT NULL,
  record_type VARCHAR(100) DEFAULT NULL,
  record_title VARCHAR(255) DEFAULT NULL,
  file_path VARCHAR(500) DEFAULT NULL,
  file_type VARCHAR(50) DEFAULT NULL,
  file_size INT DEFAULT NULL,
  description TEXT DEFAULT NULL,
  is_public TINYINT(1) DEFAULT 0,
  uploaded_by INT DEFAULT NULL,
  uploaded_date DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  KEY idx_mr_patient (patient_id, uploaded_date),
  KEY idx_mr_clinic (clinic_id),
  CONSTRAINT fk_mr_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT fk_mr_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_mr_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL,
  CONSTRAINT fk_mr_appt FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
  CONSTRAINT fk_mr_uploaded_by FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE medical_certificate_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  template_name VARCHAR(255) NOT NULL,
  certificate_type ENUM('sick_leave','fitness','discharge','pre_op_fitness','travel','disability','medical_report','other') NOT NULL,
  template_content TEXT NOT NULL,
  header_image LONGTEXT DEFAULT NULL,
  footer_image LONGTEXT DEFAULT NULL,
  clinic_id INT DEFAULT NULL,
  is_default TINYINT(1) DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_mct_clinic (clinic_id, certificate_type, is_default),
  CONSTRAINT fk_mct_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE medical_certificates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  clinic_id INT NOT NULL,
  template_id INT DEFAULT NULL,
  certificate_type ENUM('sick_leave','fitness','discharge','pre_op_fitness','travel','disability','medical_report','other') NOT NULL,
  certificate_title VARCHAR(255) NOT NULL,
  diagnosis TEXT DEFAULT NULL,
  certificate_content TEXT NOT NULL,
  issued_date DATE NOT NULL,
  valid_from DATE DEFAULT NULL,
  valid_until DATE DEFAULT NULL,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_mc_patient (patient_id, issued_date),
  KEY idx_mc_clinic (clinic_id, issued_date),
  CONSTRAINT fk_mc_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_mc_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT fk_mc_template FOREIGN KEY (template_id) REFERENCES medical_certificate_templates(id) ON DELETE SET NULL,
  CONSTRAINT fk_mc_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE rx_template_config (
  id INT AUTO_INCREMENT PRIMARY KEY,
  doctor_id INT NOT NULL,
  template_name VARCHAR(255) DEFAULT NULL,
  template_type VARCHAR(100) DEFAULT NULL,
  content LONGTEXT DEFAULT NULL,
  is_default TINYINT(1) DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_rx_cfg_doctor (doctor_id, is_default),
  CONSTRAINT fk_rx_cfg_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE pad_configurations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  doctor_id INT NOT NULL,
  default_font_size INT DEFAULT 12,
  default_font_family VARCHAR(50) DEFAULT 'Arial',
  signature_image_url VARCHAR(500) DEFAULT NULL,
  clinic_name VARCHAR(255) DEFAULT NULL,
  clinic_details TEXT DEFAULT NULL,
  header_content TEXT DEFAULT NULL,
  footer_content TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_pad_doctor (doctor_id),
  CONSTRAINT fk_pad_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- SECTION 5: BILLING + IPD
-- =========================
DROP TABLE IF EXISTS insurance_claims;
DROP TABLE IF EXISTS insurance_policies;
DROP TABLE IF EXISTS insurance_providers;
DROP TABLE IF EXISTS bill_audit_log;
DROP TABLE IF EXISTS admission_bills;
DROP TABLE IF EXISTS admission_payments;
DROP TABLE IF EXISTS ipd_medicines_consumables;
DROP TABLE IF EXISTS ipd_daily_services;
DROP TABLE IF EXISTS ipd_room_charges;
DROP TABLE IF EXISTS admission_room_history;
DROP TABLE IF EXISTS patient_admissions;
DROP TABLE IF EXISTS admission_types;
DROP TABLE IF EXISTS beds;
DROP TABLE IF EXISTS rooms;
DROP TABLE IF EXISTS room_types;
DROP TABLE IF EXISTS bill_payments;
DROP TABLE IF EXISTS bill_items;
DROP TABLE IF EXISTS bills;
DROP TABLE IF EXISTS services;
DROP TABLE IF EXISTS service_categories;

CREATE TABLE service_categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  clinic_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT DEFAULT NULL,
  code VARCHAR(20) DEFAULT NULL,
  parent_id INT DEFAULT NULL,
  display_order INT DEFAULT 0,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_sc_clinic (clinic_id),
  KEY idx_sc_parent (parent_id),
  CONSTRAINT fk_sc_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT fk_sc_parent FOREIGN KEY (parent_id) REFERENCES service_categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  clinic_id INT NOT NULL,
  category_id INT DEFAULT NULL,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) DEFAULT NULL,
  description TEXT DEFAULT NULL,
  price DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  tax_percent DECIMAL(5,2) DEFAULT 0.00,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_service_code_clinic (clinic_id, code),
  KEY idx_service_search (clinic_id, is_active, name),
  KEY idx_service_category (category_id),
  CONSTRAINT fk_service_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT fk_service_category FOREIGN KEY (category_id) REFERENCES service_categories(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE bills (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  clinic_id INT NOT NULL,
  appointment_id INT DEFAULT NULL,
  doctor_id INT DEFAULT NULL,
  bill_number VARCHAR(50) DEFAULT NULL,
  template_id INT DEFAULT NULL,
  subtotal DECIMAL(12,2) DEFAULT 0.00,
  discount_percent DECIMAL(5,2) DEFAULT 0.00,
  discount_amount DECIMAL(12,2) DEFAULT 0.00,
  tax_percent DECIMAL(5,2) DEFAULT 0.00,
  tax_amount DECIMAL(12,2) DEFAULT 0.00,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  amount_paid DECIMAL(12,2) DEFAULT 0.00,
  balance_due DECIMAL(12,2) DEFAULT 0.00,
  payment_method ENUM('cash','card','upi','netbanking','cheque','wallet','insurance','credit','mixed') DEFAULT 'cash',
  payment_reference VARCHAR(100) DEFAULT NULL,
  payment_status ENUM('pending','partial','paid','overdue','cancelled','refunded') DEFAULT 'pending',
  bill_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  due_date DATE DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_by INT DEFAULT NULL,
  updated_by INT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_bill_number (bill_number),
  KEY idx_bill_clinic_date (clinic_id, bill_date, payment_status),
  KEY idx_bill_patient_date (patient_id, bill_date),
  CONSTRAINT fk_bill_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_bill_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT fk_bill_appt FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
  CONSTRAINT fk_bill_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL,
  CONSTRAINT fk_bill_template FOREIGN KEY (template_id) REFERENCES receipt_templates(id) ON DELETE SET NULL,
  CONSTRAINT fk_bill_creator FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE bill_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bill_id INT NOT NULL,
  service_id INT DEFAULT NULL,
  service_name VARCHAR(255) NOT NULL,
  quantity DECIMAL(12,2) DEFAULT 1.00,
  unit_price DECIMAL(12,2) NOT NULL,
  discount_amount DECIMAL(12,2) DEFAULT 0.00,
  tax_percent DECIMAL(5,2) DEFAULT 0.00,
  tax_amount DECIMAL(12,2) DEFAULT 0.00,
  total_price DECIMAL(12,2) NOT NULL,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_bill_item_bill (bill_id),
  KEY idx_bill_item_service (service_id),
  CONSTRAINT fk_bill_item_bill FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
  CONSTRAINT fk_bill_item_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE bill_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bill_id INT NOT NULL,
  payment_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  amount DECIMAL(12,2) NOT NULL,
  payment_method ENUM('cash','card','upi','netbanking','cheque','wallet','insurance','other') DEFAULT 'cash',
  payment_reference VARCHAR(100) DEFAULT NULL,
  transaction_id VARCHAR(100) DEFAULT NULL,
  status ENUM('pending','completed','failed','refunded','cancelled') DEFAULT 'completed',
  received_by INT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_payment_bill (bill_id),
  KEY idx_payment_date (payment_date),
  CONSTRAINT fk_payment_bill FOREIGN KEY (bill_id) REFERENCES bills(id) ON DELETE CASCADE,
  CONSTRAINT fk_payment_receiver FOREIGN KEY (received_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- IPD / ADMISSIONS
-- =========================
CREATE TABLE room_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  clinic_id INT NOT NULL,
  type_name VARCHAR(100) NOT NULL,
  description TEXT DEFAULT NULL,
  base_charge_per_day DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_room_type_clinic (clinic_id, is_active),
  CONSTRAINT fk_room_type_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE rooms (
  id INT AUTO_INCREMENT PRIMARY KEY,
  clinic_id INT NOT NULL,
  room_type_id INT NOT NULL,
  room_number VARCHAR(50) NOT NULL,
  floor VARCHAR(20) DEFAULT NULL,
  building VARCHAR(100) DEFAULT NULL,
  bed_count INT DEFAULT 1,
  status ENUM('available','occupied','maintenance','reserved') DEFAULT 'available',
  current_admission_id INT DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_room_number_clinic (room_number, clinic_id),
  KEY idx_room_available (clinic_id, status, room_type_id),
  CONSTRAINT fk_room_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT fk_room_type FOREIGN KEY (room_type_id) REFERENCES room_types(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE beds (
  id INT AUTO_INCREMENT PRIMARY KEY,
  room_id INT NOT NULL,
  clinic_id INT NOT NULL,
  bed_number VARCHAR(20) NOT NULL,
  status ENUM('available','occupied','maintenance','reserved','cleaning') DEFAULT 'available',
  current_patient_id INT DEFAULT NULL,
  current_admission_id INT DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_bed_room (room_id, bed_number),
  KEY idx_bed_available (clinic_id, status),
  CONSTRAINT fk_bed_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE CASCADE,
  CONSTRAINT fk_bed_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT fk_bed_patient FOREIGN KEY (current_patient_id) REFERENCES patients(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE admission_types (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type_code VARCHAR(20) NOT NULL,
  type_name VARCHAR(100) NOT NULL,
  description TEXT DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_admission_type_code (type_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE insurance_providers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_ins_code (code),
  KEY idx_ins_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE insurance_policies (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  provider_id INT DEFAULT NULL,
  provider_name VARCHAR(255) DEFAULT NULL,
  policy_number VARCHAR(100) NOT NULL,
  sum_insured DECIMAL(12,2) DEFAULT NULL,
  valid_from DATE DEFAULT NULL,
  valid_till DATE NOT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_policy_patient (patient_id),
  KEY idx_policy_provider (provider_id),
  KEY idx_policy_valid (valid_till, is_active),
  CONSTRAINT fk_policy_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_policy_provider FOREIGN KEY (provider_id) REFERENCES insurance_providers(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE patient_admissions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admission_number VARCHAR(50) NOT NULL,
  patient_id INT NOT NULL,
  doctor_id INT NOT NULL,
  clinic_id INT NOT NULL,
  appointment_id INT DEFAULT NULL,
  admission_type ENUM('IPD','OPD','DAYCARE','EMERGENCY','ICU') NOT NULL DEFAULT 'IPD',
  admission_date DATETIME NOT NULL,
  admission_time TIME NOT NULL,
  discharge_date DATETIME DEFAULT NULL,
  discharge_time TIME DEFAULT NULL,
  room_id INT DEFAULT NULL,
  bed_id INT DEFAULT NULL,
  chief_complaint TEXT DEFAULT NULL,
  provisional_diagnosis TEXT DEFAULT NULL,
  final_diagnosis TEXT DEFAULT NULL,
  status ENUM('admitted','discharged','transferred','cancelled') DEFAULT 'admitted',
  insurance_policy_id INT DEFAULT NULL,
  bill_locked TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_admission_number (admission_number),
  KEY idx_adm_active (clinic_id, status, admission_date),
  CONSTRAINT fk_adm_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE RESTRICT,
  CONSTRAINT fk_adm_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE RESTRICT,
  CONSTRAINT fk_adm_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT fk_adm_room FOREIGN KEY (room_id) REFERENCES rooms(id) ON DELETE SET NULL,
  CONSTRAINT fk_adm_bed FOREIGN KEY (bed_id) REFERENCES beds(id) ON DELETE SET NULL,
  CONSTRAINT fk_adm_policy FOREIGN KEY (insurance_policy_id) REFERENCES insurance_policies(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

ALTER TABLE rooms
  ADD CONSTRAINT fk_room_current_admission
  FOREIGN KEY (current_admission_id) REFERENCES patient_admissions(id) ON DELETE SET NULL;

CREATE TABLE admission_room_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admission_id INT NOT NULL,
  room_id INT NOT NULL,
  bed_id INT DEFAULT NULL,
  room_type_id INT NOT NULL,
  from_datetime DATETIME NOT NULL,
  to_datetime DATETIME DEFAULT NULL,
  daily_rate DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_arh_adm (admission_id, from_datetime),
  CONSTRAINT fk_arh_adm FOREIGN KEY (admission_id) REFERENCES patient_admissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ipd_room_charges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admission_id INT NOT NULL,
  charge_date DATE NOT NULL,
  room_id INT NOT NULL,
  room_type_id INT NOT NULL,
  total_charge DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_room_charge_date (admission_id, charge_date),
  CONSTRAINT fk_irc_adm FOREIGN KEY (admission_id) REFERENCES patient_admissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ipd_daily_services (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admission_id INT NOT NULL,
  service_date DATE NOT NULL,
  service_id INT DEFAULT NULL,
  service_name VARCHAR(255) NOT NULL,
  quantity DECIMAL(12,2) DEFAULT 1.00,
  unit_price DECIMAL(12,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,
  doctor_id INT DEFAULT NULL,
  status ENUM('ordered','completed','cancelled') DEFAULT 'completed',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ipd_serv (admission_id, service_date),
  CONSTRAINT fk_ids_adm FOREIGN KEY (admission_id) REFERENCES patient_admissions(id) ON DELETE CASCADE,
  CONSTRAINT fk_ids_service FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL,
  CONSTRAINT fk_ids_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE ipd_medicines_consumables (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admission_id INT NOT NULL,
  entry_date DATE NOT NULL,
  item_type ENUM('medicine','consumable') NOT NULL,
  medicine_id INT DEFAULT NULL,
  item_name VARCHAR(255) NOT NULL,
  quantity DECIMAL(12,2) NOT NULL,
  unit_price DECIMAL(12,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ipd_med (admission_id, entry_date),
  CONSTRAINT fk_imc_adm FOREIGN KEY (admission_id) REFERENCES patient_admissions(id) ON DELETE CASCADE,
  CONSTRAINT fk_imc_med FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE admission_payments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admission_id INT NOT NULL,
  payment_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  payment_type ENUM('advance','partial','final','refund') NOT NULL DEFAULT 'advance',
  amount DECIMAL(12,2) NOT NULL,
  payment_method VARCHAR(50) DEFAULT NULL,
  payment_reference VARCHAR(100) DEFAULT NULL,
  received_by INT DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_adm_pay (admission_id, payment_date),
  CONSTRAINT fk_adm_pay_adm FOREIGN KEY (admission_id) REFERENCES patient_admissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE admission_bills (
  id INT AUTO_INCREMENT PRIMARY KEY,
  admission_id INT NOT NULL,
  bill_number VARCHAR(50) NOT NULL,
  bill_date DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  gross_total DECIMAL(12,2) NOT NULL,
  net_payable DECIMAL(12,2) NOT NULL,
  amount_paid DECIMAL(12,2) DEFAULT 0.00,
  balance_due DECIMAL(12,2) DEFAULT 0.00,
  payment_status ENUM('unpaid','partial','paid','refund_pending') DEFAULT 'unpaid',
  is_locked TINYINT(1) DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_adm_bill_no (bill_number),
  UNIQUE KEY uk_adm_bill (admission_id),
  CONSTRAINT fk_adm_bill_adm FOREIGN KEY (admission_id) REFERENCES patient_admissions(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE bill_audit_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  bill_type ENUM('opd','ipd') NOT NULL DEFAULT 'opd',
  bill_id INT DEFAULT NULL,
  admission_id INT DEFAULT NULL,
  action VARCHAR(100) NOT NULL,
  field_changed VARCHAR(100) DEFAULT NULL,
  old_value TEXT DEFAULT NULL,
  new_value TEXT DEFAULT NULL,
  changed_by INT NOT NULL,
  change_reason TEXT DEFAULT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_audit_bill (bill_id),
  KEY idx_audit_adm (admission_id),
  KEY idx_audit_user (changed_by),
  CONSTRAINT fk_audit_bill_user FOREIGN KEY (changed_by) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE insurance_claims (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  policy_id INT NOT NULL,
  admission_id INT DEFAULT NULL,
  claim_number VARCHAR(100) DEFAULT NULL,
  claim_amount DECIMAL(12,2) NOT NULL,
  approved_amount DECIMAL(12,2) DEFAULT NULL,
  status ENUM('pending','submitted','under_process','approved','rejected','settled','cancelled') DEFAULT 'pending',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_claim_no (claim_number),
  KEY idx_claim_patient (patient_id),
  KEY idx_claim_policy (policy_id),
  KEY idx_claim_status (status),
  CONSTRAINT fk_claim_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_claim_policy FOREIGN KEY (policy_id) REFERENCES insurance_policies(id) ON DELETE CASCADE,
  CONSTRAINT fk_claim_adm FOREIGN KEY (admission_id) REFERENCES patient_admissions(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ========================================================================
-- PART 4: LAB + REPORTS + SUBSCRIPTIONS + GENIE AI + SYSTEM TABLES
-- MariaDB 10.6+ Compatible
-- ========================================================================

USE patient_management;
SET FOREIGN_KEY_CHECKS = 0;

-- =========================
-- DROP ALL SECTION 6 TABLES
-- =========================
DROP TABLE IF EXISTS procedures;
DROP TABLE IF EXISTS backup_logs;
DROP TABLE IF EXISTS import_history;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS audit_logs;
DROP TABLE IF EXISTS genie_suggestions;
DROP TABLE IF EXISTS genie_analyses;
DROP TABLE IF EXISTS patient_subscription_sessions;
DROP TABLE IF EXISTS patient_subscriptions;
DROP TABLE IF EXISTS package_sessions;
DROP TABLE IF EXISTS subscription_packages;
DROP TABLE IF EXISTS reports;
DROP TABLE IF EXISTS test_report_items;
DROP TABLE IF EXISTS test_reports;
DROP TABLE IF EXISTS lab_investigations;
DROP TABLE IF EXISTS lab_templates;

-- =========================
-- LAB INVESTIGATIONS
-- =========================
CREATE TABLE lab_templates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  clinic_id INT DEFAULT NULL,
  test_name VARCHAR(255) NOT NULL,
  test_code VARCHAR(100) DEFAULT NULL,
  category VARCHAR(100) DEFAULT NULL,
  sample_type VARCHAR(100) DEFAULT NULL,
  unit VARCHAR(50) DEFAULT NULL,
  reference_range VARCHAR(255) DEFAULT NULL,
  parameters JSON DEFAULT NULL,
  description TEXT DEFAULT NULL,
  special_instructions TEXT DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1,
  is_global TINYINT(1) DEFAULT 0,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_lab_code (clinic_id, test_code),
  KEY idx_lab_name (test_name),
  KEY idx_lab_cat (category),
  CONSTRAINT fk_lab_tpl_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT fk_lab_tpl_user FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE lab_investigations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  clinic_id INT NOT NULL,
  patient_id INT NOT NULL,
  doctor_id INT DEFAULT NULL,
  appointment_id INT DEFAULT NULL,
  lab_template_id INT DEFAULT NULL,
  test_name VARCHAR(255) NOT NULL,
  test_type VARCHAR(100) DEFAULT NULL,
  sample_type VARCHAR(100) DEFAULT NULL,
  ordered_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  sample_collection_date DATE DEFAULT NULL,
  result_date DATE DEFAULT NULL,
  status ENUM('pending','in-progress','completed','cancelled') DEFAULT 'pending',
  result_value VARCHAR(255) DEFAULT NULL,
  result_unit VARCHAR(50) DEFAULT NULL,
  reference_range VARCHAR(255) DEFAULT NULL,
  interpretation TEXT DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  ordered_by INT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_lab_patient_date (patient_id, ordered_date),
  KEY idx_lab_clinic_date (clinic_id, ordered_date, status),
  CONSTRAINT fk_li_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT fk_li_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_li_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL,
  CONSTRAINT fk_li_appt FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
  CONSTRAINT fk_li_tpl FOREIGN KEY (lab_template_id) REFERENCES lab_templates(id) ON DELETE SET NULL,
  CONSTRAINT fk_li_ordered_by FOREIGN KEY (ordered_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE test_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  clinic_id INT NOT NULL,
  lab_investigation_id INT DEFAULT NULL,
  patient_id INT NOT NULL,
  doctor_id INT DEFAULT NULL,
  appointment_id INT DEFAULT NULL,
  test_name VARCHAR(255) NOT NULL,
  test_type VARCHAR(100) DEFAULT NULL,
  result_summary TEXT DEFAULT NULL,
  file_path VARCHAR(500) DEFAULT NULL,
  file_type VARCHAR(50) DEFAULT NULL,
  test_date DATE DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_tr_patient_date (patient_id, test_date),
  CONSTRAINT fk_tr_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT fk_tr_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_tr_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL,
  CONSTRAINT fk_tr_appt FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
  CONSTRAINT fk_tr_lab FOREIGN KEY (lab_investigation_id) REFERENCES lab_investigations(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE test_report_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  report_id INT NOT NULL,
  parameter_name VARCHAR(255) NOT NULL,
  value VARCHAR(100) DEFAULT NULL,
  unit VARCHAR(50) DEFAULT NULL,
  normal_range VARCHAR(100) DEFAULT NULL,
  flag ENUM('normal','low','high','critical','abnormal') DEFAULT 'normal',
  sort_order INT DEFAULT 0,
  KEY idx_tri_report (report_id, sort_order),
  CONSTRAINT fk_tri_report FOREIGN KEY (report_id) REFERENCES test_reports(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- REPORTS (CLINICAL DOCUMENTS)
-- =========================
CREATE TABLE reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  clinic_id INT NOT NULL,
  patient_id INT NOT NULL,
  doctor_id INT DEFAULT NULL,
  appointment_id INT DEFAULT NULL,
  report_type ENUM('clinical_note','discharge_summary','referral_letter','procedure_note','opd_summary','other') DEFAULT 'clinical_note',
  report_title VARCHAR(255) DEFAULT NULL,
  report_content LONGTEXT DEFAULT NULL,
  generated_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  status ENUM('draft','finalized','archived') DEFAULT 'draft',
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at TIMESTAMP NULL DEFAULT NULL,
  KEY idx_reports_patient_date (patient_id, generated_date),
  CONSTRAINT fk_reports_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT fk_reports_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_reports_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL,
  CONSTRAINT fk_reports_appt FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
  CONSTRAINT fk_reports_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- SUBSCRIPTIONS / PACKAGES
-- =========================
CREATE TABLE subscription_packages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  clinic_id INT NOT NULL,
  doctor_id INT DEFAULT NULL,
  package_type ENUM('treatment_plan','wellness','preventive','emergency','chronic_care') DEFAULT 'treatment_plan',
  package_name VARCHAR(255) NOT NULL,
  description TEXT DEFAULT NULL,
  num_sessions INT DEFAULT 1,
  pricing_model ENUM('advance','per_session','monthly','quarterly','annual') DEFAULT 'advance',
  price_per_session DECIMAL(12,2) DEFAULT 0.00,
  total_price DECIMAL(12,2) DEFAULT 0.00,
  validity_days INT DEFAULT 365,
  is_active TINYINT(1) DEFAULT 1,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_pkg_clinic (clinic_id, is_active),
  CONSTRAINT fk_pkg_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT fk_pkg_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL,
  CONSTRAINT fk_pkg_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE package_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  package_id INT NOT NULL,
  session_number INT DEFAULT 1,
  session_title VARCHAR(255) DEFAULT NULL,
  session_description TEXT DEFAULT NULL,
  duration_minutes INT DEFAULT 30,
  session_type ENUM('consultation','procedure','therapy','followup') DEFAULT 'consultation',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_pkg_sessions (package_id, session_number),
  CONSTRAINT fk_pkg_sessions FOREIGN KEY (package_id) REFERENCES subscription_packages(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE patient_subscriptions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  clinic_id INT NOT NULL,
  patient_id INT NOT NULL,
  package_id INT NOT NULL,
  subscription_code VARCHAR(50) DEFAULT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  sessions_total INT DEFAULT 0,
  sessions_used INT DEFAULT 0,
  sessions_completed INT DEFAULT 0,
  last_session_date DATE DEFAULT NULL,
  status ENUM('active','expired','cancelled','completed') DEFAULT 'active',
  payment_status ENUM('pending','partial','paid','refunded') DEFAULT 'pending',
  amount_paid DECIMAL(12,2) DEFAULT 0.00,
  amount_due DECIMAL(12,2) DEFAULT 0.00,
  notes TEXT DEFAULT NULL,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uk_subscription_code (subscription_code),
  KEY idx_ps_patient (patient_id, status),
  CONSTRAINT fk_ps_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE CASCADE,
  CONSTRAINT fk_ps_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE CASCADE,
  CONSTRAINT fk_ps_package FOREIGN KEY (package_id) REFERENCES subscription_packages(id) ON DELETE RESTRICT,
  CONSTRAINT fk_ps_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE patient_subscription_sessions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  patient_subscription_id INT NOT NULL,
  package_session_id INT DEFAULT NULL,
  appointment_id INT DEFAULT NULL,
  session_date DATE NOT NULL DEFAULT (CURRENT_DATE),
  status ENUM('scheduled','completed','cancelled','no-show') DEFAULT 'completed',
  notes TEXT DEFAULT NULL,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_pss_sub (patient_subscription_id, session_date),
  CONSTRAINT fk_pss_sub FOREIGN KEY (patient_subscription_id) REFERENCES patient_subscriptions(id) ON DELETE CASCADE,
  CONSTRAINT fk_pss_pkg_session FOREIGN KEY (package_session_id) REFERENCES package_sessions(id) ON DELETE SET NULL,
  CONSTRAINT fk_pss_appt FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL,
  CONSTRAINT fk_pss_created_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- GENIE AI
-- =========================
CREATE TABLE genie_analyses (
  id INT AUTO_INCREMENT PRIMARY KEY,
  clinic_id INT DEFAULT NULL,
  patient_id INT DEFAULT NULL,
  doctor_id INT DEFAULT NULL,
  appointment_id INT DEFAULT NULL,
  symptoms JSON DEFAULT NULL,
  analysis_result JSON DEFAULT NULL,
  model_version VARCHAR(50) DEFAULT NULL,
  confidence_score DECIMAL(4,3) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_ga_patient (patient_id),
  CONSTRAINT fk_ga_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE SET NULL,
  CONSTRAINT fk_ga_patient FOREIGN KEY (patient_id) REFERENCES patients(id) ON DELETE SET NULL,
  CONSTRAINT fk_ga_doctor FOREIGN KEY (doctor_id) REFERENCES doctors(id) ON DELETE SET NULL,
  CONSTRAINT fk_ga_appt FOREIGN KEY (appointment_id) REFERENCES appointments(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE genie_suggestions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  analysis_id INT DEFAULT NULL,
  analysis_result JSON DEFAULT NULL,
  diagnosis_text TEXT DEFAULT NULL,
  medicines_suggested JSON DEFAULT NULL,
  confidence_score DECIMAL(4,3) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_gs_analysis (analysis_id),
  CONSTRAINT fk_gs_analysis FOREIGN KEY (analysis_id) REFERENCES genie_analyses(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- AUDIT & SYSTEM LOGS
-- =========================
CREATE TABLE audit_logs (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  clinic_id INT DEFAULT NULL,
  user_id INT DEFAULT NULL,
  action VARCHAR(255) NOT NULL,
  entity VARCHAR(255) DEFAULT NULL,
  entity_id VARCHAR(255) DEFAULT NULL,
  details LONGTEXT DEFAULT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  user_agent VARCHAR(500) DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_audit_clinic (clinic_id),
  KEY idx_audit_user (user_id),
  KEY idx_audit_entity (entity, entity_id),
  CONSTRAINT fk_audit_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE SET NULL,
  CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE notifications (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  clinic_id INT DEFAULT NULL,
  user_id INT NOT NULL,
  title VARCHAR(255) DEFAULT NULL,
  message TEXT DEFAULT NULL,
  type ENUM('info','success','warning','error') DEFAULT 'info',
  is_read TINYINT(1) DEFAULT 0,
  read_at TIMESTAMP NULL DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_notifications_user (user_id, is_read, created_at),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_notifications_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE import_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  clinic_id INT DEFAULT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_type VARCHAR(50) DEFAULT NULL,
  total_records INT DEFAULT 0,
  imported_count INT DEFAULT 0,
  failed_count INT DEFAULT 0,
  status ENUM('pending','processing','completed','failed') DEFAULT 'pending',
  error_details LONGTEXT DEFAULT NULL,
  imported_by INT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_import_status (status),
  KEY idx_import_clinic (clinic_id),
  CONSTRAINT fk_import_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE SET NULL,
  CONSTRAINT fk_import_by FOREIGN KEY (imported_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE backup_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  clinic_id INT DEFAULT NULL,
  backup_type ENUM('full','schema','data','incremental') DEFAULT 'full',
  backup_date TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  file_path VARCHAR(500) DEFAULT NULL,
  status ENUM('success','failed','in_progress') DEFAULT 'in_progress',
  notes TEXT DEFAULT NULL,
  created_by INT DEFAULT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_backup_status (status),
  KEY idx_backup_date (backup_date),
  CONSTRAINT fk_backup_clinic FOREIGN KEY (clinic_id) REFERENCES clinics(id) ON DELETE SET NULL,
  CONSTRAINT fk_backup_by FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE procedures (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cpt_code VARCHAR(20) NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT DEFAULT NULL,
  cost DECIMAL(12,2) DEFAULT NULL,
  is_active TINYINT(1) DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uk_procedures_cpt (cpt_code),
  KEY idx_procedures_name (name),
  KEY idx_procedures_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- =========================
-- DATA INSERTS: MEDICINES (51 records)
-- =========================
INSERT INTO medicines (id, name, generic_name, brand, dosage_form, strength, category, is_active) VALUES
(1, 'Paracetamol', 'Paracetamol', 'Crocin', 'Tablet', '500mg', 'Analgesic', 1),
(2, 'Ibuprofen', 'Ibuprofen', 'Brufen', 'Tablet', '400mg', 'NSAID', 1),
(3, 'Aspirin', 'Acetylsalicylic acid', 'Disprin', 'Tablet', '500mg', 'Analgesic', 1),
(4, 'Cough Syrup', 'Ambroxol', 'Mucodyne', 'Syrup', '30ml', 'Cough suppressant', 1),
(5, 'Dextromethorphan', 'Dextromethorphan', 'Robitussin', 'Syrup', '10mg/5ml', 'Cough suppressant', 1),
(6, 'Chlorpheniramine', 'Chlorpheniramine maleate', 'Avil', 'Tablet', '4mg', 'Antihistamine', 1),
(7, 'Expectorant', 'Guaifenesin', 'Mucosol', 'Syrup', '100mg/5ml', 'Expectorant', 1),
(8, 'Diclofenac', 'Diclofenac sodium', 'Voveran', 'Tablet', '50mg', 'NSAID', 1),
(9, 'Loperamide', 'Loperamide', 'Imodium', 'Capsule', '2mg', 'Antidiarrheal', 1),
(10, 'ORS', 'Oral Rehydration Salt', 'WHO-ORS', 'Sachet', '1L', 'Electrolyte', 1),
(11, 'Zinc', 'Zinc sulfate', 'Zincare', 'Tablet', '10mg', 'Supplement', 1),
(12, 'Lactulose', 'Lactulose', 'Duphalac', 'Syrup', '10mg/15ml', 'Laxative', 1),
(13, 'Psyllium Husk', 'Psyllium husk', 'Isabgol', 'Powder', '5g', 'Laxative', 1),
(14, 'Senna', 'Senna leaf', 'Senokot', 'Tablet', '8.6mg', 'Laxative', 1),
(15, 'Omeprazole', 'Omeprazole', 'Prilosec', 'Capsule', '20mg', 'PPI', 1),
(16, 'Ranitidine', 'Ranitidine', 'Zantac', 'Tablet', '150mg', 'H2 blocker', 1),
(17, 'Antacid', 'Aluminum hydroxide', 'Digene', 'Gel', '200ml', 'Antacid', 1),
(18, 'Rabeprazole', 'Rabeprazole', 'Aciphex', 'Tablet', '20mg', 'PPI', 1),
(19, 'Pantoprazole', 'Pantoprazole', 'Pantopan', 'Tablet', '40mg', 'PPI', 1),
(20, 'Ondansetron', 'Ondansetron', 'Emeset', 'Tablet', '4mg', 'Antiemetic', 1),
(21, 'Metoclopramide', 'Metoclopramide', 'Maxolon', 'Tablet', '10mg', 'Antiemetic', 1),
(22, 'Domperidone', 'Domperidone', 'Motilium', 'Tablet', '10mg', 'Antiemetic', 1),
(23, 'Cetirizine', 'Cetirizine', 'Allergin', 'Tablet', '10mg', 'Antihistamine', 1),
(24, 'Loratadine', 'Loratadine', 'Claritin', 'Tablet', '10mg', 'Antihistamine', 1),
(25, 'Hydrocortisone Cream', 'Hydrocortisone', 'Lanacort', 'Cream', '1%', 'Corticosteroid', 1),
(26, 'Amlodipine', 'Amlodipine besylate', 'Norvasc', 'Tablet', '5mg', 'Calcium channel blocker', 1),
(27, 'Enalapril', 'Enalapril maleate', 'Renitec', 'Tablet', '5mg', 'ACE inhibitor', 1),
(28, 'Lisinopril', 'Lisinopril', 'Prinivil', 'Tablet', '10mg', 'ACE inhibitor', 1),
(29, 'Metoprolol', 'Metoprolol tartrate', 'Lopressor', 'Tablet', '50mg', 'Beta blocker', 1),
(30, 'Metformin', 'Metformin HCl', 'Glucophage', 'Tablet', '500mg', 'Antidiabetic', 1),
(31, 'Glimepiride', 'Glimepiride', 'Amaryl', 'Tablet', '2mg', 'Antidiabetic', 1),
(32, 'Insulin', 'Insulin', 'Lantus', 'Injection', '100IU/ml', 'Antidiabetic', 1),
(33, 'Glipizide', 'Glipizide', 'Glucotrol', 'Tablet', '5mg', 'Antidiabetic', 1),
(34, 'Salbutamol', 'Salbutamol', 'Ventolin', 'Inhaler', '100mcg', 'Bronchodilator', 1),
(35, 'Fluticasone', 'Fluticasone propionate', 'Flovent', 'Inhaler', '110mcg', 'Corticosteroid', 1),
(36, 'Budesonide', 'Budesonide', 'Pulmicort', 'Inhaler', '200mcg', 'Corticosteroid', 1),
(37, 'Theophylline', 'Theophylline', 'Bronchophylline', 'Tablet', '100mg', 'Bronchodilator', 1),
(38, 'Ipratropium', 'Ipratropium bromide', 'Atrovent', 'Inhaler', '20mcg', 'Anticholinergic', 1),
(39, 'Amoxicillin', 'Amoxicillin', 'Amoxyl', 'Capsule', '500mg', 'Antibiotic', 1),
(40, 'Ciprofloxacin', 'Ciprofloxacin', 'Cipro', 'Tablet', '500mg', 'Antibiotic', 1),
(41, 'Azithromycin', 'Azithromycin', 'Zithromax', 'Tablet', '500mg', 'Antibiotic', 1),
(42, 'Isoniazid', 'Isoniazid', 'INH', 'Tablet', '300mg', 'Antitubercular', 1),
(43, 'Rifampicin', 'Rifampicin', 'Rifadin', 'Capsule', '450mg', 'Antitubercular', 1),
(44, 'Pyrazinamide', 'Pyrazinamide', 'PZA', 'Tablet', '500mg', 'Antitubercular', 1),
(45, 'Ketorolac', 'Ketorolac tromethamine', 'Toradol', 'Tablet', '10mg', 'NSAID', 1),
(46, 'Throat Lozenges', 'Menthol', 'Strepsils', 'Lozenge', '2mg', 'Throat relief', 1),
(47, 'Vitamin C', 'Ascorbic acid', 'Cevit', 'Tablet', '500mg', 'Supplement', 1),
(48, 'Decongestant', 'Pseudoephedrine', 'Sudafed', 'Tablet', '30mg', 'Decongestant', 1),
(49, 'Supportive care', 'Supportive care', 'N/A', 'N/A', 'N/A', 'Supportive', 1),
(50, 'Sodium Chloride IV', 'Sodium chloride', 'Normal Saline', 'IV', '0.9%', 'Electrolyte', 1),
(51, 'Fluids', 'Electrolyte solution', 'Various', 'Oral', 'N/A', 'Hydration', 1)
ON DUPLICATE KEY UPDATE name=VALUES(name);

-- =========================
-- DATA INSERTS: SYMPTOM MEDICATION MAPPING (83 records)
-- =========================
INSERT INTO symptom_medication_mapping (symptom_name, medication_name, medicine_id, dosage_form, strength, frequency, duration, recommendation_priority, is_first_line, severity_level, age_group) VALUES
('acid reflux', 'Omeprazole', 15, 'Capsule', '20mg', '', '', 1, 1, 'Any', 'All'),
('acid reflux', 'Pantoprazole', 19, 'Tablet', '40mg', '', '', 1, 1, 'Any', 'All'),
('acid reflux', 'Ranitidine', 16, 'Tablet', '150mg', '', '', 1, 1, 'Any', 'All'),
('acidity', 'Omeprazole', 15, 'Capsule', '20mg', '', '', 2, 1, 'Any', 'All'),
('acidity', 'Ranitidine', 16, 'Tablet', '150mg', '', '', 2, 1, 'Any', 'All'),
('acidity', 'Antacid', 17, 'Gel', '200ml', '', '', 2, 1, 'Any', 'All'),
('acute pain', 'Diclofenac', 8, 'Tablet', '50mg', '', '', 1, 1, 'Any', 'All'),
('acute pain', 'Ibuprofen', 2, 'Tablet', '400mg', '', '', 1, 1, 'Any', 'All'),
('acute pain', 'Ketorolac', 45, 'Tablet', '10mg', '', '', 1, 1, 'Any', 'All'),
('allergy', 'Cetirizine', 23, 'Tablet', '10mg', '', '', 2, 1, 'Any', 'All'),
('allergy', 'Loratadine', 24, 'Tablet', '10mg', '', '', 2, 1, 'Any', 'All'),
('allergy', 'Chlorpheniramine', 6, 'Tablet', '4mg', '', '', 2, 1, 'Any', 'All'),
('asthma', 'Salbutamol', 34, 'Inhaler', '100mcg', '', '', 1, 1, 'Any', 'All'),
('asthma', 'Fluticasone', 35, 'Inhaler', '110mcg', '', '', 1, 1, 'Any', 'All'),
('asthma', 'Budesonide', 36, 'Inhaler', '200mcg', '', '', 1, 1, 'Any', 'All'),
('bacterial infection', 'Amoxicillin', 39, 'Capsule', '500mg', '', '', 1, 1, 'Any', 'All'),
('bacterial infection', 'Ciprofloxacin', 40, 'Tablet', '500mg', '', '', 1, 1, 'Any', 'All'),
('bacterial infection', 'Azithromycin', 41, 'Tablet', '500mg', '', '', 1, 1, 'Any', 'All'),
('body ache', 'Ibuprofen', 2, 'Tablet', '400mg', '', '', 3, 1, 'Any', 'All'),
('body ache', 'Paracetamol', 1, 'Tablet', '500mg', '', '', 3, 1, 'Any', 'All'),
('body ache', 'Aspirin', 3, 'Tablet', '500mg', '', '', 3, 1, 'Any', 'All'),
('cold', 'Paracetamol', 1, 'Tablet', '500mg', '', '', 5, 0, 'Any', 'All'),
('cold', 'Vitamin C', 47, 'Tablet', '500mg', '', '', 5, 0, 'Any', 'All'),
('cold', 'Decongestant', 48, 'Tablet', '30mg', '', '', 5, 0, 'Any', 'All'),
('common cold', 'Paracetamol', 1, 'Tablet', '500mg', '', '', 3, 0, 'Any', 'All'),
('common cold', 'Chlorpheniramine', 6, 'Tablet', '4mg', '', '', 3, 0, 'Any', 'All'),
('common cold', 'Pseudoephedrine', 48, 'Tablet', '30mg', '', '', 3, 0, 'Any', 'All'),
('constipation', 'Lactulose', 12, 'Syrup', '10mg/15ml', '', '', 2, 1, 'Any', 'All'),
('constipation', 'Psyllium Husk', 13, 'Powder', '5g', '', '', 2, 1, 'Any', 'All'),
('constipation', 'Senna', 14, 'Tablet', '8.6mg', '', '', 2, 1, 'Any', 'All'),
('cough', 'Cough Syrup', 4, 'Syrup', '30ml', '', '', 5, 0, 'Any', 'All'),
('cough', 'Dextromethorphan', 5, 'Syrup', '10mg/5ml', '', '', 5, 0, 'Any', 'All'),
('diabetes', 'Metformin', 30, 'Tablet', '500mg', '', '', 1, 1, 'Any', 'All'),
('diabetes', 'Glimepiride', 31, 'Tablet', '2mg', '', '', 1, 1, 'Any', 'All'),
('diabetes', 'Insulin', 32, 'Injection', '100IU/ml', '', '', 1, 1, 'Any', 'All'),
('diarrhea', 'Loperamide', 9, 'Capsule', '2mg', '', '', 3, 1, 'Any', 'All'),
('diarrhea', 'ORS', 10, 'Sachet', '1L', '', '', 3, 1, 'Any', 'All'),
('dry cough', 'Dextromethorphan', 5, 'Syrup', '10mg/5ml', '', '', 3, 1, 'Any', 'All'),
('dry cough', 'Chlorpheniramine', 6, 'Tablet', '4mg', '', '', 3, 1, 'Any', 'All'),
('fever', 'Paracetamol', 1, 'Tablet', '500mg', '', '', 1, 1, 'Any', 'All'),
('fever', 'Ibuprofen', 2, 'Tablet', '400mg', '', '', 1, 1, 'Any', 'All'),
('fever', 'Aspirin', 3, 'Tablet', '500mg', '', '', 1, 1, 'Any', 'All'),
('headache', 'Paracetamol', 1, 'Tablet', '500mg', '', '', 2, 1, 'Any', 'All'),
('headache', 'Ibuprofen', 2, 'Tablet', '400mg', '', '', 2, 1, 'Any', 'All'),
('headache', 'Aspirin', 3, 'Tablet', '500mg', '', '', 2, 1, 'Any', 'All'),
('heartburn', 'Omeprazole', 15, 'Capsule', '20mg', '', '', 1, 1, 'Any', 'All'),
('heartburn', 'Rabeprazole', 18, 'Tablet', '20mg', '', '', 1, 1, 'Any', 'All'),
('heartburn', 'Antacid', 17, 'Gel', '200ml', '', '', 1, 1, 'Any', 'All'),
('high blood pressure', 'Amlodipine', 26, 'Tablet', '5mg', '', '', 1, 1, 'Any', 'All'),
('high blood pressure', 'Enalapril', 27, 'Tablet', '5mg', '', '', 1, 1, 'Any', 'All'),
('high blood pressure', 'Lisinopril', 28, 'Tablet', '10mg', '', '', 1, 1, 'Any', 'All'),
('high blood sugar', 'Metformin', 30, 'Tablet', '500mg', '', '', 1, 1, 'Any', 'All'),
('high blood sugar', 'Glipizide', 33, 'Tablet', '5mg', '', '', 1, 1, 'Any', 'All'),
('high blood sugar', 'Insulin', 32, 'Injection', '100IU/ml', '', '', 1, 1, 'Any', 'All'),
('high fever', 'Paracetamol', 1, 'Tablet', '500mg', '', '', 1, 1, 'Any', 'All'),
('high fever', 'Ibuprofen', 2, 'Tablet', '400mg', '', '', 1, 1, 'Any', 'All'),
('loose motions', 'Loperamide', 9, 'Capsule', '2mg', '', '', 2, 1, 'Any', 'All'),
('loose motions', 'ORS', 10, 'Sachet', '1L', '', '', 2, 1, 'Any', 'All'),
('loose motions', 'Zinc', 11, 'Tablet', '10mg', '', '', 2, 1, 'Any', 'All'),
('migraine', 'Ibuprofen', 2, 'Tablet', '400mg', '', '', 1, 1, 'Any', 'All'),
('migraine', 'Paracetamol', 1, 'Tablet', '500mg', '', '', 1, 1, 'Any', 'All'),
('muscle pain', 'Ibuprofen', 2, 'Tablet', '400mg', '', '', 2, 1, 'Any', 'All'),
('muscle pain', 'Diclofenac', 8, 'Tablet', '50mg', '', '', 2, 1, 'Any', 'All'),
('muscle pain', 'Paracetamol', 1, 'Tablet', '500mg', '', '', 2, 1, 'Any', 'All'),
('nausea', 'Ondansetron', 20, 'Tablet', '4mg', '', '', 2, 1, 'Any', 'All'),
('nausea', 'Metoclopramide', 21, 'Tablet', '10mg', '', '', 2, 1, 'Any', 'All'),
('nausea', 'Domperidone', 22, 'Tablet', '10mg', '', '', 2, 1, 'Any', 'All'),
('pain', 'Paracetamol', 1, 'Tablet', '500mg', '', '', 2, 1, 'Any', 'All'),
('pain', 'Ibuprofen', 2, 'Tablet', '400mg', '', '', 2, 1, 'Any', 'All'),
('pain', 'Diclofenac', 8, 'Tablet', '50mg', '', '', 2, 1, 'Any', 'All'),
('shortness of breath', 'Salbutamol', 34, 'Inhaler', '100mcg', '', '', 1, 1, 'Any', 'All'),
('shortness of breath', 'Theophylline', 37, 'Tablet', '100mg', '', '', 1, 1, 'Any', 'All'),
('shortness of breath', 'Ipratropium', 38, 'Inhaler', '20mcg', '', '', 1, 1, 'Any', 'All'),
('skin allergy', 'Cetirizine', 23, 'Tablet', '10mg', '', '', 2, 1, 'Any', 'All'),
('skin allergy', 'Loratadine', 24, 'Tablet', '10mg', '', '', 2, 1, 'Any', 'All'),
('skin allergy', 'Hydrocortisone Cream', 25, 'Cream', '1%', '', '', 2, 1, 'Any', 'All'),
('sore throat', 'Throat Lozenges', 46, 'Lozenge', '2mg', '', '', 2, 0, 'Any', 'All'),
('sore throat', 'Amoxicillin', 39, 'Capsule', '500mg', '', '', 2, 0, 'Any', 'All'),
('sore throat', 'Azithromycin', 41, 'Tablet', '500mg', '', '', 2, 0, 'Any', 'All'),
('vomiting', 'Ondansetron', 20, 'Tablet', '4mg', '', '', 1, 1, 'Any', 'All'),
('vomiting', 'Metoclopramide', 21, 'Tablet', '10mg', '', '', 1, 1, 'Any', 'All'),
('wet cough', 'Expectorant', 7, 'Syrup', '100mg/5ml', '', '', 2, 1, 'Any', 'All'),
('wet cough', 'Guaifenesin', 7, 'Syrup', '100mg/5ml', '', '', 2, 1, 'Any', 'All')
ON DUPLICATE KEY UPDATE medication_name=VALUES(medication_name);

-- =========================
-- DATA INSERTS: DIAGNOSIS MEDICATION MAPPING (18 records)
-- =========================
INSERT INTO diagnosis_medication_mapping (icd_code, diagnosis_name, medication_name, medicine_id, dosage_form, strength, frequency, duration, line_of_therapy, evidence_level) VALUES
('A16.9', 'Tuberculosis', 'Isoniazid', 42, 'Tablet', '300mg', '', '', 'First-line', 'B'),
('A16.9', 'Tuberculosis', 'Rifampicin', 43, 'Capsule', '450mg', '', '', 'First-line', 'B'),
('A16.9', 'Tuberculosis', 'Pyrazinamide', 44, 'Tablet', '500mg', '', '', 'First-line', 'B'),
('B06', 'Rubella', 'Supportive care', 49, 'N/A', 'N/A', '', '', 'First-line', 'B'),
('B06', 'Rubella', 'Paracetamol', 1, 'Tablet', '500mg', '', '', 'First-line', 'B'),
('E11.9', 'Type 2 diabetes mellitus', 'Metformin', 30, 'Tablet', '500mg', '', '', 'First-line', 'B'),
('E11.9', 'Type 2 diabetes mellitus', 'Glimepiride', 31, 'Tablet', '2mg', '', '', 'First-line', 'B'),
('E11.9', 'Type 2 diabetes mellitus', 'Insulin', 32, 'Injection', '100IU/ml', '', '', 'First-line', 'B'),
('I10', 'Essential (primary) hypertension', 'Amlodipine', 26, 'Tablet', '5mg', '', '', 'First-line', 'B'),
('I10', 'Essential (primary) hypertension', 'Enalapril', 27, 'Tablet', '5mg', '', '', 'First-line', 'B'),
('I10', 'Essential (primary) hypertension', 'Metoprolol', 29, 'Tablet', '50mg', '', '', 'First-line', 'B'),
('J45.9', 'Asthma unspecified', 'Salbutamol', 34, 'Inhaler', '100mcg', '', '', 'First-line', 'B'),
('J45.9', 'Asthma unspecified', 'Fluticasone', 35, 'Inhaler', '110mcg', '', '', 'First-line', 'B'),
('J45.9', 'Asthma unspecified', 'Budesonide', 36, 'Inhaler', '200mcg', '', '', 'First-line', 'B'),
('K21.9', 'Unspecified reflux esophagitis', 'Omeprazole', 15, 'Capsule', '20mg', '', '', 'First-line', 'B'),
('K21.9', 'Unspecified reflux esophagitis', 'Pantoprazole', 19, 'Tablet', '40mg', '', '', 'First-line', 'B'),
('R50.9', 'Fever unspecified', 'Paracetamol', 1, 'Tablet', '500mg', '', '', 'First-line', 'B'),
('R50.9', 'Fever unspecified', 'Ibuprofen', 2, 'Tablet', '400mg', '', '', 'First-line', 'B')
ON DUPLICATE KEY UPDATE medication_name=VALUES(medication_name);

-- =========================
-- DATA INSERTS: SNOMED CLINICAL FINDINGS (58 records)
-- =========================
DELETE FROM snomed_clinical_findings;

INSERT INTO snomed_clinical_findings (clinical_term, finding_type, icd_code, icd_description, is_active) VALUES
('Fever', 'Symptom', 'R50.9', 'Fever', 1),
('High fever', 'Symptom', 'R50.9', 'High Fever', 1),
('Hypertension', 'Diagnosis', 'I10', 'Essential Hypertension', 1),
('High blood pressure', 'Symptom', 'I10', 'High Blood Pressure', 1),
('Asthma', 'Diagnosis', 'J45.9', 'Asthma', 1),
('Shortness of breath', 'Symptom', 'J45.9', 'Asthma', 1),
('Diabetes', 'Diagnosis', 'E11.9', 'Type 2 Diabetes', 1),
('High blood sugar', 'Symptom', 'E11.9', 'Diabetes', 1),
('GERD', 'Diagnosis', 'K21.9', 'Reflux Esophagitis', 1),
('Acid reflux', 'Symptom', 'K21.9', 'GERD', 1),
('Heartburn', 'Symptom', 'K21.9', 'GERD Symptoms', 1),
('Tuberculosis', 'Diagnosis', 'A16.9', 'Tuberculosis', 1),
('Rubella', 'Diagnosis', 'B06', 'Rubella', 1),
('Body temperature above reference range', 'Symptom', 'R50.9', 'Body temperature above reference range', 1),
('Pyrexia', 'Symptom', 'R50.9', 'Pyrexia', 1),
('Febrile state', 'Symptom', 'R50.9', 'Febrile state', 1),
('Essential hypertension', 'Symptom', 'I10', 'Essential hypertension', 1),
('Blood pressure raised', 'Symptom', 'I10', 'Blood pressure raised', 1),
('Hypertensive disorder', 'Symptom', 'I10', 'Hypertensive disorder', 1),
('Elevated blood pressure', 'Symptom', 'I10', 'Elevated blood pressure', 1),
('Asthma', 'Symptom', 'J45.9', 'Asthma', 1),
('Bronchial asthma', 'Symptom', 'J45.9', 'Bronchial asthma', 1),
('Asthmatic bronchitis', 'Symptom', 'J45.9', 'Asthmatic bronchitis', 1),
('Wheezing', 'Symptom', 'J45.9', 'Wheezing', 1),
('Diabetes mellitus', 'Symptom', 'E11.9', 'Diabetes mellitus', 1),
('Type 2 diabetes mellitus', 'Symptom', 'E11.9', 'Type 2 diabetes mellitus', 1),
('Hyperglycemia', 'Symptom', 'E11.9', 'Hyperglycemia', 1),
('Gastro-esophageal reflux disease', 'Symptom', 'K21.9', 'Gastro-esophageal reflux disease', 1),
('Reflux esophagitis', 'Symptom', 'K21.9', 'Reflux esophagitis', 1),
('Pulmonary tuberculosis', 'Symptom', 'A16.9', 'Pulmonary tuberculosis', 1),
('Mycobacterial infection', 'Symptom', 'A16.9', 'Mycobacterial infection', 1),
('German measles', 'Symptom', 'B06', 'German measles', 1),
('Viral infection with rash', 'Symptom', 'B06', 'Viral infection with rash', 1),
('Pain', 'Symptom', 'R52.9', 'Pain', 1),
('Acute pain', 'Symptom', 'R52.9', 'Acute pain', 1),
('Muscle pain', 'Symptom', 'R52.9', 'Muscle pain', 1),
('Body ache', 'Symptom', 'R52.9', 'Body ache', 1),
('Diarrhea', 'Symptom', 'A09', 'Diarrhea', 1),
('Loose motions', 'Symptom', 'A09', 'Loose motions', 1),
('Gastroenteritis', 'Symptom', 'A09', 'Gastroenteritis', 1),
('Allergy', 'Symptom', 'T78.4', 'Allergy', 1),
('Allergic reaction', 'Symptom', 'T78.4', 'Allergic reaction', 1),
('Skin allergy', 'Symptom', 'T78.4', 'Skin allergy', 1),
('Sore throat', 'Symptom', 'J02.9', 'Sore throat', 1),
('Pharyngitis', 'Symptom', 'J02.9', 'Pharyngitis', 1),
('Throat infection', 'Symptom', 'J02.9', 'Throat infection', 1),
('Common cold', 'Symptom', 'J00', 'Common cold', 1),
('Acute nasopharyngitis', 'Symptom', 'J00', 'Acute nasopharyngitis', 1),
('Cold', 'Symptom', 'J00', 'Cold', 1),
('Constipation', 'Symptom', 'K59.1', 'Constipation', 1),
('Difficulty with defecation', 'Symptom', 'K59.1', 'Difficulty with defecation', 1)
ON DUPLICATE KEY UPDATE clinical_term=VALUES(clinical_term);

SET FOREIGN_KEY_CHECKS = 1;

-- ========================================================================
-- END OF PART 4
-- ========================================================================
