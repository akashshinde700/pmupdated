# Database Setup Guide

## Quick Setup Instructions

### 1. Dosage Database (Ready to Use)
```bash
# Import dosage data immediately
cd config/dosage
mysql -u root patient_management < dosage_complete_import.sql
```

### 2. ICD Codes (Requires Source Files)

#### Download Required Files:
1. **ICD-10**: Download `icd102019syst_codes.txt` from WHO ICD website
2. **ICD-11**: Download `LinearizationMiniOutput-MMS-en.txt` from WHO ICD website

#### Setup:
```bash
# Place files in project root:
# - patient_management_jaju-master/icd/icd102019enMeta/icd102019syst_codes.txt
# - patient_management_jaju-master/icd/LinearizationMiniOutput-MMS-en/LinearizationMiniOutput-MMS-en.txt

# Run automated import
cd config/icd
run_icd_processing.bat
```

### 3. SNOMED CT (Optional - Advanced)

#### Download Required Files:
1. **International RF2**: `SnomedCT_InternationalRF2_PRODUCTION_20260101T120000Z`
2. **India Drug Extension**: `SnomedCT_IndiaDrugExtensionRF2_PRODUCTION_IN1000189_20251219T120000Z`
3. **India AYUSH Extension**: `SnomedCT_IndiaAYUSHExtensionRF2_PRODUCTION_IN1000189_20250814T120000Z`
4. **India COVID Extension**: `SnomedCT_IndiaCovid-19ExtensionRF2_PRODUCTION_IN1000189_20210806T120000Z`
5. **India Geographical Extension**: `SnomedCT_IndiaGeographicalLocationExtensionRF2_Production_IN1000189_20210806T120000Z`

#### Setup:
```bash
# Place files in project root:
# - patient_management_jaju-master/snomedct/[all RF2 folders]

# Run import
cd config/snomedct
powershell -ExecutionPolicy Bypass -File enhanced_snomed_import.ps1
```

## Prerequisites

### Database Requirements:
- MySQL 5.7+ or MariaDB 10.6+
- Database: `patient_management`
- User: `root` (or user with CREATE, INSERT, UPDATE, DELETE privileges)

### System Requirements:
- Windows PowerShell 5.1+ (for ICD/SNOMED scripts)
- MySQL/MariaDB command line tools
- 2GB+ free disk space for SNOMED CT files

## Troubleshooting

### Common Issues:

1. **PowerShell Execution Policy**:
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

2. **MySQL not in PATH**:
   - Add MySQL/MariaDB bin directory to system PATH
   - Or use full path in scripts

3. **Missing Source Files**:
   - Scripts will show clear error messages
   - Download files from official WHO/ SNOMED International websites

4. **Permission Issues**:
   - Run PowerShell as Administrator
   - Ensure MySQL user has proper privileges

## Verification

After import, verify data:

```sql
-- Check dosage data
SELECT COUNT(*) FROM dosage_references;

-- Check ICD data  
SELECT COUNT(*) FROM icd_codes;
SELECT COUNT(*) FROM icd11_codes;

-- Check SNOMED data (if imported)
SELECT COUNT(*) FROM snomed_clinical_findings;
```

## Support

For issues:
1. Check error messages in scripts
2. Verify file paths and permissions
3. Ensure database schema is created first
4. Review README files in each directory
