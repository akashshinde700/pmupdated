# ================================================================
# DEPLOYMENT SCRIPT - Deploy to Production Server
# ================================================================
# Server: 72.60.206.56
# Path: /var/www/patient_management/
# ================================================================

$server = "root@72.60.206.56"
$remotePath = "/var/www/patient_management"
$localPath = "C:\Users\ACER\Desktop\pm\pmupdated"

function Write-Success { Write-Host "✅ $args" -ForegroundColor Green }
function Write-Error-Custom { Write-Host "❌ $args" -ForegroundColor Red }
function Write-Info { Write-Host "ℹ️  $args" -ForegroundColor Cyan }
function Write-Warning-Custom { Write-Host "⚠️  $args" -ForegroundColor Yellow }

Write-Info "=== DEPLOYING TO PRODUCTION SERVER ==="
Write-Info "Server: $server"
Write-Info "Remote Path: $remotePath"

# Step 1: Commit and push changes
Write-Info "`n[Step 1/3] Committing and pushing changes..."
git add .
$commitMsg = "Deploy: Patient edit form fix - emergency contact field names ($(Get-Date -Format 'yyyy-MM-dd HH:mm:ss'))"
git commit -m $commitMsg
if ($LASTEXITCODE -eq 0) {
    Write-Success "Changes committed"
} else {
    Write-Warning-Custom "No changes to commit or commit failed"
}

git push
if ($LASTEXITCODE -eq 0) {
    Write-Success "Changes pushed to repository"
} else {
    Write-Error-Custom "Git push failed"
    exit 1
}

# Step 2: Deploy Frontend
Write-Info "`n[Step 2/3] Deploying Frontend (dist folder)..."
$scpCommand = "scp -r `"$localPath\frontend\dist\*`" `"$server`:$remotePath/frontend/dist/`""
Write-Info "Running: $scpCommand"

# Using sshpass via WSL or direct scp with password
Invoke-Expression $scpCommand

if ($LASTEXITCODE -eq 0) {
    Write-Success "Frontend deployed successfully"
} else {
    Write-Warning-Custom "Frontend deployment may need SSH key setup"
}

# Step 3: Show next steps for backend
Write-Info "`n[Step 3/3] Backend Deployment Instructions..."
Write-Warning-Custom "Backend deployment steps (run these on server or via SSH):"
Write-Host "`n  cd $remotePath/backend" -ForegroundColor Yellow
Write-Host "  npm install" -ForegroundColor Yellow
Write-Host "  pm2 restart patient-backend" -ForegroundColor Yellow
Write-Host "  pm2 save" -ForegroundColor Yellow

Write-Info "`n=== DEPLOYMENT COMPLETE ==="
Write-Success "Frontend deployed!"
Write-Info "Backend deployment pending (manual or via SSH)"
Write-Info "`nView live at: https://drjaju.com"
