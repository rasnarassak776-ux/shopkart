
$ErrorActionPreference = "Stop"

$acr = "shopkartacr2026"
$image = "$acr.azurecr.io/shopkart-auth:v3"
$namespace = "shopkart"
$deployment = "shopkart-auth"

function Check-Step {
    if ($LASTEXITCODE -ne 0) {
        throw "Deployment stopped because the previous command failed."
    }
}

Write-Host "Step 1: Building Auth v3..."
docker build -f Dockerfile.auth -t $image .
Check-Step

Write-Host "Step 2: Logging into Azure Container Registry..."
az acr login --name $acr
Check-Step

Write-Host "Step 3: Pushing Auth v3..."
docker push $image
Check-Step

Write-Host "Step 4: Checking AKS context..."
$context = kubectl config current-context
Check-Step

if ($context.Trim() -ne "shopkart-aks") {
    throw "Wrong Kubernetes context: $context"
}

Write-Host "Step 5: Backing up current Auth deployment..."
kubectl get deployment $deployment -n $namespace -o yaml |
    Out-File -FilePath "shopkart-auth-before-v3.yaml" -Encoding utf8
Check-Step

Write-Host "Step 6: Updating Auth image..."
kubectl set image "deployment/$deployment" `
    "shopkart-auth=$image" -n $namespace
Check-Step

Write-Host "Step 7: Waiting for rollout..."
kubectl rollout status "deployment/$deployment" `
    -n $namespace --timeout=300s
Check-Step

Write-Host "Step 8: Checking pods..."
kubectl get pods -n $namespace
Check-Step

Write-Host "Auth v3 deployment completed."
