# ========================================================================
# REMOTE DOSAGE IMPORT SCRIPT
# ========================================================================
Write-Host "=== Remote Dosage Import ===" -ForegroundColor Green

# Configuration
$ScriptDir = $PSScriptRoot
$ImportFile = "$ScriptDir\dosage_complete_import.sql"

# Remote MySQL Configuration
$HostName = "72.60.206.56"
$Port = "3306"
$User = "root"
$Password = "LASTrivon@8055"
$Database = "patient_management"

# MySQL Path Detection
$MySqlPath = ""
$MySQLPaths = @(
    "C:\xampp\mysql\bin\mysql.exe",
    "C:\Program Files\MariaDB*\bin\mysql.exe",
    "C:\Program Files\MySQL\MySQL Server*\bin\mysql.exe"
)

foreach ($Path in $MySQLPaths) {
    $Resolved = Resolve-Path $Path -ErrorAction SilentlyContinue
    if ($Resolved -and (Test-Path $Resolved.Path)) {
        $MySqlPath = $Resolved.Path
        break
    }
}

if (-not $MySqlPath) {
    Write-Host "ERROR: MySQL client not found. Please install MySQL/MariaDB or add to PATH." -ForegroundColor Red
    Write-Host "Common locations:" -ForegroundColor Yellow
    Write-Host "  - C:\xampp\mysql\bin\mysql.exe" -ForegroundColor White
    Write-Host "  - C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -ForegroundColor White
    Write-Host "  - C:\Program Files\MariaDB 10.5\bin\mysql.exe" -ForegroundColor White
    exit 1
}

function Invoke-RemoteMySQL {
    param([string]$SqlFile)
    
    if (!(Test-Path $SqlFile)) {
        throw "SQL file not found: $SqlFile"
    }
    
    Write-Host "Connecting to remote MySQL server..." -ForegroundColor Cyan
    Write-Host "Host: ${HostName}:$Port" -ForegroundColor Yellow
    Write-Host "Database: $Database" -ForegroundColor Yellow
    Write-Host "File: $($SqlFile | Split-Path -Leaf)" -ForegroundColor Yellow
    
    $mysqlArgs = @(
        "-h", $HostName,
        "-P", $Port,
        "-u", $User,
        "-p${Password}",
        $Database,
        "--default-character-set=utf8mb4"
    )
    
    try {
        Write-Host "Importing dosage data..." -ForegroundColor Cyan
        $stopwatch = [System.Diagnostics.Stopwatch]::StartNew()
        
        # Use Get-Content and pipe to MySQL instead of redirection
        Get-Content -Path $SqlFile -Encoding UTF8 | & $MySqlPath @mysqlArgs
        
        if ($LASTEXITCODE -ne 0) {
            throw "MySQL import failed (exit code $LASTEXITCODE)"
        }
        
        $stopwatch.Stop()
        Write-Host "✅ Dosage import completed successfully!" -ForegroundColor Green
        Write-Host "Time taken: $($stopwatch.Elapsed.ToString('mm\:ss'))" -ForegroundColor Cyan
        
    } catch {
        Write-Host "❌ Error importing dosage data: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "Please check:" -ForegroundColor Yellow
        Write-Host "  1. Remote server connectivity" -ForegroundColor White
        Write-Host "  2. MySQL credentials" -ForegroundColor White
        Write-Host "  3. Database permissions" -ForegroundColor White
        throw
    }
}

# Check if import file exists
if (!(Test-Path $ImportFile)) {
    Write-Host "ERROR: Import file not found: $ImportFile" -ForegroundColor Red
    exit 1
}

# Test connection first
Write-Host "Testing remote MySQL connection..." -ForegroundColor Cyan
try {
    & $MySqlPath -h $HostName -P $Port -u $User -p${Password} -e "SELECT 1 as test;" 2>$null
    if ($LASTEXITCODE -ne 0) {
        throw "Connection test failed"
    }
    Write-Host "✅ Connection successful!" -ForegroundColor Green
} catch {
    Write-Host "❌ Cannot connect to remote MySQL server" -ForegroundColor Red
    Write-Host "Please check:" -ForegroundColor Yellow
    Write-Host "  1. Server address: $HostName" -ForegroundColor White
    Write-Host "  2. Port: $Port" -ForegroundColor White
    Write-Host "  3. Username/Password" -ForegroundColor White
    Write-Host "  4. Network connectivity" -ForegroundColor White
    exit 1
}

# Confirm import
Write-Host ""
Write-Host "This will import dosage data to the remote database." -ForegroundColor Yellow
Write-Host "Existing data will be preserved (INSERT IGNORE mode)." -ForegroundColor Cyan
Write-Host ""
$confirm = Read-Host "Continue with import? (y/N)"

if ($confirm -ne 'y' -and $confirm -ne 'Y') {
    Write-Host "Import cancelled." -ForegroundColor Yellow
    exit 0
}

# Perform import
try {
    Invoke-RemoteMySQL -SqlFile $ImportFile
    
    Write-Host ""
    Write-Host "=== Dosage Import Summary ===" -ForegroundColor Green
    try {
        $summaryResult = & $MySqlPath -h $HostName -P $Port -u $User -p${Password} -D $Database -e "SELECT 'Dosage References' as table_name, COUNT(*) as count FROM dosage_references;" 2>$null
        Write-Host $summaryResult -ForegroundColor White
    } catch {
        Write-Host "Could not fetch summary." -ForegroundColor Yellow
    }
    
} catch {
    Write-Host ""
    Write-Host "=== Import Failed ===" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "✅ Dosage data imported successfully to remote database!" -ForegroundColor Green
Write-Host "You can continue with the next import step." -ForegroundColor Cyan
