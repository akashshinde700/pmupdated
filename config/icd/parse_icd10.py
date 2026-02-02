#!/usr/bin/env python3
"""
ICD-10 Complete Data Parser
Parses icd102019syst_codes.txt and generates SQL INSERT IGNORE statements
"""
import csv
import re

def escape_sql_string(s):
    """Escape string for SQL"""
    if s is None:
        return 'NULL'
    s = str(s).replace("\\", "\\\\").replace("'", "\\'").replace('"', '\\"')
    return f"'{s}'"

def parse_icd10_codes(input_file, output_file):
    """Parse ICD-10 codes from semicolon-delimited file"""

    print(f"Parsing {input_file}...")

    codes_by_chapter = {}
    total_codes = 0

    with open(input_file, 'r', encoding='utf-8') as f:
        for line in f:
            parts = line.strip().split(';')
            if len(parts) < 10:
                continue

            # Extract fields
            level = parts[0]  # 3=category, 4=code
            billable = parts[1]  # T=terminal (billable), N=non-terminal
            chapter_code = parts[3]  # 01, 02, etc.
            icd_code = parts[6]  # A00.0
            icd_code_formatted = parts[7]  # A000
            description = parts[8]  # Full description
            short_desc = parts[9]  # Short description

            # Skip if no code
            if not icd_code or icd_code == '-':
                continue

            # Determine if billable
            is_billable = 1 if billable == 'T' else 0

            # Store by chapter for organized output
            if chapter_code not in codes_by_chapter:
                codes_by_chapter[chapter_code] = []

            codes_by_chapter[chapter_code].append({
                'icd_code': icd_code,
                'icd_code_formatted': icd_code_formatted,
                'level': int(level),
                'code_type': 'code' if level == '4' else 'category',
                'primary_description': description,
                'secondary_description': short_desc if short_desc != description else None,
                'short_description': short_desc[:255] if short_desc else None,
                'chapter_code': chapter_code,
                'billable': is_billable,
                'status': 'active'
            })

            total_codes += 1

    print(f"Total codes parsed: {total_codes}")
    print(f"Chapters found: {len(codes_by_chapter)}")

    # Generate SQL file
    print(f"\nGenerating SQL file: {output_file}")

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("-- " + "="*70 + "\n")
        f.write("-- ICD-10 COMPLETE DATABASE IMPORT - SAFE MODE\n")
        f.write("-- " + "="*70 + "\n")
        f.write(f"-- Total Codes: {total_codes}\n")
        f.write("-- Source: WHO ICD-10 2019 Classification\n")
        f.write("-- Method: INSERT IGNORE (No deletion or truncation)\n")
        f.write("-- " + "="*70 + "\n\n")

        f.write("USE patient_management;\n")
        f.write("SET FOREIGN_KEY_CHECKS = 0;\n")
        f.write("SET sql_mode = '';\n\n")

        f.write("-- Count before import\n")
        f.write("SELECT CONCAT('Before import - ICD-10 codes: ', COUNT(*)) AS status FROM icd_codes;\n\n")

        # Write codes by chapter
        for chapter_code in sorted(codes_by_chapter.keys()):
            codes = codes_by_chapter[chapter_code]

            f.write(f"-- " + "="*70 + "\n")
            f.write(f"-- CHAPTER {chapter_code} - {len(codes)} CODES\n")
            f.write(f"-- " + "="*70 + "\n\n")

            # Write in batches of 500 to avoid huge queries
            batch_size = 500
            for i in range(0, len(codes), batch_size):
                batch = codes[i:i+batch_size]

                f.write("INSERT IGNORE INTO icd_codes (\n")
                f.write("    icd_code, icd_code_formatted, level, code_type,\n")
                f.write("    primary_description, secondary_description, short_description,\n")
                f.write("    chapter_code, billable, status, usage_count\n")
                f.write(") VALUES\n")

                values = []
                for code in batch:
                    val = (
                        f"({escape_sql_string(code['icd_code'])}, "
                        f"{escape_sql_string(code['icd_code_formatted'])}, "
                        f"{code['level']}, "
                        f"{escape_sql_string(code['code_type'])}, "
                        f"{escape_sql_string(code['primary_description'])}, "
                        f"{escape_sql_string(code['secondary_description'])}, "
                        f"{escape_sql_string(code['short_description'])}, "
                        f"{escape_sql_string(code['chapter_code'])}, "
                        f"{code['billable']}, "
                        f"{escape_sql_string(code['status'])}, "
                        f"0)"
                    )
                    values.append(val)

                f.write(",\n".join(values))
                f.write(";\n\n")

        f.write("SET FOREIGN_KEY_CHECKS = 1;\n\n")

        f.write("-- Count after import\n")
        f.write("SELECT CONCAT('After import - ICD-10 codes: ', COUNT(*)) AS status FROM icd_codes;\n\n")

        f.write("-- Summary\n")
        f.write("SELECT '" + "="*70 + "' as '';\n")
        f.write("SELECT '   ICD-10 COMPLETE IMPORT SUCCESSFUL' as '';\n")
        f.write("SELECT '" + "="*70 + "' as '';\n")
        f.write(f"SELECT 'Total codes imported: {total_codes}' as summary;\n")
        f.write("SELECT 'No existing data was deleted or modified' as note;\n")
        f.write("SELECT 'Duplicates were automatically skipped' as note;\n")
        f.write("SELECT '" + "="*70 + "' as '';\n")

    print(f"[OK] SQL file generated successfully: {output_file}")
    print(f"[OK] Total {total_codes} ICD-10 codes ready for import")

if __name__ == "__main__":
    input_file = "../../icd/icd102019enMeta/icd102019syst_codes.txt"
    output_file = "icd10_complete_safe_import.sql"

    parse_icd10_codes(input_file, output_file)
    print("\n[OK] ICD-10 parsing complete!")
