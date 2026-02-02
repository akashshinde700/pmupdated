# ========================================================================
# IMPORT IMPORTED TABLE SCRIPT
# ========================================================================
Write-Host "=== Importing Imported Table ===" -ForegroundColor Green

# Configuration
$ScriptDir = $PSScriptRoot
$ImportFile = "$ScriptDir\imported_table.sql"

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

    Write-Host "Importing: $SqlFile" -ForegroundColor Cyan
    Write-Host "File size: $([math]::Round((Get-Item $SqlFile).Length / 1MB, 2)) MB" -ForegroundColor Yellow
    
    $mysqlArgs = @(
        "-u", $User,
        "-h", $HostName,
        $Database
    )

    try {
        Get-Content -Path $SqlFile -Encoding UTF8 | & $MySqlPath @mysqlArgs
        if ($LASTEXITCODE -ne 0) {
            throw "MySQL import failed (exit code $LASTEXITCODE)"
        }
        Write-Host "✅ Successfully imported: $SqlFile" -ForegroundColor Green
    } catch {
        Write-Host "❌ Error importing $SqlFile : $($_.Exception.Message)" -ForegroundColor Red
        throw
    }
}

# Check if import file exists
if (!(Test-Path $ImportFile)) {
    Write-Host "ERROR: Import file not found: $ImportFile" -ForegroundColor Red
    exit 1
}

# Show file info
$FileInfo = Get-Item $ImportFile
Write-Host "Import file found: $($FileInfo.Name)" -ForegroundColor Cyan
Write-Host "Size: $([math]::Round($FileInfo.Length / 1MB, 2)) MB" -ForegroundColor Yellow
Write-Host "Modified: $($FileInfo.LastWriteTime)" -ForegroundColor Yellow

# Confirm import
Write-Host ""
Write-Host "This will import the imported_table with patient data." -ForegroundColor Yellow
Write-Host "Make sure your database is ready for this import." -ForegroundColor Yellow
Write-Host ""
$confirm = Read-Host "Continue with import? (y/N)"

if ($confirm -ne 'y' -and $confirm -ne 'Y') {
    Write-Host "Import cancelled." -ForegroundColor Yellow
    exit 0
}

# Perform import
try {
    Write-Host ""
    Write-Host "Starting import..." -ForegroundColor Cyan
    $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
    
    Invoke-MySQLFile -SqlFile $ImportFile
    
    $stopwatch.Stop()
    Write-Host ""
    Write-Host "=== Import Completed Successfully ===" -ForegroundColor Green
    Write-Host "Time taken: $($stopwatch.Elapsed.ToString('mm\:ss'))" -ForegroundColor Cyan
    Write-Host "Table 'imported_table' has been created and populated." -ForegroundColor Green
    
} catch {
    Write-Host ""
    Write-Host "=== Import Failed ===" -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Next step: Run migration script to process imported data." -ForegroundColor Cyan
Write-Host "Command: .\run_migration.ps1" -ForegroundColor White
