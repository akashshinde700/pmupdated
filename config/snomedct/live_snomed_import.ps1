# ========================================================================
# LIVE SNOMED CT IMPORT - SAFE MODE
# ========================================================================
Write-Host "=== Live SNOMED CT Import (Safe Mode) ===" -ForegroundColor Green

# Configuration - Use relative paths
$ScriptDir = $PSScriptRoot
$ProjectRoot = Split-Path $ScriptDir -Parent
$BaseDir = "$ProjectRoot\snomedct"

# MySQL Configuration - Better path detection
$MySqlPath = ""
$MySQLPaths = @(
    "mysql.exe",  # In PATH
    "C:\xampp\mysql\bin\mysql.exe",
    "C:\Program Files\MariaDB*\bin\mysql.exe",
    "C:\Program Files\MySQL\MySQL Server*\bin\mysql.exe"
)

foreach ($Path in $MySQLPaths) {
    if ($Path -eq "mysql.exe") {
        if (Get-Command mysql.exe -ErrorAction SilentlyContinue) {
            $MySqlPath = "mysql.exe"
            break
        }
    } else {
        $Resolved = Resolve-Path $Path -ErrorAction SilentlyContinue
        if ($Resolved -and (Test-Path $Resolved.Path)) {
            $MySqlPath = $Resolved.Path
            break
        }
    }
}

if (-not $MySqlPath) {
    Write-Host "ERROR: MySQL/MariaDB not found. Please install MySQL/MariaDB or add it to PATH." -ForegroundColor Red
    exit 1
}

$Database = "patient_management"
$User = "root"
$HostName = "localhost"  # Fixed: Use HostName instead of Host

function Invoke-MySQLFile {
    param([string]$SqlFile)

    if (!(Test-Path $SqlFile)) {
        throw "SQL file not found: $SqlFile"
    }

    $mysqlArgs = @(
        "--local-infile=1",
        "--default-character-set=utf8mb4",
        "-u", $User,
        "-h", $HostName,  # Use HostName variable
        $Database
    )

    Write-Host "Running SQL: $SqlFile" -ForegroundColor Cyan
    Get-Content -Path $SqlFile -Encoding UTF8 | & $MySqlPath @mysqlArgs
    if ($LASTEXITCODE -ne 0) {
        throw "mysql failed for $SqlFile (exit code $LASTEXITCODE)"
    }
}

# Check if SNOMED CT source files exist
$RequiredFiles = @(
    "$BaseDir\SnomedCT_InternationalRF2_PRODUCTION_20260101T120000Z",
    "$BaseDir\SnomedCT_IndiaDrugExtensionRF2_PRODUCTION_IN1000189_20251219T120000Z",
    "$BaseDir\SnomedCT_IndiaAYUSHExtensionRF2_PRODUCTION_IN1000189_20250814T120000Z",
    "$BaseDir\SnomedCT_IndiaCovid-19ExtensionRF2_PRODUCTION_IN1000189_20210806T120000Z",
    "$BaseDir\SnomedCT_IndiaGeographicalLocationExtensionRF2_Production_IN1000189_20210806T120000Z"
)

$MissingFiles = @()
foreach ($File in $RequiredFiles) {
    if (!(Test-Path $File)) {
        $MissingFiles += $File
    }
}

if ($MissingFiles.Count -gt 0) {
    Write-Host "WARNING: Some SNOMED CT files not found:" -ForegroundColor Yellow
    foreach ($File in $MissingFiles) {
        Write-Host "  - $File" -ForegroundColor Yellow
    }
    Write-Host "Running with available files only..." -ForegroundColor Cyan
}

# Run the safe SNOMED import
Write-Host "Running safe SNOMED CT import..." -ForegroundColor Cyan
$TemplateFile = "$ScriptDir\enhanced_snomed_import_template.sql"

if (Test-Path $TemplateFile) {
    Invoke-MySQLFile $TemplateFile
    Write-Host "✅ SNOMED CT import completed safely!" -ForegroundColor Green
    Write-Host "Existing data preserved, duplicates skipped." -ForegroundColor Cyan
} else {
    Write-Host "ERROR: SNOMED import template not found: $TemplateFile" -ForegroundColor Red
    exit 1
}

# Show summary
$SummaryFile = "$ScriptDir\enhanced_snomed_import_summary.sql"
if (Test-Path $SummaryFile) {
    Write-Host ""
    Write-Host "=== SNOMED CT Import Summary ===" -ForegroundColor Green
    Invoke-MySQLFile $SummaryFile
}

Write-Host ""
Write-Host "=== Live SNOMED CT Import Complete ===" -ForegroundColor Green
