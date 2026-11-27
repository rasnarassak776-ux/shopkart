$ErrorActionPreference = "Stop"

function Assert-CommandSuccess {
    param(
        [Parameter(Mandatory = $true)]
        [string]$StepDescription
    )
    if ($LASTEXITCODE -ne 0) {
        throw "Command failed during: $StepDescription (Exit Code: $LASTEXITCODE)"
    }
}

$terraformDir = Join-Path $PSScriptRoot "..\terraform"
$dedicatedKubeconfig = Join-Path $HOME ".kube\shopkart-terraform-config"

# 1. Dedicated Terraform Kubernetes configuration
if (-not (Test-Path $dedicatedKubeconfig)) {
    throw "Dedicated Terraform kubeconfig not found at '$dedicatedKubeconfig'. Please ensure kubeconfig exists."
}
$env:KUBECONFIG = $dedicatedKubeconfig

# 2. Retrieve Managed Identity client IDs and AKS cluster name from Terraform outputs
Push-Location $terraformDir
try {
    $authClientId = (& terraform output -raw auth_identity_client_id).Trim()
    Assert-CommandSuccess "Retrieve auth_identity_client_id from Terraform"

    $catalogClientId = (& terraform output -raw catalog_identity_client_id).Trim()
    Assert-CommandSuccess "Retrieve catalog_identity_client_id from Terraform"

    $aksClusterName = (& terraform output -raw aks_cluster_name).Trim()
    Assert-CommandSuccess "Retrieve aks_cluster_name from Terraform"
}
finally {
    Pop-Location
}

if ([string]::IsNullOrWhiteSpace($authClientId) -or [string]::IsNullOrWhiteSpace($catalogClientId) -or [string]::IsNullOrWhiteSpace($aksClusterName)) {
    throw "Terraform identity client ID and AKS cluster name outputs must not be empty."
}

# 3. Verify Kubernetes context using an exact match
$context = (& kubectl config current-context).Trim()
Assert-CommandSuccess "Get current kubectl context"

if ($context -ne $aksClusterName) {
    throw "Current kubectl context '$context' does not exactly match expected Terraform AKS cluster '$aksClusterName'."
}

# 4. Verify target cluster connectivity before modification
& kubectl cluster-info | Out-Null
Assert-CommandSuccess "Verify target cluster connectivity via kubectl cluster-info"

# 5. Create or update namespace safely
& kubectl create namespace shopkart --dry-run=client -o yaml | kubectl apply -f -
Assert-CommandSuccess "Ensure shopkart namespace exists"

# 6. Create or update ServiceAccounts safely before application pods are created
& kubectl create serviceaccount shopkart-auth-sa -n shopkart --dry-run=client -o yaml | kubectl apply -f -
Assert-CommandSuccess "Ensure shopkart-auth-sa ServiceAccount exists"

& kubectl create serviceaccount shopkart-catalog-sa -n shopkart --dry-run=client -o yaml | kubectl apply -f -
Assert-CommandSuccess "Ensure shopkart-catalog-sa ServiceAccount exists"

# 7. Annotate ServiceAccounts with Managed Identity client IDs
& kubectl annotate serviceaccount shopkart-auth-sa -n shopkart `
    azure.workload.identity/client-id=$authClientId --overwrite
Assert-CommandSuccess "Annotate shopkart-auth-sa with client ID"

& kubectl annotate serviceaccount shopkart-catalog-sa -n shopkart `
    azure.workload.identity/client-id=$catalogClientId --overwrite
Assert-CommandSuccess "Annotate shopkart-catalog-sa with client ID"

Write-Host "Workload Identity ServiceAccounts configured successfully for cluster '$aksClusterName'."
