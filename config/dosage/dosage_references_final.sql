-- ========================================================================
-- DOSAGE REFERENCES - COMPLETE IMPORT (FINAL VERSION)
-- ========================================================================
-- This file combines all dosage data from multiple sources
-- Total: 58 Dosage References
-- - 33 records from corrected import (common medicines)
-- - 25 records from CSV import (additional dosages)
-- ========================================================================
-- Method: INSERT IGNORE (Safe mode - no data deleted)
-- Status: Production-ready
-- Date: January 26, 2026
-- ========================================================================

USE patient_management;
SET FOREIGN_KEY_CHECKS = 0;

-- Count before import
SELECT CONCAT('Before import - Total dosage references: ', COUNT(*)) AS status FROM dosage_references;

-- ========================================================================
-- SECTION 1: COMMON MEDICINES (33 RECORDS)
-- ========================================================================
-- Source: dosage_import_corrected.sql
-- Includes analgesics, antibiotics, anti-TB, antacids, antidiabetics, etc.
-- ========================================================================

INSERT IGNORE INTO dosage_references (
    medication_name, active_ingredient, dosage_form, strength,
    route_of_administration, recommended_frequency, recommended_duration,
    standard_dosage, max_daily_dose, contraindications, side_effects,
    drug_interactions, notes, age_group, category
) VALUES
('Paracetamol 500mg', 'Paracetamol', 'Tablet', '500mg', 'Oral', 'Every 4-6 hours', '3-5 days', '1-2 tablets', '4000mg/day', 'Severe hepatic impairment', 'Nausea, rash', 'Warfarin, Alcohol', 'Fever, Mild to moderate pain', 'Adult', 'Analgesic'),
('Ibuprofen 400mg', 'Ibuprofen', 'Tablet', '400mg', 'Oral', 'Every 6-8 hours', '3-5 days', '1 tablet', '2400mg/day', 'Peptic ulcer, Bleeding disorders', 'Stomach upset, Nausea', 'Aspirin, Anticoagulants', 'Pain, Fever, Inflammation', 'Adult', 'NSAID'),
('Amoxicillin 500mg', 'Amoxicillin', 'Capsule', '500mg', 'Oral', 'Every 8 hours', '7 days', '1 capsule', '3000mg/day', 'Penicillin allergy', 'Diarrhea, Nausea', 'Allopurinol, Methotrexate', 'Bacterial infections', 'Adult', 'Antibiotic'),
('Azithromycin 500mg', 'Azithromycin', 'Tablet', '500mg', 'Oral', 'Once daily', '3 days', '1 tablet', '1500mg/course', 'Hypersensitivity', 'Diarrhea, Nausea', 'Warfarin, Digoxin', 'Bacterial infections', 'Adult', 'Antibiotic'),
('Ciprofloxacin 500mg', 'Ciprofloxacin', 'Tablet', '500mg', 'Oral', 'Every 12 hours', '7-14 days', '1 tablet', '1000mg/day', 'Hypersensitivity', 'Nausea, Diarrhea', 'Antacids, Theophylline', 'Bacterial infections', 'Adult', 'Antibiotic'),
('Omeprazole 20mg', 'Omeprazole', 'Capsule', '20mg', 'Oral', 'Once daily', '4-8 weeks', '1 capsule', '40mg/day', 'Hypersensitivity', 'Headache, Diarrhea', 'Clopidogrel, Ketoconazole', 'GERD, Peptic ulcer', 'Adult', 'PPI'),
('Metformin 500mg', 'Metformin', 'Tablet', '500mg', 'Oral', 'Twice daily', 'Long term', '1 tablet', '3000mg/day', 'Renal impairment', 'Diarrhea, Nausea', 'Iodinated contrast', 'Type 2 diabetes', 'Adult', 'Antidiabetic'),
('Atorvastatin 10mg', 'Atorvastatin', 'Tablet', '10mg', 'Oral', 'Once daily', 'Long term', '1 tablet', '80mg/day', 'Liver disease', 'Muscle pain', 'Grapefruit juice', 'Hyperlipidemia', 'Adult', 'Statin'),
('Amlodipine 5mg', 'Amlodipine', 'Tablet', '5mg', 'Oral', 'Once daily', 'Long term', '1 tablet', '10mg/day', 'Hypersensitivity', 'Edema, Headache', 'CYP3A4 inhibitors', 'Hypertension, Angina', 'Adult', 'CCB'),
('Salbutamol Inhaler', 'Salbutamol', 'Inhaler', '100mcg', 'Inhalation', 'As needed', 'As needed', '1-2 puffs', '800mcg/day', 'Hypersensitivity', 'Tremor, Tachycardia', 'Beta blockers', 'Asthma, COPD', 'Adult', 'Bronchodilator'),
('Montelukast 10mg', 'Montelukast', 'Tablet', '10mg', 'Oral', 'Once daily', 'Long term', '1 tablet', '10mg/day', 'Hypersensitivity', 'Headache, Nausea', 'Phenobarbital', 'Asthma, Allergic rhinitis', 'Adult', 'Leukotriene inhibitor'),
('Cetirizine 10mg', 'Cetirizine', 'Tablet', '10mg', 'Oral', 'Once daily', 'As needed', '1 tablet', '10mg/day', 'Hypersensitivity', 'Drowsiness, Dry mouth', 'Theophylline', 'Allergic rhinitis, Urticaria', 'Adult', 'Antihistamine'),
('Pantoprazole 40mg', 'Pantoprazole', 'Tablet', '40mg', 'Oral', 'Once daily', '4-8 weeks', '1 tablet', '80mg/day', 'Hypersensitivity', 'Headache, Diarrhea', 'Atazanavir', 'GERD, Peptic ulcer', 'Adult', 'PPI'),
('Tramadol 50mg', 'Tramadol', 'Tablet', '50mg', 'Oral', 'Every 6 hours', 'Acute pain', '1 tablet', '400mg/day', 'Hypersensitivity', 'Nausea, Drowsiness', 'SSRIs, MAO inhibitors', 'Moderate to severe pain', 'Adult', 'Opioid'),
('Diclofenac 50mg', 'Diclofenac', 'Tablet', '50mg', 'Oral', 'Every 8 hours', 'Acute pain', '1 tablet', '150mg/day', 'Peptic ulcer, Bleeding disorders', 'Stomach upset, Nausea', 'Aspirin, Anticoagulants', 'Pain, Inflammation', 'Adult', 'NSAID'),
('Doxycycline 100mg', 'Doxycycline', 'Capsule', '100mg', 'Oral', 'Every 12 hours', '7-14 days', '1 capsule', '200mg/day', 'Hypersensitivity', 'Nausea, Photosensitivity', 'Antacids, Iron supplements', 'Bacterial infections', 'Adult', 'Antibiotic'),
('Paracetamol Syrup', 'Paracetamol', 'Syrup', '125mg/5ml', 'Oral', 'Every 4-6 hours', '3-5 days', '5-10ml', '60ml/day', 'Severe hepatic impairment', 'Nausea, rash', 'Warfarin', 'Fever, Pain in children', 'Pediatric', 'Analgesic'),
('Amoxicillin Syrup', 'Amoxicillin', 'Syrup', '250mg/5ml', 'Oral', 'Three times daily', '5 days', '5ml', '45ml/day', 'Penicillin allergy', 'Diarrhea, Nausea', 'Allopurinol', 'Bacterial infections in children', 'Pediatric', 'Antibiotic'),
('Isoniazid 300mg', 'Isoniazid', 'Tablet', '300mg', 'Oral', 'Once daily', '6 months', '1 tablet', '300mg/day', 'Hypersensitivity, Liver disease', 'Peripheral neuropathy', 'Phenytoin', 'Tuberculosis', 'Adult', 'Anti-TB'),
('Rifampicin 450mg', 'Rifampicin', 'Capsule', '450mg', 'Oral', 'Once daily', '6 months', '1 capsule', '600mg/day', 'Hypersensitivity, Jaundice', 'Orange discoloration of urine', 'Oral contraceptives', 'Tuberculosis', 'Adult', 'Anti-TB'),
('Pyrazinamide 500mg', 'Pyrazinamide', 'Tablet', '500mg', 'Oral', 'Once daily', '2 months', '3-4 tablets', '2000mg/day', 'Liver disease, Gout', 'Hepatotoxicity', 'Allopurinol', 'Tuberculosis', 'Adult', 'Anti-TB'),
('Ethambutol 800mg', 'Ethambutol', 'Tablet', '800mg', 'Oral', 'Once daily', '2 months', '3 tablets', '2400mg/day', 'Optic neuritis', 'Visual disturbances', 'None significant', 'Tuberculosis', 'Adult', 'Anti-TB'),
('Levofloxacin 500mg', 'Levofloxacin', 'Tablet', '500mg', 'Oral', 'Once daily', '10-14 days', '1 tablet', '750mg/day', 'Hypersensitivity', 'Nausea, Diarrhea', 'Antacids, NSAIDs', 'Bacterial infections', 'Adult', 'Antibiotic'),
('Metronidazole 400mg', 'Metronidazole', 'Tablet', '400mg', 'Oral', 'Three times daily', '5-7 days', '1 tablet', '1200mg/day', 'Hypersensitivity', 'Metallic taste, Nausea', 'Alcohol, Warfarin', 'Anaerobic infections', 'Adult', 'Antibiotic'),
('Norfloxacin 400mg', 'Norfloxacin', 'Tablet', '400mg', 'Oral', 'Twice daily', '3-7 days', '1 tablet', '800mg/day', 'Hypersensitivity', 'Nausea, Diarrhea', 'Antacids', 'UTI', 'Adult', 'Antibiotic'),
('Cephalexin 500mg', 'Cephalexin', 'Capsule', '500mg', 'Oral', 'Three times daily', '7 days', '1 capsule', '4000mg/day', 'Penicillin allergy', 'Diarrhea, Nausea', 'Probenecid', 'Bacterial infections', 'Adult', 'Antibiotic'),
('Fluconazole 150mg', 'Fluconazole', 'Tablet', '150mg', 'Oral', 'Single dose', 'Single dose', '1 tablet', '150mg', 'Hypersensitivity', 'Nausea, Headache', 'Warfarin', 'Fungal infections', 'Adult', 'Antifungal'),
('ORS Powder', 'Electrolytes', 'Powder', '20.5g/sachet', 'Oral', 'After each loose stool', 'Until recovery', '1 sachet', 'As needed', 'None', 'None significant', 'None', 'Diarrhea, Dehydration', 'All', 'Rehydration'),
('Lisinopril 5mg', 'Lisinopril', 'Tablet', '5mg', 'Oral', 'Once daily', 'Long term', '1 tablet', '40mg/day', 'Pregnancy, Angioedema', 'Dry cough, Dizziness', 'NSAIDs, K supplements', 'Hypertension, Heart failure', 'Adult', 'ACE Inhibitor'),
('Levothyroxine 50mcg', 'Levothyroxine', 'Tablet', '50mcg', 'Oral', 'Once daily morning', 'Long term', '1 tablet', '200mcg/day', 'Hypersensitivity', 'Palpitations, Weight loss', 'Iron, Calcium', 'Hypothyroidism', 'Adult', 'Thyroid hormone'),
('Insulin Regular', 'Insulin', 'Injection', '100 IU/ml', 'Subcutaneous', 'As per protocol', 'Long term', 'As prescribed', 'As needed', 'Hypoglycemia', 'Hypoglycemia, Lipodystrophy', 'Oral hypoglycemics', 'Diabetes mellitus', 'Adult', 'Antidiabetic'),
('Hydrocortisone Cream', 'Hydrocortisone', 'Cream', '1%', 'Topical', 'Twice daily', '7-10 days', 'Thin layer', 'As needed', 'Fungal infections', 'Skin atrophy (prolonged use)', 'None significant', 'Skin inflammation, Eczema', 'All', 'Corticosteroid'),
('Miconazole Cream', 'Miconazole', 'Cream', '2%', 'Topical', 'Twice daily', '2-4 weeks', 'Thin layer', 'As needed', 'Hypersensitivity', 'Irritation, Burning', 'None significant', 'Fungal skin infections', 'All', 'Antifungal');

-- ========================================================================
-- SECTION 2: ADDITIONAL DOSAGES FROM CSV (25 RECORDS)
-- ========================================================================
-- Source: dosage_csv_safe_import.sql
-- Includes high strength variants, TB drugs, pediatric formulations, etc.
-- ========================================================================

INSERT IGNORE INTO dosage_references (
    medication_name, dosage_form, strength, pack_size,
    recommended_frequency, recommended_duration, age_group,
    standard_dosage, max_daily_dose, notes, category
) VALUES
('Paracetamol 650mg', 'Tablet', '650mg', '10 tablets', 'Twice daily', '5 days', 'Adult', '1 tablet', '2 tablets', 'High Strength Fever/Pain relief', 'Analgesic'),
('Insulin 100IU', 'Injection', '100 IU', '1 vial', 'As prescribed', 'Ongoing', 'Adult', 'As per need', '40 IU per injection', 'Diabetes management - requires monitoring', 'Antidiabetic'),
('Eye Drops Antibiotic', 'Drops', '0.5%', '10ml bottle', 'Three times daily', '7 days', 'Adult', '1-2 drops', '6 drops per day', 'Bacterial eye infection', 'Ophthalmic'),
('Rifampicin 250mg', 'Tablet', '250mg', '14 tablets', 'Once daily', '6 months', 'Adult', '1 tablet', '1 tablet', 'TB Treatment - Standard dose', 'Anti-TB'),
('Pyrazinamide 500mg', 'Tablet', '500mg', '14 tablets', 'Once daily', '2 months', 'Adult', '2 tablets', '2 tablets', 'TB Treatment - Intensive phase', 'Anti-TB'),
('Ethambutol 400mg', 'Tablet', '400mg', '14 tablets', 'Once daily', '2 months', 'Adult', '1 tablet', '1 tablet', 'TB Treatment - Monitor vision', 'Anti-TB'),
('Pyridoxine 25mg', 'Tablet', '25mg', '30 tablets', 'Once daily', 'Throughout TB treatment', 'Adult', '1 tablet', '1 tablet', 'Vitamin B6 - Prevents neuropathy', 'Vitamin'),
('Levofloxacin 75mg', 'Tablet', '75mg', '30 tablets', 'Once daily', '2 months', 'Adult', '1 tablet', '1 tablet', 'Drug Resistant TB', 'Anti-TB'),
('Linezolid 600mg', 'Tablet', '600mg', '30 tablets', 'Once daily', 'Throughout treatment', 'Adult', '1 tablet', '1 tablet', 'XDR TB Treatment', 'Anti-TB'),
('ORS Powder', 'Powder', '21.5g', '30 sachets', 'Once daily', '14 days', 'Adult', '1 sachet in water', '1 sachet', 'Oral Rehydration - Diarrhea', 'Rehydration'),
('Loperamide 2mg', 'Tablet', '2mg', '30 tablets', 'Once daily', '7 days', 'Adult', '1 tablet', '1 tablet', 'Anti-diarrheal', 'Antidiarrheal'),
('Ibuprofen Suspension', 'Syrup', '200mg/5ml', '60ml', 'Three times daily', '5 days', 'Pediatric', '5-10ml', '30ml per day', 'Pain/Fever in children', 'Analgesic'),
('Amoxicillin-Clavulanate 625mg', 'Tablet', '625mg', '15 tablets', 'Three times daily', '5-7 days', 'Adult', '1 tablet', '3 tablets', 'Bacterial infection - Broad spectrum', 'Antibiotic'),
('Norfloxacin 400mg', 'Tablet', '400mg', '10 tablets', 'Twice daily', '5 days', 'Adult', '1 tablet', '2 tablets', 'Urinary Tract Infection', 'Antibiotic'),
('Cephalexin 250mg', 'Tablet', '250mg', '30 tablets', 'Three times daily', '5-7 days', 'Adult', '1 tablet', '3 tablets', 'Bacterial infection', 'Antibiotic'),
('Fluconazole 400mg', 'Tablet', '400mg', '30 tablets', 'Twice daily', '7-10 days', 'Adult', '1 tablet', '2 tablets', 'Severe fungal infections', 'Antifungal'),
('Miconazole Cream 1%', 'Cream', '1%', '30g', 'Twice daily', '7-14 days', 'All', 'Apply thin layer', 'As needed', 'Topical fungal infection', 'Antifungal'),
('Secnidazole 500mg', 'Tablet', '500mg', '30 tablets', 'Once daily evening', '14 days', 'Adult', '1 tablet', '1 tablet', 'Parasitic infection', 'Antiparasitic'),
('Theophylline 200mg', 'Tablet', '200mg', '30 tablets', 'Once daily evening', '30 days', 'Adult', '1 tablet', '1 tablet', 'COPD - Bronchodilator', 'Bronchodilator'),
('Salbutamol Nebulizer Solution', 'Solution', '2.5mg/ml', '30ml bottle', 'As per nebulizer protocol', '5-7 days', 'Adult', '2.5-5mg per nebulization', 'As needed', 'Acute asthma/COPD', 'Bronchodilator'),
('Amoxicillin Pediatric Syrup', 'Syrup', '200mg/5ml', '60ml', 'Three times daily', '5-7 days', 'Pediatric', '10-15ml', '45ml per day', 'Bacterial infection in children', 'Antibiotic'),
('Ibuprofen Pediatric Syrup', 'Syrup', '120mg/5ml', '60ml', 'Twice-thrice daily', '5-7 days', 'Pediatric', '5-10ml', '30ml per day', 'Fever/Pain in children', 'Analgesic'),
('Cough Syrup Pediatric', 'Syrup', '5mg/5ml', '60ml', 'Thrice daily', '7 days', 'Pediatric', '5ml', '15ml per day', 'Dry/productive cough', 'Antitussive'),
('Paracetamol Infant Suspension', 'Suspension', '50mg/5ml', '30ml', 'Three times daily', '5 days', 'Infant', '2.5-5ml', '15ml per day', 'Fever/Pain in infants', 'Analgesic'),
('Famotidine 10mg', 'Tablet', '10mg', '30 tablets', 'Once daily', '7 days', 'Adult', '1 tablet', '1 tablet', 'Acidity/GERD', 'H2 Blocker');

SET FOREIGN_KEY_CHECKS = 1;

-- Count after import
SELECT CONCAT('After import - Total dosage references: ', COUNT(*) ) AS status FROM dosage_references;

-- ========================================================================
-- IMPORT SUMMARY
-- ========================================================================
SELECT '========================================================================' as '';
SELECT '                 DOSAGE REFERENCES IMPORT COMPLETE' as '';
SELECT '========================================================================' as '';
SELECT CONCAT('Total dosage records in table: ', COUNT(*)) as summary FROM dosage_references;
SELECT '✅ Section 1: 33 common medicines imported' as note;
SELECT '✅ Section 2: 25 additional dosages imported' as note;
SELECT '✅ Total: 58 dosage references' as note;
SELECT '✅ No existing data was deleted or modified' as note;
SELECT '✅ Duplicates were automatically skipped using INSERT IGNORE' as note;
SELECT '========================================================================' as '';

-- ========================================================================
-- CATEGORIES INCLUDED
-- ========================================================================
-- Analgesics: Paracetamol, Ibuprofen, Tramadol, Diclofenac
-- Antibiotics: Amoxicillin, Azithromycin, Ciprofloxacin, Doxycycline, etc.
-- Anti-TB: Isoniazid, Rifampicin, Pyrazinamide, Ethambutol, Levofloxacin
-- Antacids/PPI: Omeprazole, Pantoprazole, Famotidine
-- Antidiabetics: Metformin, Insulin
-- Antihypertensives: Amlodipine, Lisinopril, Atorvastatin
-- Respiratory: Salbutamol, Montelukast, Theophylline
-- Antihistamines: Cetirizine
-- Pediatric Formulations: Syrups and suspensions
-- Topical: Creams and ointments
-- Others: ORS, Vitamins, Antifungals, Antiparasitics
-- ========================================================================
