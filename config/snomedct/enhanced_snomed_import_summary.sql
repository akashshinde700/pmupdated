SELECT 'snomed_concepts' AS table_name, COUNT(*) AS record_count FROM snomed_concepts
UNION ALL
SELECT 'snomed_descriptions', COUNT(*) FROM snomed_descriptions
UNION ALL
SELECT 'snomed_relationships', COUNT(*) FROM snomed_relationships
UNION ALL
SELECT 'snomed_clinical_findings', COUNT(*) FROM snomed_clinical_findings
UNION ALL
SELECT 'snomed_medications', COUNT(*) FROM snomed_medications
UNION ALL
SELECT 'snomed_procedures', COUNT(*) FROM snomed_procedures;
