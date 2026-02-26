# =============================================================================
# PATIENT MANAGEMENT SYSTEM - DEPLOYMENT SCRIPT
# Deploys to 72.60.206.56:/var/www/patient_management/
# =============================================================================

param(
    [string]$Environment = "production",
    [switch]$SkipBuild = $false,
    [switch]$SkipGit = $false
)

# Color output
function Write-Header {
    param([string]$Message)
    Write-Host "`n════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  $Message" -ForegroundColor Cyan
    Write-Host "════════════════════════════════════════════════════════`n" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor Green
}

function Write-Error-Custom {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor Red
}

function Write-Info {
    param([string]$Message)
    Write-Host "ℹ $Message" -ForegroundColor Yellow
}

# Configuration
$SERVER_IP = "72.60.206.56"
$SERVER_USER = "root"
$DEPLOY_PATH = "/var/www/patient_management"
$FRONTEND_BUILD_DIR = ".\frontend\dist"
$BACKEND_SRC = ".\backend\src"

Write-Header "DEPLOYMENT CHECKLIST & STATUS"

# 1. Check Git Status
Write-Info "1. Checking Git Status..."
$gitStatus = git status --porcelain
if ($gitStatus) {
    Write-Host "  Uncommitted changes found:" -ForegroundColor Yellow
    Write-Host $gitStatus
} else {
    Write-Success "Git working directory clean"
}

# 2. Check Backend
Write-Info "2. Checking Backend..."
if (Test-Path "$BACKEND_SRC") {
    $backendFiles = @(
        "app.js",
        "index.js",
        "config/db.js",
        "config/env.js"
    )
    $missingBackendFiles = @()
    foreach ($file in $backendFiles) {
        if (-not (Test-Path "$BACKEND_SRC/$file")) {
            $missingBackendFiles += $file
        }
    }
    
    if ($missingBackendFiles.Count -eq 0) {
        Write-Success "Backend files present"
    } else {
        Write-Error-Custom "Missing backend files: $($missingBackendFiles -join ', ')"
    }
} else {
    Write-Error-Custom "Backend src directory not found!"
}

# 3. Check Frontend
Write-Info "3. Checking Frontend..."
if (Test-Path ".\frontend\src") {
    Write-Success "Frontend source present"
} else {
    Write-Error-Custom "Frontend source not found!"
}

# 4. Check package.json files
Write-Info "4. Checking package.json files..."
$packageFiles = @("package.json", "backend/package.json", "frontend/package.json")
foreach ($file in $packageFiles) {
    if (Test-Path $file) {
        Write-Success "$file exists"
    } else {
        Write-Error-Custom "$file missing!"
    }
}

# 5. Check .env files
Write-Info "5. Checking Environment Files..."
if (Test-Path "backend\.env") {
    Write-Success "backend/.env exists"
} else {
    Write-Info "backend/.env not found (may be configured on server)"
}

if (Test-Path "frontend\.env") {
    Write-Success "frontend/.env exists"
} else {
    Write-Info "frontend/.env not found (may use default VITE_API_URL)"
}

# 6. Build Frontend (if not skipped)
if (-not $SkipBuild) {
    Write-Header "BUILDING FRONTEND"
    
    if (Test-Path "frontend\node_modules" -PathType Container) {
        Write-Success "Frontend node_modules found"
    } else {
        Write-Info "Installing frontend dependencies..."
        Push-Location frontend
        npm install
        if ($LASTEXITCODE -ne 0) {
            Write-Error-Custom "Frontend npm install failed!"
            Pop-Location
            exit 1
        }
        Pop-Location
    }
    
    Write-Info "Building frontend..."
    Push-Location frontend
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Error-Custom "Frontend build failed!"
        Pop-Location
        exit 1
    }
    Pop-Location
    
    if (Test-Path $FRONTEND_BUILD_DIR) {
        Write-Success "Frontend build successful (dist/ created)"
    } else {
        Write-Error-Custom "Frontend dist/ directory not created!"
        exit 1
    }
} else {
    Write-Info "Skipping frontend build (--SkipBuild flag set)"
}

# 7. Git Commit & Push (if not skipped)
if (-not $SkipGit) {
    Write-Header "GIT COMMIT & PUSH"
    
    $gitStatus = git status --porcelain
    if ($gitStatus) {
        Write-Info "Staging changes..."
        git add -A
        
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        $commitMsg = "Deploy: Updated changes ($timestamp)"
        
        Write-Info "Committing: $commitMsg"
        git commit -m $commitMsg
        
        Write-Info "Pushing to repository..."
        git push
        
        if ($LASTEXITCODE -eq 0) {
            Write-Success "Git push successful"
        } else {
            Write-Error-Custom "Git push failed!"
            exit 1
        }
    } else {
        Write-Info "No changes to commit"
    }
} else {
    Write-Info "Skipping Git operations (--SkipGit flag set)"
}

# 8. Deploy to Server
Write-Header "DEPLOYING TO SERVER: $SERVER_IP"

Write-Info "Connecting to $SERVER_USER@$SERVER_IP..."
Write-Info "This will:"
Write-Info "  1. Navigate to $DEPLOY_PATH"
Write-Info "  2. Pull latest changes from git"
Write-Info "  3. Install/update npm dependencies"
Write-Info "  4. Restart PM2 processes"
Write-Info ""

# SSH command to execute on server
$sshCommand = @"
cd $DEPLOY_PATH && \
echo '=== Pulling latest changes ===' && \
git pull && \
echo '=== Backend: Installing dependencies ===' && \
cd backend && npm install && cd .. && \
echo '=== Frontend: Installing dependencies ===' && \
cd frontend && npm install && npm run build && cd .. && \
echo '=== Restarting PM2 processes ===' && \
pm2 restart patient-backend || pm2 start npm --name patient-backend -- start && \
echo '=== Checking PM2 status ===' && \
pm2 status && \
echo '=== Deployment Complete ===
"@

Write-Info "Executing deployment commands on server..."
Write-Info "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Use SSH to execute commands
ssh -o StrictHostKeyChecking=no $SERVER_USER@$SERVER_IP $sshCommand

if ($LASTEXITCODE -eq 0) {
    Write-Header "✓ DEPLOYMENT SUCCESSFUL"
    Write-Success "Application deployed to $SERVER_IP"
    Write-Success "Backend running via PM2"
    Write-Success "Frontend available at http://72.60.206.56"
} else {
    Write-Header "✗ DEPLOYMENT FAILED"
    Write-Error-Custom "Check server logs for details"
    exit 1
}

# 9. Deployment Summary
Write-Header "DEPLOYMENT SUMMARY"
Write-Host "Server: $SERVER_IP" -ForegroundColor Cyan
Write-Host "Deploy Path: $DEPLOY_PATH" -ForegroundColor Cyan
Write-Host "Environment: $Environment" -ForegroundColor Cyan
Write-Host "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host ""
Write-Info "Access Application:"
Write-Host "  Frontend: http://72.60.206.56" -ForegroundColor Green
Write-Host "  Backend: http://72.60.206.56:5000/api" -ForegroundColor Green
Write-Host ""
Write-Info "Server Access:"
Write-Host "  ssh root@72.60.206.56" -ForegroundColor Green
Write-Host "  PM2 logs: pm2 logs patient-backend" -ForegroundColor Green
Write-Host "  PM2 status: pm2 status" -ForegroundColor Green
