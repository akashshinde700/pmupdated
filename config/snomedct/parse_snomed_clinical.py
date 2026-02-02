#!/usr/bin/env python3
"""
SNOMED CT Clinical Data Parser - Optimized for Patient Management
Extracts clinically relevant concepts for doctor prescription workflow
"""
import csv
import os
import re
import sys
from collections import defaultdict

# Increase CSV field size limit for large SNOMED fields
csv.field_size_limit(1000000)

def escape_sql_string(s):
    """Escape string for SQL"""
    if s is None or s == '':
        return 'NULL'
    s = str(s).replace("\\", "\\\\").replace("'", "\\'").replace('"', '\\"')
    # Limit length to avoid huge strings
    if len(s) > 500:
        s = s[:497] + '...'
    return f"'{s}'"

# Define clinically relevant semantic tags
CLINICAL_FINDING_TAGS = [
    '(finding)', '(disorder)', '(disease)', '(symptom)',
    '(sign)', '(situation)', '(syndrome)'
]

MEDICATION_TAGS = [
    '(product)', '(substance)', '(pharmaceutical', '(medicinal product)',
    '(clinical drug)', '(drug)'
]

PROCEDURE_TAGS = [
    '(procedure)', '(regime/therapy)', '(evaluation procedure)',
    '(surgical procedure)'
]

def is_clinical_finding(fsn):
    """Check if concept is a clinical finding"""
    if not fsn:
        return False
    fsn_lower = fsn.lower()
    return any(tag in fsn_lower for tag in CLINICAL_FINDING_TAGS)

def is_medication(fsn):
    """Check if concept is a medication"""
    if not fsn:
        return False
    fsn_lower = fsn.lower()
    return any(tag in fsn_lower for tag in MEDICATION_TAGS)

def is_procedure(fsn):
    """Check if concept is a procedure"""
    if not fsn:
        return False
    fsn_lower = fsn.lower()
    return any(tag in fsn_lower for tag in PROCEDURE_TAGS)

def parse_snomed_files(base_dir, output_file):
    """Parse SNOMED CT RF2 files and extract clinically relevant data"""

    print("="*70)
    print("SNOMED CT Clinical Data Extraction")
    print("Optimized for Doctor Prescription Workflow")
    print("="*70)

    # File paths
    int_dir = os.path.join(base_dir, "SnomedCT_InternationalRF2_PRODUCTION_20260101T120000Z", "Snapshot", "Terminology")
    drug_dir = os.path.join(base_dir, "SnomedCT_IndiaDrugExtensionRF2_PRODUCTION_IN1000189_20251219T120000Z", "Snapshot", "Terminology")

    concept_file = os.path.join(int_dir, "sct2_Concept_Snapshot_INT_20260101.txt")
    desc_file = os.path.join(int_dir, "sct2_Description_Snapshot-en_INT_20260101.txt")
    rel_file = os.path.join(int_dir, "sct2_Relationship_Snapshot_INT_20260101.txt")

    # Drug extension files
    drug_concept_file = os.path.join(drug_dir, "sct2_Concept_Snapshot_IN1000189_20251219.txt")
    drug_desc_file = os.path.join(drug_dir, "sct2_Description_Snapshot-en_IN1000189_20251219.txt")

    if not os.path.exists(concept_file):
        print(f"ERROR: Concept file not found: {concept_file}")
        return

    # Storage
    concepts = {}  # id -> {active, fsn, type}
    descriptions = defaultdict(list)  # concept_id -> [(term, type)]
    relationships = defaultdict(list)  # source_id -> [(target_id, type_id)]

    # Step 1: Load active concepts
    print("\n[1/5] Loading concepts...")
    with open(concept_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f, delimiter='\t')
        for row in reader:
            if row['active'] == '1':  # Only active
                concepts[row['id']] = {
                    'active': 1,
                    'fsn': None,
                    'type': 'concept',
                    'module': row['moduleId']
                }

    # Load India drug extension concepts
    if os.path.exists(drug_concept_file):
        print("   Loading India drug extension concepts...")
        with open(drug_concept_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f, delimiter='\t')
            for row in reader:
                if row['active'] == '1':
                    concepts[row['id']] = {
                        'active': 1,
                        'fsn': None,
                        'type': 'concept',
                        'module': row['moduleId']
                    }

    print(f"   Total active concepts: {len(concepts):,}")

    # Step 2: Load descriptions (FSN and Preferred Terms)
    print("\n[2/5] Loading descriptions...")
    fsn_count = 0
    pt_count = 0

    with open(desc_file, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f, delimiter='\t')
        for row in reader:
            if row['active'] == '1' and row['languageCode'] == 'en':
                concept_id = row['conceptId']
                if concept_id in concepts:
                    term = row['term']
                    type_id = row['typeId']

                    # FSN (Fully Specified Name) - 900000000000003001
                    if type_id == '900000000000003001':
                        concepts[concept_id]['fsn'] = term
                        fsn_count += 1

                    # Synonym/Preferred Term - 900000000000013009
                    elif type_id == '900000000000013009':
                        descriptions[concept_id].append((term, 'Synonym'))
                        pt_count += 1

    # Load India drug descriptions
    if os.path.exists(drug_desc_file):
        print("   Loading India drug extension descriptions...")
        with open(drug_desc_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f, delimiter='\t')
            for row in reader:
                if row['active'] == '1' and row['languageCode'] == 'en':
                    concept_id = row['conceptId']
                    if concept_id in concepts:
                        term = row['term']
                        type_id = row['typeId']

                        if type_id == '900000000000003001':
                            concepts[concept_id]['fsn'] = term
                        elif type_id == '900000000000013009':
                            descriptions[concept_id].append((term, 'Synonym'))

    print(f"   FSN loaded: {fsn_count:,}")
    print(f"   Synonyms loaded: {pt_count:,}")

    # Step 3: Classify concepts
    print("\n[3/5] Classifying clinical concepts...")

    clinical_findings = {}
    medications = {}
    procedures = {}

    for concept_id, data in concepts.items():
        fsn = data['fsn']
        if not fsn:
            continue

        if is_clinical_finding(fsn):
            data['type'] = 'finding'
            clinical_findings[concept_id] = data
        elif is_medication(fsn):
            data['type'] = 'medication'
            medications[concept_id] = data
        elif is_procedure(fsn):
            data['type'] = 'procedure'
            procedures[concept_id] = data

    print(f"   Clinical findings: {len(clinical_findings):,}")
    print(f"   Medications: {len(medications):,}")
    print(f"   Procedures: {len(procedures):,}")

    # Step 4: Load relationships (for hierarchies)
    print("\n[4/5] Loading relationships...")
    rel_count = 0

    if os.path.exists(rel_file):
        with open(rel_file, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f, delimiter='\t')
            for row in reader:
                if row['active'] == '1':
                    source_id = row['sourceId']
                    dest_id = row['destinationId']
                    type_id = row['typeId']

                    # Only keep "Is a" relationships (116680003)
                    if type_id == '116680003':
                        if source_id in clinical_findings or source_id in medications or source_id in procedures:
                            relationships[source_id].append((dest_id, type_id))
                            rel_count += 1

        print(f"   Relationships loaded: {rel_count:,}")

    # Step 5: Generate SQL
    print("\n[5/5] Generating SQL file...")

    total_concepts = len(clinical_findings) + len(medications) + len(procedures)
    total_descriptions = sum(len(descs) for cid in list(clinical_findings.keys()) + list(medications.keys()) + list(procedures.keys()) for descs in [descriptions.get(cid, [])])

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("-- " + "="*70 + "\n")
        f.write("-- SNOMED CT CLINICAL DATA IMPORT - SAFE MODE\n")
        f.write("-- " + "="*70 + "\n")
        f.write("-- Optimized for Doctor Prescription Workflow\n")
        f.write(f"-- Total Concepts: {total_concepts:,}\n")
        f.write(f"-- Clinical Findings: {len(clinical_findings):,}\n")
        f.write(f"-- Medications: {len(medications):,}\n")
        f.write(f"-- Procedures: {len(procedures):,}\n")
        f.write(f"-- Descriptions: {total_descriptions:,}\n")
        f.write("-- Method: INSERT IGNORE (No deletion or truncation)\n")
        f.write("-- " + "="*70 + "\n\n")

        f.write("USE patient_management;\n")
        f.write("SET FOREIGN_KEY_CHECKS = 0;\n")
        f.write("SET sql_mode = '';\n\n")

        f.write("-- Count before import\n")
        f.write("SELECT CONCAT('Before import - SNOMED concepts: ', COUNT(*)) AS status FROM snomed_concepts;\n\n")

        # Import concepts by type
        for concept_type, concept_dict, table_name in [
            ('finding', clinical_findings, 'snomed_clinical_findings'),
            ('medication', medications, 'snomed_medications'),
            ('procedure', procedures, 'snomed_procedures')
        ]:
            if not concept_dict:
                continue

            type_name = concept_type.replace('_', ' ').title()
            f.write(f"-- " + "="*70 + "\n")
            f.write(f"-- {type_name.upper()}S ({len(concept_dict):,} concepts)\n")
            f.write(f"-- " + "="*70 + "\n\n")

            # Insert into snomed_concepts first
            batch_size = 500
            concept_list = list(concept_dict.items())

            for i in range(0, len(concept_list), batch_size):
                batch = concept_list[i:i+batch_size]

                f.write("INSERT IGNORE INTO snomed_concepts (\n")
                f.write("    snomed_id, preferred_term, fsn, concept_status\n")
                f.write(") VALUES\n")

                values = []
                for concept_id, data in batch:
                    fsn = data['fsn']
                    # Extract preferred term from FSN (remove semantic tag)
                    pt = re.sub(r'\s*\([^)]+\)\s*$', '', fsn) if fsn else f'SNOMED {concept_id}'

                    val = (
                        f"({escape_sql_string(concept_id)}, "
                        f"{escape_sql_string(pt)}, "
                        f"{escape_sql_string(fsn)}, "
                        f"{data['active']})"
                    )
                    values.append(val)

                f.write(",\n".join(values))
                f.write(";\n\n")

            # Insert into specific tables
            for i in range(0, len(concept_list), batch_size):
                batch = concept_list[i:i+batch_size]

                if concept_type == 'finding':
                    f.write("INSERT IGNORE INTO snomed_clinical_findings (\n")
                    f.write("    snomed_id, clinical_term, finding_type, is_active\n")
                    f.write(") VALUES\n")

                    values = []
                    for concept_id, data in batch:
                        fsn = data['fsn']
                        pt = re.sub(r'\s*\([^)]+\)\s*$', '', fsn) if fsn else f'SNOMED {concept_id}'

                        # Determine finding type
                        finding_type = 'Finding'
                        if '(disorder)' in fsn.lower():
                            finding_type = 'Disorder'
                        elif '(disease)' in fsn.lower():
                            finding_type = 'Disease'
                        elif '(symptom)' in fsn.lower():
                            finding_type = 'Symptom'
                        elif '(sign)' in fsn.lower():
                            finding_type = 'Sign'

                        val = (
                            f"({escape_sql_string(concept_id)}, "
                            f"{escape_sql_string(pt)}, "
                            f"{escape_sql_string(finding_type)}, "
                            f"{data['active']})"
                        )
                        values.append(val)

                    f.write(",\n".join(values))
                    f.write(";\n\n")

                elif concept_type == 'medication':
                    f.write("INSERT IGNORE INTO snomed_medications (\n")
                    f.write("    snomed_id, medication_name, is_active\n")
                    f.write(") VALUES\n")

                    values = []
                    for concept_id, data in batch:
                        fsn = data['fsn']
                        pt = re.sub(r'\s*\([^)]+\)\s*$', '', fsn) if fsn else f'SNOMED {concept_id}'

                        val = (
                            f"({escape_sql_string(concept_id)}, "
                            f"{escape_sql_string(pt)}, "
                            f"{data['active']})"
                        )
                        values.append(val)

                    f.write(",\n".join(values))
                    f.write(";\n\n")

                elif concept_type == 'procedure':
                    f.write("INSERT IGNORE INTO snomed_procedures (\n")
                    f.write("    snomed_id, procedure_name, is_active\n")
                    f.write(") VALUES\n")

                    values = []
                    for concept_id, data in batch:
                        fsn = data['fsn']
                        pt = re.sub(r'\s*\([^)]+\)\s*$', '', fsn) if fsn else f'SNOMED {concept_id}'

                        val = (
                            f"({escape_sql_string(concept_id)}, "
                            f"{escape_sql_string(pt)}, "
                            f"{data['active']})"
                        )
                        values.append(val)

                    f.write(",\n".join(values))
                    f.write(";\n\n")

        # Insert descriptions (synonyms)
        f.write("-- " + "="*70 + "\n")
        f.write("-- DESCRIPTIONS/SYNONYMS\n")
        f.write("-- " + "="*70 + "\n\n")

        all_concept_ids = list(clinical_findings.keys()) + list(medications.keys()) + list(procedures.keys())
        desc_batch = []
        desc_id_counter = 2000000000  # Start from a large number to avoid conflicts

        for concept_id in all_concept_ids:
            for term, desc_type in descriptions.get(concept_id, []):
                desc_batch.append((desc_id_counter, concept_id, term, desc_type))
                desc_id_counter += 1

                if len(desc_batch) >= 500:
                    f.write("INSERT IGNORE INTO snomed_descriptions (\n")
                    f.write("    description_id, snomed_id, description_text, description_type, is_active\n")
                    f.write(") VALUES\n")

                    values = []
                    for did, cid, dterm, dtype in desc_batch:
                        val = (
                            f"({did}, "
                            f"{escape_sql_string(cid)}, "
                            f"{escape_sql_string(dterm)}, "
                            f"{escape_sql_string(dtype)}, "
                            f"1)"
                        )
                        values.append(val)

                    f.write(",\n".join(values))
                    f.write(";\n\n")
                    desc_batch = []

        # Flush remaining descriptions
        if desc_batch:
            f.write("INSERT IGNORE INTO snomed_descriptions (\n")
            f.write("    description_id, snomed_id, description_text, description_type, is_active\n")
            f.write(") VALUES\n")

            values = []
            for did, cid, dterm, dtype in desc_batch:
                val = (
                    f"({did}, "
                    f"{escape_sql_string(cid)}, "
                    f"{escape_sql_string(dterm)}, "
                    f"{escape_sql_string(dtype)}, "
                    f"1)"
                )
                values.append(val)

            f.write(",\n".join(values))
            f.write(";\n\n")

        # Insert relationships
        f.write("-- " + "="*70 + "\n")
        f.write("-- RELATIONSHIPS (IS-A hierarchies)\n")
        f.write("-- " + "="*70 + "\n\n")

        rel_batch = []
        rel_id = 1000000000

        for source_id in all_concept_ids:
            for target_id, type_id in relationships.get(source_id, []):
                rel_batch.append((rel_id, source_id, target_id, type_id))
                rel_id += 1

                if len(rel_batch) >= 500:
                    f.write("INSERT IGNORE INTO snomed_relationships (\n")
                    f.write("    relationship_id, source_id, target_id, relationship_type_id, is_active\n")
                    f.write(") VALUES\n")

                    values = []
                    for rid, sid, tid, rtid in rel_batch:
                        val = (
                            f"({rid}, "
                            f"{escape_sql_string(sid)}, "
                            f"{escape_sql_string(tid)}, "
                            f"{escape_sql_string(rtid)}, "
                            f"1)"
                        )
                        values.append(val)

                    f.write(",\n".join(values))
                    f.write(";\n\n")
                    rel_batch = []

        # Flush remaining relationships
        if rel_batch:
            f.write("INSERT IGNORE INTO snomed_relationships (\n")
            f.write("    relationship_id, source_id, target_id, relationship_type_id, is_active\n")
            f.write(") VALUES\n")

            values = []
            for rid, sid, tid, rtid in rel_batch:
                val = (
                    f"({rid}, "
                    f"{escape_sql_string(sid)}, "
                    f"{escape_sql_string(tid)}, "
                    f"{escape_sql_string(rtid)}, "
                    f"1)"
                )
                values.append(val)

            f.write(",\n".join(values))
            f.write(";\n\n")

        f.write("SET FOREIGN_KEY_CHECKS = 1;\n\n")

        f.write("-- Count after import\n")
        f.write("SELECT CONCAT('After import - SNOMED concepts: ', COUNT(*)) AS status FROM snomed_concepts;\n")
        f.write("SELECT CONCAT('After import - Clinical findings: ', COUNT(*)) AS status FROM snomed_clinical_findings;\n")
        f.write("SELECT CONCAT('After import - Medications: ', COUNT(*)) AS status FROM snomed_medications;\n")
        f.write("SELECT CONCAT('After import - Procedures: ', COUNT(*)) AS status FROM snomed_procedures;\n")
        f.write("SELECT CONCAT('After import - Descriptions: ', COUNT(*)) AS status FROM snomed_descriptions;\n")
        f.write("SELECT CONCAT('After import - Relationships: ', COUNT(*)) AS status FROM snomed_relationships;\n\n")

        f.write("-- Summary\n")
        f.write("SELECT '" + "="*70 + "' as '';\n")
        f.write("SELECT '   SNOMED CT CLINICAL IMPORT SUCCESSFUL' as '';\n")
        f.write("SELECT '" + "="*70 + "' as '';\n")
        f.write(f"SELECT 'Clinical findings: {len(clinical_findings):,}' as summary;\n")
        f.write(f"SELECT 'Medications: {len(medications):,}' as summary;\n")
        f.write(f"SELECT 'Procedures: {len(procedures):,}' as summary;\n")
        f.write(f"SELECT 'Total concepts: {total_concepts:,}' as summary;\n")
        f.write("SELECT 'No existing data was deleted or modified' as note;\n")
        f.write("SELECT 'Duplicates were automatically skipped' as note;\n")
        f.write("SELECT '" + "="*70 + "' as '';\n")

    print(f"\n[OK] SQL file generated: {output_file}")
    print(f"[OK] Total concepts: {total_concepts:,}")
    print(f"     - Clinical findings: {len(clinical_findings):,}")
    print(f"     - Medications: {len(medications):,}")
    print(f"     - Procedures: {len(procedures):,}")
    print(f"[OK] Total descriptions: {total_descriptions:,}")
    print(f"[OK] Total relationships: {rel_count:,}")

if __name__ == "__main__":
    base_dir = "../../snomedct"
    output_file = "snomed_clinical_complete_safe_import.sql"

    parse_snomed_files(base_dir, output_file)
    print("\n[OK] SNOMED CT clinical parsing complete!")
    print("\nThis data is optimized for doctor prescription workflow:")
    print("  - Fast search and autocomplete")
    print("  - All symptoms, disorders, diseases")
    print("  - All medications")
    print("  - All procedures")
    print("  - Ready for ICD mapping integration")
