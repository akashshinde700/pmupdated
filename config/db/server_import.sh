#!/bin/bash

# ========================================================================
# SERVER DATABASE IMPORT SCRIPT
# ========================================================================
echo "=== Server Database Import ==="

# Database configuration
DB_USER="root"
DB_NAME="patient_management"
IMPORT_DIR="/tmp"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Function to import SQL file
import_sql() {
    local file=$1
    local description=$2
    
    if [ -f "$file" ]; then
        echo -e "${CYAN}Importing $description...${NC}"
        echo -e "${YELLOW}File: $file${NC}"
        
        if mysql -u "$DB_USER" "$DB_NAME" < "$file"; then
            echo -e "${GREEN}✅ Successfully imported: $description${NC}"
        else
            echo -e "${RED}❌ Failed to import: $description${NC}"
            return 1
        fi
    else
        echo -e "${RED}❌ File not found: $file${NC}"
        return 1
    fi
}

# Check MySQL connection
echo -e "${CYAN}Testing MySQL connection...${NC}"
if ! mysql -u "$DB_USER" -e "USE $DB_NAME; SELECT 1;" > /dev/null 2>&1; then
    echo -e "${RED}❌ Cannot connect to database $DB_NAME${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Database connection successful${NC}"

# Import sequence
echo ""
echo -e "${CYAN}Starting import sequence...${NC}"

# 1. Import dosage data
import_sql "$IMPORT_DIR/dosage_complete_import.sql" "Dosage Data"

# 2. Import ICD data
import_sql "$IMPORT_DIR/icd10_complete_import.sql" "ICD-10 Codes"
import_sql "$IMPORT_DIR/icd11_complete_import_safe.sql" "ICD-11 Codes"

# 3. Import SNOMED CT (if available)
if [ -f "$IMPORT_DIR/snomed_import.sql" ]; then
    import_sql "$IMPORT_DIR/snomed_import.sql" "SNOMED CT Data"
fi

# 4. Import patient data
import_sql "$IMPORT_DIR/imported_table.sql" "Patient Data Table"

# 5. Run migration
import_sql "$IMPORT_DIR/migration.sql" "Data Migration"

echo ""
echo -e "${GREEN}=== Import Summary ===${NC}"

# Show table counts
echo -e "${CYAN}Table record counts:${NC}"
mysql -u "$DB_USER" "$DB_NAME" -e "
SELECT 'Dosage References' as table_name, COUNT(*) as count FROM dosage_references
UNION ALL
SELECT 'ICD-10 Codes', COUNT(*) FROM icd_codes
UNION ALL
SELECT 'ICD-11 Codes', COUNT(*) FROM icd11_codes
UNION ALL
SELECT 'Patients', COUNT(*) FROM patients
UNION ALL
SELECT 'Appointments', COUNT(*) FROM appointments
UNION ALL
SELECT 'Prescriptions', COUNT(*) FROM prescriptions
UNION ALL
SELECT 'Imported Records', COUNT(*) FROM imported_table;
" 2>/dev/null

echo ""
echo -e "${GREEN}🎉 Server import completed successfully!${NC}"
echo -e "${CYAN}Your patient management system is now ready.${NC}"
