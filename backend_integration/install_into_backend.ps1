$ErrorActionPreference = "Stop"

$SourceDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendRoot = "C:\Users\Veljko\Desktop\Multi-asset-12h"
$TargetDir = Join-Path $BackendRoot "backend_integration"

Write-Host "Installing Production Integrity V2 backend integration..." -ForegroundColor Cyan
Write-Host "Source: $SourceDir"
Write-Host "Target: $TargetDir"

if (-not (Test-Path $BackendRoot)) {
    throw "Backend folder does not exist: $BackendRoot"
}

New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null
Copy-Item -Path (Join-Path $SourceDir "*") -Destination $TargetDir -Recurse -Force
Copy-Item -Path (Join-Path $TargetDir "live_model_policy.json") -Destination (Join-Path $BackendRoot "live_model_policy.json") -Force

python -u (Join-Path $TargetDir "patch_scheduler.py")
if ($LASTEXITCODE -ne 0) {
    throw "Scheduler patch failed with exit code $LASTEXITCODE"
}

Write-Host ""
Write-Host "Backend integration installed." -ForegroundColor Green
Write-Host "Active production models:" -ForegroundColor Yellow
Write-Host "- GBPUSD_12H_FINAL_APP_V2"
Write-Host "- EURUSD_3H_PROD_V1"
Write-Host "- EURUSD_6H_FINAL_APP_V2"
Write-Host ""
Write-Host "One-shot verification and upload:" -ForegroundColor Yellow
Write-Host "python -u $TargetDir\13_upload_to_supabase.py"
