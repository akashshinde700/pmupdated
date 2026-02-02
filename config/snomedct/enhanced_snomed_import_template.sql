SET FOREIGN_KEY_CHECKS=0;

-- ========================================================================
-- SNOMED CT IMPORT - SAFE MODE (INSERT IGNORE)
-- ========================================================================
-- This template uses INSERT IGNORE to prevent data loss
-- Existing records will be preserved, duplicates will be skipped

-- TRUNCATE statements removed for safety - using INSERT IGNORE instead
-- TRUNCATE TABLE snomed_clinical_findings;
-- TRUNCATE TABLE snomed_medications;
-- TRUNCATE TABLE snomed_procedures;
-- TRUNCATE TABLE snomed_crossreferences;
-- TRUNCATE TABLE snomed_dosage_mapping;
-- TRUNCATE TABLE snomed_drug_attributes;
-- TRUNCATE TABLE snomed_refsets;
-- TRUNCATE TABLE snomed_relationships;
-- TRUNCATE TABLE snomed_descriptions;
-- TRUNCATE TABLE snomed_concepts;

DROP TABLE IF EXISTS stg_snomed_concepts;
DROP TABLE IF EXISTS stg_snomed_descriptions;
DROP TABLE IF EXISTS stg_snomed_relationships;

CREATE TABLE stg_snomed_concepts (
  id BIGINT UNSIGNED NOT NULL,
  effective_time DATE NOT NULL,
  active TINYINT(1) NOT NULL,
  module_id BIGINT UNSIGNED NULL,
  definition_status_id BIGINT UNSIGNED NULL,
  KEY idx_id (id),
  KEY idx_eff (effective_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE stg_snomed_descriptions (
  id BIGINT UNSIGNED NOT NULL,
  effective_time DATE NOT NULL,
  active TINYINT(1) NOT NULL,
  module_id BIGINT UNSIGNED NULL,
  concept_id BIGINT UNSIGNED NOT NULL,
  language_code VARCHAR(10) NULL,
  type_id BIGINT UNSIGNED NULL,
  term TEXT NULL,
  case_significance_id BIGINT UNSIGNED NULL,
  KEY idx_id (id),
  KEY idx_concept (concept_id),
  KEY idx_type_lang (type_id, language_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE stg_snomed_relationships (
  id BIGINT UNSIGNED NOT NULL,
  effective_time DATE NOT NULL,
  active TINYINT(1) NOT NULL,
  module_id BIGINT UNSIGNED NULL,
  source_id BIGINT UNSIGNED NOT NULL,
  destination_id BIGINT UNSIGNED NOT NULL,
  relationship_group INT NULL,
  type_id BIGINT UNSIGNED NOT NULL,
  characteristic_type_id BIGINT UNSIGNED NULL,
  modifier_id BIGINT UNSIGNED NULL,
  KEY idx_id (id),
  KEY idx_source (source_id),
  KEY idx_type (type_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Load Concepts
LOAD DATA LOCAL INFILE '{{INT_CONCEPT}}'
INTO TABLE stg_snomed_concepts
FIELDS TERMINATED BY '\t'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(@id,@effectiveTime,@active,@moduleId,@definitionStatusId)
SET
  id = CAST(@id AS UNSIGNED),
  effective_time = STR_TO_DATE(@effectiveTime,'%Y%m%d'),
  active = CAST(@active AS UNSIGNED),
  module_id = CAST(@moduleId AS UNSIGNED),
  definition_status_id = CAST(@definitionStatusId AS UNSIGNED);

LOAD DATA LOCAL INFILE '{{DRUG_CONCEPT}}'
INTO TABLE stg_snomed_concepts
FIELDS TERMINATED BY '\t'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(@id,@effectiveTime,@active,@moduleId,@definitionStatusId)
SET
  id = CAST(@id AS UNSIGNED),
  effective_time = STR_TO_DATE(@effectiveTime,'%Y%m%d'),
  active = CAST(@active AS UNSIGNED),
  module_id = CAST(@moduleId AS UNSIGNED),
  definition_status_id = CAST(@definitionStatusId AS UNSIGNED);

LOAD DATA LOCAL INFILE '{{AYUSH_CONCEPT}}'
INTO TABLE stg_snomed_concepts
FIELDS TERMINATED BY '\t'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(@id,@effectiveTime,@active,@moduleId,@definitionStatusId)
SET
  id = CAST(@id AS UNSIGNED),
  effective_time = STR_TO_DATE(@effectiveTime,'%Y%m%d'),
  active = CAST(@active AS UNSIGNED),
  module_id = CAST(@moduleId AS UNSIGNED),
  definition_status_id = CAST(@definitionStatusId AS UNSIGNED);

LOAD DATA LOCAL INFILE '{{COVID_CONCEPT}}'
INTO TABLE stg_snomed_concepts
FIELDS TERMINATED BY '\t'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(@id,@effectiveTime,@active,@moduleId,@definitionStatusId)
SET
  id = CAST(@id AS UNSIGNED),
  effective_time = STR_TO_DATE(@effectiveTime,'%Y%m%d'),
  active = CAST(@active AS UNSIGNED),
  module_id = CAST(@moduleId AS UNSIGNED),
  definition_status_id = CAST(@definitionStatusId AS UNSIGNED);

LOAD DATA LOCAL INFILE '{{GEO_CONCEPT}}'
INTO TABLE stg_snomed_concepts
FIELDS TERMINATED BY '\t'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(@id,@effectiveTime,@active,@moduleId,@definitionStatusId)
SET
  id = CAST(@id AS UNSIGNED),
  effective_time = STR_TO_DATE(@effectiveTime,'%Y%m%d'),
  active = CAST(@active AS UNSIGNED),
  module_id = CAST(@moduleId AS UNSIGNED),
  definition_status_id = CAST(@definitionStatusId AS UNSIGNED);

-- Load Descriptions
LOAD DATA LOCAL INFILE '{{INT_DESC_EN}}'
INTO TABLE stg_snomed_descriptions
FIELDS TERMINATED BY '\t'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(@id,@effectiveTime,@active,@moduleId,@conceptId,@languageCode,@typeId,@term,@caseSignificanceId)
SET
  id = CAST(@id AS UNSIGNED),
  effective_time = STR_TO_DATE(@effectiveTime,'%Y%m%d'),
  active = CAST(@active AS UNSIGNED),
  module_id = CAST(@moduleId AS UNSIGNED),
  concept_id = CAST(@conceptId AS UNSIGNED),
  language_code = @languageCode,
  type_id = CAST(@typeId AS UNSIGNED),
  term = @term,
  case_significance_id = CAST(@caseSignificanceId AS UNSIGNED);

LOAD DATA LOCAL INFILE '{{DRUG_DESC}}'
INTO TABLE stg_snomed_descriptions
FIELDS TERMINATED BY '\t'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(@id,@effectiveTime,@active,@moduleId,@conceptId,@languageCode,@typeId,@term,@caseSignificanceId)
SET
  id = CAST(@id AS UNSIGNED),
  effective_time = STR_TO_DATE(@effectiveTime,'%Y%m%d'),
  active = CAST(@active AS UNSIGNED),
  module_id = CAST(@moduleId AS UNSIGNED),
  concept_id = CAST(@conceptId AS UNSIGNED),
  language_code = @languageCode,
  type_id = CAST(@typeId AS UNSIGNED),
  term = @term,
  case_significance_id = CAST(@caseSignificanceId AS UNSIGNED);

LOAD DATA LOCAL INFILE '{{AYUSH_DESC}}'
INTO TABLE stg_snomed_descriptions
FIELDS TERMINATED BY '\t'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(@id,@effectiveTime,@active,@moduleId,@conceptId,@languageCode,@typeId,@term,@caseSignificanceId)
SET
  id = CAST(@id AS UNSIGNED),
  effective_time = STR_TO_DATE(@effectiveTime,'%Y%m%d'),
  active = CAST(@active AS UNSIGNED),
  module_id = CAST(@moduleId AS UNSIGNED),
  concept_id = CAST(@conceptId AS UNSIGNED),
  language_code = @languageCode,
  type_id = CAST(@typeId AS UNSIGNED),
  term = @term,
  case_significance_id = CAST(@caseSignificanceId AS UNSIGNED);

LOAD DATA LOCAL INFILE '{{COVID_DESC}}'
INTO TABLE stg_snomed_descriptions
FIELDS TERMINATED BY '\t'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(@id,@effectiveTime,@active,@moduleId,@conceptId,@languageCode,@typeId,@term,@caseSignificanceId)
SET
  id = CAST(@id AS UNSIGNED),
  effective_time = STR_TO_DATE(@effectiveTime,'%Y%m%d'),
  active = CAST(@active AS UNSIGNED),
  module_id = CAST(@moduleId AS UNSIGNED),
  concept_id = CAST(@conceptId AS UNSIGNED),
  language_code = @languageCode,
  type_id = CAST(@typeId AS UNSIGNED),
  term = @term,
  case_significance_id = CAST(@caseSignificanceId AS UNSIGNED);

LOAD DATA LOCAL INFILE '{{GEO_DESC}}'
INTO TABLE stg_snomed_descriptions
FIELDS TERMINATED BY '\t'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(@id,@effectiveTime,@active,@moduleId,@conceptId,@languageCode,@typeId,@term,@caseSignificanceId)
SET
  id = CAST(@id AS UNSIGNED),
  effective_time = STR_TO_DATE(@effectiveTime,'%Y%m%d'),
  active = CAST(@active AS UNSIGNED),
  module_id = CAST(@moduleId AS UNSIGNED),
  concept_id = CAST(@conceptId AS UNSIGNED),
  language_code = @languageCode,
  type_id = CAST(@typeId AS UNSIGNED),
  term = @term,
  case_significance_id = CAST(@caseSignificanceId AS UNSIGNED);

-- Load Relationships
LOAD DATA LOCAL INFILE '{{INT_REL}}'
INTO TABLE stg_snomed_relationships
FIELDS TERMINATED BY '\t'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(@id,@effectiveTime,@active,@moduleId,@sourceId,@destinationId,@relationshipGroup,@typeId,@characteristicTypeId,@modifierId)
SET
  id = CAST(@id AS UNSIGNED),
  effective_time = STR_TO_DATE(@effectiveTime,'%Y%m%d'),
  active = CAST(@active AS UNSIGNED),
  module_id = CAST(@moduleId AS UNSIGNED),
  source_id = CAST(@sourceId AS UNSIGNED),
  destination_id = CAST(@destinationId AS UNSIGNED),
  relationship_group = CAST(@relationshipGroup AS UNSIGNED),
  type_id = CAST(@typeId AS UNSIGNED),
  characteristic_type_id = CAST(@characteristicTypeId AS UNSIGNED),
  modifier_id = CAST(@modifierId AS UNSIGNED);

LOAD DATA LOCAL INFILE '{{DRUG_REL}}'
INTO TABLE stg_snomed_relationships
FIELDS TERMINATED BY '\t'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(@id,@effectiveTime,@active,@moduleId,@sourceId,@destinationId,@relationshipGroup,@typeId,@characteristicTypeId,@modifierId)
SET
  id = CAST(@id AS UNSIGNED),
  effective_time = STR_TO_DATE(@effectiveTime,'%Y%m%d'),
  active = CAST(@active AS UNSIGNED),
  module_id = CAST(@moduleId AS UNSIGNED),
  source_id = CAST(@sourceId AS UNSIGNED),
  destination_id = CAST(@destinationId AS UNSIGNED),
  relationship_group = CAST(@relationshipGroup AS UNSIGNED),
  type_id = CAST(@typeId AS UNSIGNED),
  characteristic_type_id = CAST(@characteristicTypeId AS UNSIGNED),
  modifier_id = CAST(@modifierId AS UNSIGNED);

LOAD DATA LOCAL INFILE '{{AYUSH_REL}}'
INTO TABLE stg_snomed_relationships
FIELDS TERMINATED BY '\t'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(@id,@effectiveTime,@active,@moduleId,@sourceId,@destinationId,@relationshipGroup,@typeId,@characteristicTypeId,@modifierId)
SET
  id = CAST(@id AS UNSIGNED),
  effective_time = STR_TO_DATE(@effectiveTime,'%Y%m%d'),
  active = CAST(@active AS UNSIGNED),
  module_id = CAST(@moduleId AS UNSIGNED),
  source_id = CAST(@sourceId AS UNSIGNED),
  destination_id = CAST(@destinationId AS UNSIGNED),
  relationship_group = CAST(@relationshipGroup AS UNSIGNED),
  type_id = CAST(@typeId AS UNSIGNED),
  characteristic_type_id = CAST(@characteristicTypeId AS UNSIGNED),
  modifier_id = CAST(@modifierId AS UNSIGNED);

LOAD DATA LOCAL INFILE '{{COVID_REL}}'
INTO TABLE stg_snomed_relationships
FIELDS TERMINATED BY '\t'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(@id,@effectiveTime,@active,@moduleId,@sourceId,@destinationId,@relationshipGroup,@typeId,@characteristicTypeId,@modifierId)
SET
  id = CAST(@id AS UNSIGNED),
  effective_time = STR_TO_DATE(@effectiveTime,'%Y%m%d'),
  active = CAST(@active AS UNSIGNED),
  module_id = CAST(@moduleId AS UNSIGNED),
  source_id = CAST(@sourceId AS UNSIGNED),
  destination_id = CAST(@destinationId AS UNSIGNED),
  relationship_group = CAST(@relationshipGroup AS UNSIGNED),
  type_id = CAST(@typeId AS UNSIGNED),
  characteristic_type_id = CAST(@characteristicTypeId AS UNSIGNED),
  modifier_id = CAST(@modifierId AS UNSIGNED);

LOAD DATA LOCAL INFILE '{{GEO_REL}}'
INTO TABLE stg_snomed_relationships
FIELDS TERMINATED BY '\t'
LINES TERMINATED BY '\n'
IGNORE 1 LINES
(@id,@effectiveTime,@active,@moduleId,@sourceId,@destinationId,@relationshipGroup,@typeId,@characteristicTypeId,@modifierId)
SET
  id = CAST(@id AS UNSIGNED),
  effective_time = STR_TO_DATE(@effectiveTime,'%Y%m%d'),
  active = CAST(@active AS UNSIGNED),
  module_id = CAST(@moduleId AS UNSIGNED),
  source_id = CAST(@sourceId AS UNSIGNED),
  destination_id = CAST(@destinationId AS UNSIGNED),
  relationship_group = CAST(@relationshipGroup AS UNSIGNED),
  type_id = CAST(@typeId AS UNSIGNED),
  characteristic_type_id = CAST(@characteristicTypeId AS UNSIGNED),
  modifier_id = CAST(@modifierId AS UNSIGNED);

INSERT IGNORE INTO snomed_concepts (snomed_id, preferred_term, concept_status, definition_status, module_id, effective_time)
SELECT
  c.id AS snomed_id,
  CONCAT('SNOMED Concept ', c.id) AS preferred_term,
  c.active AS concept_status,
  CASE c.definition_status_id
    WHEN 900000000000074008 THEN 'Primitive'
    WHEN 900000000000073002 THEN 'Fully Defined'
    ELSE 'Primitive'
  END AS definition_status,
  c.module_id,
  c.effective_time
FROM stg_snomed_concepts c
JOIN (
  SELECT id, MAX(effective_time) AS mx
  FROM stg_snomed_concepts
  GROUP BY id
) m ON m.id = c.id AND m.mx = c.effective_time;

INSERT IGNORE INTO snomed_descriptions (description_id, snomed_id, description_text, description_type, language_code, case_significance, is_active, effective_time)
SELECT
  d.id AS description_id,
  d.concept_id AS snomed_id,
  d.term AS description_text,
  CASE d.type_id
    WHEN 900000000000003001 THEN 'FSN'
    WHEN 900000000000013009 THEN 'Synonym'
    WHEN 900000000000550004 THEN 'Text Definition'
    ELSE 'Synonym'
  END AS description_type,
  d.language_code,
  CASE d.case_significance_id
    WHEN 900000000000020002 THEN 'Case sensitive'
    WHEN 900000000000017005 THEN 'Case insensitive'
    WHEN 900000000000448009 THEN 'Initial character case insensitive'
    ELSE 'Case insensitive'
  END AS case_significance,
  d.active AS is_active,
  d.effective_time
FROM stg_snomed_descriptions d
JOIN (
  SELECT id, MAX(effective_time) AS mx
  FROM stg_snomed_descriptions
  GROUP BY id
) m ON m.id = d.id AND m.mx = d.effective_time;

UPDATE snomed_concepts c
JOIN (
  SELECT d.concept_id, d.term
  FROM stg_snomed_descriptions d
  JOIN (
    SELECT concept_id, MAX(effective_time) AS mx
    FROM stg_snomed_descriptions
    WHERE active = 1 AND language_code = 'en' AND type_id = 900000000000003001
    GROUP BY concept_id
  ) m ON m.concept_id = d.concept_id AND m.mx = d.effective_time
  WHERE d.active = 1 AND d.language_code = 'en' AND d.type_id = 900000000000003001
) fsn ON fsn.concept_id = c.snomed_id
SET c.fsn = fsn.term;

UPDATE snomed_concepts c
LEFT JOIN (
  SELECT d.concept_id, d.term
  FROM stg_snomed_descriptions d
  JOIN (
    SELECT concept_id, MAX(effective_time) AS mx
    FROM stg_snomed_descriptions
    WHERE active = 1 AND language_code = 'en' AND type_id = 900000000000013009
    GROUP BY concept_id
  ) m ON m.concept_id = d.concept_id AND m.mx = d.effective_time
  WHERE d.active = 1 AND d.language_code = 'en' AND d.type_id = 900000000000013009
) pt ON pt.concept_id = c.snomed_id
SET c.preferred_term = COALESCE(pt.term, c.preferred_term);

INSERT IGNORE INTO snomed_relationships (relationship_id, source_id, target_id, relationship_type_id, relationship_group, characteristic_type, modifier, is_active, effective_time)
SELECT
  r.id AS relationship_id,
  r.source_id,
  r.destination_id AS target_id,
  r.type_id AS relationship_type_id,
  COALESCE(r.relationship_group, 0) AS relationship_group,
  CASE r.characteristic_type_id
    WHEN 900000000000010007 THEN 'Stated'
    WHEN 900000000000011006 THEN 'Inferred'
    ELSE 'Stated'
  END AS characteristic_type,
  CASE r.modifier_id
    WHEN 900000000000451002 THEN 'Existential'
    WHEN 900000000000452009 THEN 'Universal'
    ELSE 'Existential'
  END AS modifier,
  r.active AS is_active,
  r.effective_time
FROM stg_snomed_relationships r
JOIN (
  SELECT id, MAX(effective_time) AS mx
  FROM stg_snomed_relationships
  GROUP BY id
) m ON m.id = r.id AND m.mx = r.effective_time;

UPDATE snomed_relationships sr
LEFT JOIN snomed_concepts t ON t.snomed_id = sr.relationship_type_id
SET sr.relationship_type_name = t.preferred_term
WHERE sr.relationship_type_name IS NULL;

INSERT INTO snomed_clinical_findings (snomed_id, clinical_term, finding_type, is_active)
SELECT
  c.snomed_id,
  COALESCE(c.preferred_term, c.fsn, CONCAT('SNOMED Concept ', c.snomed_id)) AS clinical_term,
  CASE
    WHEN c.fsn LIKE '%(symptom)%' THEN 'Symptom'
    WHEN c.fsn LIKE '%(sign)%' THEN 'Sign'
    WHEN c.fsn LIKE '%(finding)%' THEN 'Finding'
    WHEN c.fsn LIKE '%(disorder)%' THEN 'Disorder'
    WHEN c.fsn LIKE '%(disease)%' THEN 'Disease'
    ELSE 'Finding'
  END AS finding_type,
  c.concept_status AS is_active
FROM snomed_concepts c
WHERE c.fsn IS NOT NULL
  AND (
    c.fsn LIKE '%(symptom)%'
    OR c.fsn LIKE '%(sign)%'
    OR c.fsn LIKE '%(finding)%'
    OR c.fsn LIKE '%(disorder)%'
    OR c.fsn LIKE '%(disease)%'
  );

INSERT INTO snomed_medications (snomed_id, medication_name, is_active)
SELECT
  c.snomed_id,
  COALESCE(c.preferred_term, c.fsn, CONCAT('SNOMED Concept ', c.snomed_id)) AS medication_name,
  c.concept_status AS is_active
FROM snomed_concepts c
WHERE c.fsn IS NOT NULL
  AND (
    c.fsn LIKE '%(product)%'
    OR c.fsn LIKE '%(clinical drug)%'
    OR c.fsn LIKE '%(medicinal product)%'
    OR c.fsn LIKE '%(substance)%'
  );

INSERT INTO snomed_procedures (snomed_id, procedure_name, is_active)
SELECT
  c.snomed_id,
  COALESCE(c.preferred_term, c.fsn, CONCAT('SNOMED Concept ', c.snomed_id)) AS procedure_name,
  c.concept_status AS is_active
FROM snomed_concepts c
WHERE c.fsn LIKE '%(procedure)%';
