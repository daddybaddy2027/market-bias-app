$ErrorActionPreference = "Stop"

$SourceDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BackendRoot = "C:\Users\Veljko\Desktop\Multi-asset-12h"
$TargetDir = Join-Path $BackendRoot "backend_integration"

Write-Host "Installing final 13-model backend integration..." -ForegroundColor Cyan
Write-Host "Source: $SourceDir"
Write-Host "Target: $TargetDir"

if (-not (Test-Path $BackendRoot)) {
    throw "Backend folder does not exist: $BackendRoot"
}

New-Item -ItemType Directory -Force -Path $TargetDir | Out-Null
Copy-Item -Path (Join-Path $SourceDir "*") -Destination $TargetDir -Recurse -Force
Copy-Item -Path (Join-Path $TargetDir "live_model_policy.json") -Destination (Join-Path $BackendRoot "live_model_policy.json") -Force

python -u (Join-Path $TargetDir "patch_scheduler.py")

Write-Host "" 
Write-Host "Backend integration installed." -ForegroundColor Green
Write-Host "Test command:" -ForegroundColor Yellow
Write-Host "python -u $TargetDir\merge_13_model_board.py"
Write-Host "" 
Write-Host "Full upload command:" -ForegroundColor Yellow
Write-Host "python -u $TargetDir\13_upload_to_supabase.py"
