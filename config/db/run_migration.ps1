# ========================================================================
# MIGRATION SCRIPT RUNNER
# ========================================================================
Write-Host "=== Running Migration Script ===" -ForegroundColor Green

# Configuration
$ScriptDir = $PSScriptRoot
$MigrationFile = "$ScriptDir\migration.sql"

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
$HostName = "localhost"

function Invoke-MySQLFile {
    param([string]$SqlFile)

    if (!(Test-Path $SqlFile)) {
        throw "SQL file not found: $SqlFile"
    }

    Write-Host "Running: $SqlFile" -ForegroundColor Cyan
    Write-Host "File size: $([math]::Round((Get-Item $SqlFile).Length / 1MB, 2)) MB" -ForegroundColor Yellow
    
    $mysqlArgs = @(
        "-u", $User,
        "-h", $HostName,
        $Database
    )

    try {
        Get-Content -Path $SqlFile -Encoding UTF8 | & $MySqlPath @mysqlArgs
        if ($LASTEXITCODE -ne 0) {
            throw "MySQL migration failed (exit code $LASTEXITCODE)"
        }
        Write-Host "✅ Migration completed successfully!" -ForegroundColor Green
    } catch {
        Write-Host "❌ Error in migration: $($_.Exception.Message)" -ForegroundColor Red
        throw
    }
}

# Check if migration file exists
if (!(Test-Path $MigrationFile)) {
    Write-Host "ERROR: Migration file not found: $MigrationFile" -ForegroundColor Red
    exit 1
}

# Show file info
$FileInfo = Get-Item $MigrationFile
Write-Host "Migration file found: $($FileInfo.Name)" -ForegroundColor Cyan
Write-Host "Size: $([math]::Round($FileInfo.Length / 1MB, 2)) MB" -ForegroundColor Yellow
Write-Host "Modified: $($FileInfo.LastWriteTime)" -ForegroundColor Yellow

# Check if imported_table exists (prerequisite)
Write-Host ""
Write-Host "Checking prerequisites..." -ForegroundColor Yellow

try {
    $checkQuery = "SELECT COUNT(*) as table_exists FROM information_schema.tables WHERE table_schema = 'patient_management' AND table_name = 'imported_table'"
    $result = & $MySqlPath -u $User -h $HostName -D $Database -e $checkQuery 2>$null
    $tableExists = $result -match "1"
    
    if (-not $tableExists) {
        Write-Host "WARNING: 'imported_table' not found. Please run import_imported_table.ps1 first." -ForegroundColor Red
        $continue = Read-Host "Continue anyway? (y/N)"
        if ($continue -ne 'y' -and $continue -ne 'Y') {
            Write-Host "Migration cancelled. Please import the table first." -ForegroundColor Yellow
            exit 0
        }
    } else {
        Write-Host "✅ Prerequisite check passed - imported_table found" -ForegroundColor Green
    }
} catch {
    Write-Host "WARNING: Could not verify prerequisites. Continuing anyway..." -ForegroundColor Yellow
}

# Confirm migration
Write-Host ""
Write-Host "This will run the migration script to process imported patient data." -ForegroundColor Yellow
Write-Host "The migration will:" -ForegroundColor Cyan
Write-Host "  - Import patients from imported_table" -ForegroundColor White
Write-Host "  - Create appointments" -ForegroundColor White
Write-Host "  - Process prescriptions" -ForegroundColor White
Write-Host "  - Handle duplicates safely" -ForegroundColor White
Write-Host ""
$confirm = Read-Host "Continue with migration? (y/N)"

if ($confirm -ne 'y' -and $confirm -ne 'Y') {
    Write-Host "Migration cancelled." -ForegroundColor Yellow
    exit 0
}

# Perform migration
try {
    Write-Host ""
    Write-Host "Starting migration..." -ForegroundColor Cyan
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    
    Invoke-MySQLFile -SqlFile $MigrationFile
    
    $stopwatch.Stop()
    Write-Host ""
    Write-Host "=== Migration Completed Successfully ===" -ForegroundColor Green
    Write-Host "Time taken: $($stopwatch.Elapsed.ToString('mm\:ss'))" -ForegroundColor Cyan
    Write-Host "Patient data has been migrated from imported_table." -ForegroundColor Green
    
    # Show summary
    Write-Host ""
    Write-Host "=== Migration Summary ===" -ForegroundColor Cyan
    try {
        & $MySqlPath -u $User -h $HostName -D $Database -e "
            SELECT 'Patients' as table_name, COUNT(*) as count FROM patients
            UNION ALL
            SELECT 'Appointments', COUNT(*) FROM appointments
            UNION ALL
            SELECT 'Prescriptions', COUNT(*) FROM prescriptions
            UNION ALL
            SELECT 'Imported Records', COUNT(*) FROM imported_table;
        " 2>$null | Write-Host
    } catch {
        Write-Host "Could not generate summary." -ForegroundColor Yellow
    }
    
} catch {
    Write-Host ""
    Write-Host "=== Migration Failed ===" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check:" -ForegroundColor Yellow
    Write-Host "  1. Database connection" -ForegroundColor White
    Write-Host "  2. File permissions" -ForegroundColor White
    Write-Host "  3. SQL syntax in migration.sql" -ForegroundColor White
    exit 1
}

Write-Host ""
Write-Host "🎉 Complete database setup finished!" -ForegroundColor Green
Write-Host "Your patient management system is now ready with imported data." -ForegroundColor Cyan
