$ErrorActionPreference = "Stop"

$terraformDir = Join-Path $PSScriptRoot "..\terraform"
$k8sOverlay = Join-Path $PSScriptRoot "..\k8s\terraform"

Push-Location $terraformDir
try {
    $authClientId = terraform output -raw auth_identity_client_id
    $catalogClientId = terraform output -raw catalog_identity_client_id
}
finally {
    Pop-Location
}

if ([string]::IsNullOrWhiteSpace($authClientId) -or [string]::IsNullOrWhiteSpace($catalogClientId)) {
    throw "Terraform identity client ID outputs must not be empty."
}

kubectl apply -k $k8sOverlay

kubectl annotate serviceaccount shopkart-auth-sa -n shopkart `
    azure.workload.identity/client-id=$authClientId --overwrite
kubectl annotate serviceaccount shopkart-catalog-sa -n shopkart `
    azure.workload.identity/client-id=$catalogClientId --overwrite

Write-Host "Workload Identity ServiceAccounts configured."
