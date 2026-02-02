#!/usr/bin/env python3
"""
ICD-11 Complete Data Parser
Parses LinearizationMiniOutput-MMS-en.txt and generates SQL INSERT IGNORE statements
"""
import csv
import re

def escape_sql_string(s):
    """Escape string for SQL"""
    if s is None or s == '':
        return 'NULL'
    s = str(s).replace("\\", "\\\\").replace("'", "\\'").replace('"', '\\"')
    return f"'{s}'"

def clean_title(title):
    """Remove leading dashes and quotes from title"""
    if not title:
        return title
    # Remove surrounding quotes
    title = title.strip('"')
    # Remove leading dashes and spaces (- - - Title)
    title = re.sub(r'^[\s\-]+', '', title)
    return title

def parse_icd11_codes(input_file, output_file):
    """Parse ICD-11 codes from tab-delimited file"""

    print(f"Parsing {input_file}...")

    chapters = {}
    blocks = {}
    codes_by_chapter = {}
    total_codes = 0
    total_chapters = 0
    total_blocks = 0

    with open(input_file, 'r', encoding='utf-8') as f:
        reader = csv.reader(f, delimiter='\t')

        # Skip header
        next(reader)

        for row in reader:
            if len(row) < 11:
                continue

            # Extract fields
            code = row[2].strip() if len(row) > 2 else ''
            title = clean_title(row[4]) if len(row) > 4 else ''
            class_kind = row[5].strip().lower() if len(row) > 5 else ''
            depth = row[6].strip() if len(row) > 6 else '1'
            is_residual = row[7].strip().lower() == 'true' if len(row) > 7 else False
            chapter_no = row[9].strip() if len(row) > 9 else ''

            # Skip if no title or is residual (other/unspecified)
            if not title or is_residual:
                continue

            # Handle chapters
            if class_kind == 'chapter':
                chapters[chapter_no] = {
                    'chapter_code': chapter_no,
                    'chapter_number': int(chapter_no) if chapter_no.isdigit() else 0,
                    'chapter_title': title,
                    'description': title
                }
                total_chapters += 1
                continue

            # Handle blocks
            if class_kind == 'block':
                block_id = row[3].strip() if len(row) > 3 else ''
                blocks[block_id] = {
                    'block_code': block_id,
                    'block_title': title,
                    'chapter_code': chapter_no
                }
                total_blocks += 1
                continue

            # Handle categories and codes (anything with a code)
            if code and class_kind in ['category', 'subcategory', 'code', '']:
                # Get parent code (if it's a sub-code like 1A03.0)
                parent_code = None
                level = int(depth) if depth.isdigit() else 1

                if '.' in code:
                    parent_code = code.split('.')[0]
                    level = 2  # Sub-category

                # Get block code
                block_code = row[3].strip() if len(row) > 3 else None

                # Store by chapter for organized output
                if chapter_no not in codes_by_chapter:
                    codes_by_chapter[chapter_no] = []

                codes_by_chapter[chapter_no].append({
                    'icd11_code': code,
                    'parent_code': parent_code,
                    'level': level,
                    'code_type': class_kind if class_kind else 'category',
                    'preferred_label': title,
                    'chapter_code': chapter_no,
                    'block_code': block_code,
                    'classification_status': 'active'
                })

                total_codes += 1

    print(f"Total chapters parsed: {total_chapters}")
    print(f"Total blocks parsed: {total_blocks}")
    print(f"Total codes parsed: {total_codes}")

    # Generate SQL file
    print(f"\nGenerating SQL file: {output_file}")

    with open(output_file, 'w', encoding='utf-8') as f:
        f.write("-- " + "="*70 + "\n")
        f.write("-- ICD-11 COMPLETE DATABASE IMPORT - SAFE MODE\n")
        f.write("-- " + "="*70 + "\n")
        f.write(f"-- Total Chapters: {total_chapters}\n")
        f.write(f"-- Total Blocks: {total_blocks}\n")
        f.write(f"-- Total Codes: {total_codes}\n")
        f.write("-- Source: WHO ICD-11 MMS Linearization\n")
        f.write("-- Method: INSERT IGNORE (No deletion or truncation)\n")
        f.write("-- " + "="*70 + "\n\n")

        f.write("USE patient_management;\n")
        f.write("SET FOREIGN_KEY_CHECKS = 0;\n")
        f.write("SET sql_mode = '';\n\n")

        f.write("-- Count before import\n")
        f.write("SELECT CONCAT('Before import - ICD-11 chapters: ', COUNT(*)) AS status FROM icd11_chapters;\n")
        f.write("SELECT CONCAT('Before import - ICD-11 blocks: ', COUNT(*)) AS status FROM icd11_blocks;\n")
        f.write("SELECT CONCAT('Before import - ICD-11 codes: ', COUNT(*)) AS status FROM icd11_codes;\n\n")

        # Import chapters
        if chapters:
            f.write("-- " + "="*70 + "\n")
            f.write(f"-- ICD-11 CHAPTERS ({len(chapters)} chapters)\n")
            f.write("-- " + "="*70 + "\n\n")

            f.write("INSERT IGNORE INTO icd11_chapters (\n")
            f.write("    chapter_code, chapter_number, chapter_title, description\n")
            f.write(") VALUES\n")

            values = []
            for ch in sorted(chapters.values(), key=lambda x: x['chapter_number']):
                val = (
                    f"({escape_sql_string(ch['chapter_code'])}, "
                    f"{ch['chapter_number']}, "
                    f"{escape_sql_string(ch['chapter_title'])}, "
                    f"{escape_sql_string(ch['description'])})"
                )
                values.append(val)

            f.write(",\n".join(values))
            f.write(";\n\n")

        # Import blocks
        if blocks:
            f.write("-- " + "="*70 + "\n")
            f.write(f"-- ICD-11 BLOCKS ({len(blocks)} blocks)\n")
            f.write("-- " + "="*70 + "\n\n")

            # Write in batches
            batch_size = 500
            block_list = list(blocks.values())
            for i in range(0, len(block_list), batch_size):
                batch = block_list[i:i+batch_size]

                f.write("INSERT IGNORE INTO icd11_blocks (\n")
                f.write("    block_code, block_title, chapter_code\n")
                f.write(") VALUES\n")

                values = []
                for bl in batch:
                    val = (
                        f"({escape_sql_string(bl['block_code'])}, "
                        f"{escape_sql_string(bl['block_title'])}, "
                        f"{escape_sql_string(bl['chapter_code'])})"
                    )
                    values.append(val)

                f.write(",\n".join(values))
                f.write(";\n\n")

        # Import codes by chapter
        for chapter_no in sorted(codes_by_chapter.keys()):
            codes = codes_by_chapter[chapter_no]

            f.write(f"-- " + "="*70 + "\n")
            f.write(f"-- CHAPTER {chapter_no} - {len(codes)} CODES\n")
            f.write(f"-- " + "="*70 + "\n\n")

            # Write in batches of 500
            batch_size = 500
            for i in range(0, len(codes), batch_size):
                batch = codes[i:i+batch_size]

                f.write("INSERT IGNORE INTO icd11_codes (\n")
                f.write("    icd11_code, parent_code, level, code_type,\n")
                f.write("    preferred_label, chapter_code, block_code,\n")
                f.write("    classification_status, billable, usage_count\n")
                f.write(") VALUES\n")

                values = []
                for code in batch:
                    val = (
                        f"({escape_sql_string(code['icd11_code'])}, "
                        f"{escape_sql_string(code['parent_code'])}, "
                        f"{code['level']}, "
                        f"{escape_sql_string(code['code_type'])}, "
                        f"{escape_sql_string(code['preferred_label'])}, "
                        f"{escape_sql_string(code['chapter_code'])}, "
                        f"{escape_sql_string(code['block_code'])}, "
                        f"{escape_sql_string(code['classification_status'])}, "
                        f"1, "  # billable
                        f"0)"    # usage_count
                    )
                    values.append(val)

                f.write(",\n".join(values))
                f.write(";\n\n")

        f.write("SET FOREIGN_KEY_CHECKS = 1;\n\n")

        f.write("-- Count after import\n")
        f.write("SELECT CONCAT('After import - ICD-11 chapters: ', COUNT(*)) AS status FROM icd11_chapters;\n")
        f.write("SELECT CONCAT('After import - ICD-11 blocks: ', COUNT(*)) AS status FROM icd11_blocks;\n")
        f.write("SELECT CONCAT('After import - ICD-11 codes: ', COUNT(*)) AS status FROM icd11_codes;\n\n")

        f.write("-- Summary\n")
        f.write("SELECT '" + "="*70 + "' as '';\n")
        f.write("SELECT '   ICD-11 COMPLETE IMPORT SUCCESSFUL' as '';\n")
        f.write("SELECT '" + "="*70 + "' as '';\n")
        f.write(f"SELECT 'Chapters imported: {total_chapters}' as summary;\n")
        f.write(f"SELECT 'Blocks imported: {total_blocks}' as summary;\n")
        f.write(f"SELECT 'Codes imported: {total_codes}' as summary;\n")
        f.write("SELECT 'No existing data was deleted or modified' as note;\n")
        f.write("SELECT 'Duplicates were automatically skipped' as note;\n")
        f.write("SELECT '" + "="*70 + "' as '';\n")

    print(f"[OK] SQL file generated successfully: {output_file}")
    print(f"[OK] Total {total_codes} ICD-11 codes ready for import")

if __name__ == "__main__":
    input_file = "../../icd/LinearizationMiniOutput-MMS-en/LinearizationMiniOutput-MMS-en.txt"
    output_file = "icd11_complete_safe_import.sql"

    parse_icd11_codes(input_file, output_file)
    print("\n[OK] ICD-11 parsing complete!")
