$ErrorActionPreference = "Stop"

$terraformDir = Join-Path $PSScriptRoot "..\terraform"
$k8sOverlay = Join-Path $PSScriptRoot "..\k8s\terraform"

Push-Location $terraformDir
try {
    $authClientId = terraform output -raw auth_identity_client_id
    $catalogClientId = terraform output -raw catalog_identity_client_id
    $aksClusterName = terraform output -raw aks_cluster_name
}
finally {
    Pop-Location
}

if ([string]::IsNullOrWhiteSpace($authClientId) -or [string]::IsNullOrWhiteSpace($catalogClientId) -or [string]::IsNullOrWhiteSpace($aksClusterName)) {
    throw "Terraform identity client ID and AKS cluster name outputs must not be empty."
}

$context = kubectl config current-context
if ([string]::IsNullOrWhiteSpace($context) -or $context -notlike "*$aksClusterName*") {
    throw "Current kubectl context '$context' does not match the Terraform AKS cluster '$aksClusterName'. Run 'az aks get-credentials' for the intended cluster first."
}
kubectl cluster-info | Out-Null

kubectl apply -k $k8sOverlay

kubectl annotate serviceaccount shopkart-auth-sa -n shopkart `
    azure.workload.identity/client-id=$authClientId --overwrite
kubectl annotate serviceaccount shopkart-catalog-sa -n shopkart `
    azure.workload.identity/client-id=$catalogClientId --overwrite

Write-Host "Workload Identity ServiceAccounts configured."
