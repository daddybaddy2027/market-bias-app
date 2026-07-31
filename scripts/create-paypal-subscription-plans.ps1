[CmdletBinding()]
param(
  [ValidateSet("sandbox", "live")]
  [string]$Environment = "sandbox",

  [string]$ClientId = $env:PAYPAL_CLIENT_ID,
  [string]$ClientSecret = $env:PAYPAL_CLIENT_SECRET,
  [string]$ExistingProductId = "",
  [string]$OutputPath = ".paypal-plan-ids.json"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Read-SecretText {
  param([Parameter(Mandatory = $true)][string]$Prompt)

  $secure = Read-Host $Prompt -AsSecureString
  $pointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)

  try {
    return [Runtime.InteropServices.Marshal]::PtrToStringBSTR($pointer)
  }
  finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($pointer)
  }
}

function New-RequestId {
  return [Guid]::NewGuid().ToString("N")
}

if ([string]::IsNullOrWhiteSpace($ClientId)) {
  $ClientId = Read-Host "PayPal $Environment client ID"
}

if ([string]::IsNullOrWhiteSpace($ClientSecret)) {
  $ClientSecret = Read-SecretText "PayPal $Environment client secret"
}

if ([string]::IsNullOrWhiteSpace($ClientId) -or [string]::IsNullOrWhiteSpace($ClientSecret)) {
  throw "PayPal client ID and client secret are required."
}

$baseUrl = if ($Environment -eq "sandbox") {
  "https://api-m.sandbox.paypal.com"
}
else {
  "https://api-m.paypal.com"
}

Write-Host "Connecting to PayPal $Environment..." -ForegroundColor Cyan

$basicBytes = [Text.Encoding]::ASCII.GetBytes("${ClientId}:${ClientSecret}")
$basicAuth = [Convert]::ToBase64String($basicBytes)

$tokenResponse = Invoke-RestMethod \
  -Method Post \
  -Uri "$baseUrl/v1/oauth2/token" \
  -Headers @{ Authorization = "Basic $basicAuth" } \
  -ContentType "application/x-www-form-urlencoded" \
  -Body "grant_type=client_credentials"

$accessToken = [string]$tokenResponse.access_token
if ([string]::IsNullOrWhiteSpace($accessToken)) {
  throw "PayPal did not return an OAuth access token."
}

function Invoke-PayPalPost {
  param(
    [Parameter(Mandatory = $true)][string]$Path,
    [Parameter(Mandatory = $true)][hashtable]$Body
  )

  $json = $Body | ConvertTo-Json -Depth 20

  return Invoke-RestMethod \
    -Method Post \
    -Uri "$baseUrl$Path" \
    -Headers @{
      Authorization = "Bearer $accessToken"
      Accept = "application/json"
      Prefer = "return=representation"
      "PayPal-Request-Id" = New-RequestId
    } \
    -ContentType "application/json" \
    -Body $json
}

$productId = $ExistingProductId.Trim()

if ([string]::IsNullOrWhiteSpace($productId)) {
  Write-Host "Creating AI Market Expert catalog product..." -ForegroundColor Cyan

  $product = Invoke-PayPalPost \
    -Path "/v1/catalogs/products" \
    -Body @{
      name = "AI Market Expert"
      description = "Cross-asset FX models and technical and fundamental market outlook subscriptions."
      type = "SERVICE"
      category = "SOFTWARE"
      home_url = "https://market-bias-app-gamma.vercel.app"
    }

  $productId = [string]$product.id
}

if ([string]::IsNullOrWhiteSpace($productId)) {
  throw "PayPal product creation did not return a product ID."
}

function New-MonthlyPlan {
  param(
    [Parameter(Mandatory = $true)][string]$Name,
    [Parameter(Mandatory = $true)][string]$Description,
    [Parameter(Mandatory = $true)][string]$Price
  )

  Write-Host "Creating $Name at EUR $Price/month..." -ForegroundColor Cyan

  $plan = Invoke-PayPalPost \
    -Path "/v1/billing/plans" \
    -Body @{
      product_id = $productId
      name = $Name
      description = $Description
      status = "ACTIVE"
      billing_cycles = @(
        @{
          frequency = @{
            interval_unit = "MONTH"
            interval_count = 1
          }
          tenure_type = "REGULAR"
          sequence = 1
          total_cycles = 0
          pricing_scheme = @{
            fixed_price = @{
              value = $Price
              currency_code = "EUR"
            }
          }
        }
      )
      payment_preferences = @{
        auto_bill_outstanding = $true
        setup_fee = @{
          value = "0.00"
          currency_code = "EUR"
        }
        setup_fee_failure_action = "CONTINUE"
        payment_failure_threshold = 3
      }
      quantity_supported = $false
    }

  if ([string]::IsNullOrWhiteSpace([string]$plan.id)) {
    throw "PayPal did not return a plan ID for $Name."
  }

  if ([string]$plan.status -ne "ACTIVE") {
    throw "Plan $Name was created with unexpected status '$($plan.status)'."
  }

  return $plan
}

$modelsPlan = New-MonthlyPlan \
  -Name "AI Market Expert Models" \
  -Description "Full AI model board, current predictions, model history and transparent performance tracking." \
  -Price "24.99"

$outlookPlan = New-MonthlyPlan \
  -Name "AI Market Expert Outlook" \
  -Description "Technical and fundamental market outlook, scenarios, invalidation and publication archive." \
  -Price "25.00"

$completePlan = New-MonthlyPlan \
  -Name "AI Market Expert Complete" \
  -Description "Full AI model access plus the complete technical and fundamental outlook." \
  -Price "50.00"

$result = [ordered]@{
  environment = $Environment
  created_at_utc = [DateTime]::UtcNow.ToString("o")
  product_id = $productId
  models_plan_id = [string]$modelsPlan.id
  outlook_plan_id = [string]$outlookPlan.id
  complete_plan_id = [string]$completePlan.id
}

$result | ConvertTo-Json -Depth 5 | Set-Content -Path $OutputPath -Encoding UTF8

Write-Host "" 
Write-Host "PayPal subscription plans created successfully." -ForegroundColor Green
Write-Host "Product ID:  $productId"
Write-Host "Models ID:   $($modelsPlan.id)"
Write-Host "Outlook ID:  $($outlookPlan.id)"
Write-Host "Complete ID: $($completePlan.id)"
Write-Host "" 
Write-Host "Saved non-secret IDs to: $OutputPath" -ForegroundColor Green
Write-Host "Do not commit that generated file." -ForegroundColor Yellow
Write-Host "" 
Write-Host "Vercel variables:" -ForegroundColor Cyan
Write-Host "EXPO_PUBLIC_PAYPAL_CLIENT_ID=$ClientId"
Write-Host "EXPO_PUBLIC_PAYPAL_MODELS_PLAN_ID=$($modelsPlan.id)"
Write-Host "EXPO_PUBLIC_PAYPAL_OUTLOOK_PLAN_ID=$($outlookPlan.id)"
Write-Host "EXPO_PUBLIC_PAYPAL_COMPLETE_PLAN_ID=$($completePlan.id)"
Write-Host "" 
Write-Host "Supabase Edge Function secrets:" -ForegroundColor Cyan
Write-Host "PAYPAL_ENV=$Environment"
Write-Host "PAYPAL_CLIENT_ID=$ClientId"
Write-Host "PAYPAL_CLIENT_SECRET=<keep this secret>"
Write-Host "PAYPAL_MODELS_PLAN_ID=$($modelsPlan.id)"
Write-Host "PAYPAL_OUTLOOK_PLAN_ID=$($outlookPlan.id)"
Write-Host "PAYPAL_COMPLETE_PLAN_ID=$($completePlan.id)"
