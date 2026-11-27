# Terraform Workload Identity Integration

The Terraform-managed AKS cluster provides the OIDC issuer used by the
`azurerm_federated_identity_credential` resources. The new cluster issuer is
not hardcoded.

## Kubernetes manifests

The Terraform deployment consumes the Auth and Catalog workloads through the
Kustomize overlay in `k8s/terraform/`. The overlay keeps the same
ServiceAccounts, workload identity pod labels, and `serviceAccountName`
bindings as the Epic 2 manifests under `k8s/`, which remain unchanged. It
points container images at the Terraform ACR (`shopkarttfacr2026`) and
configures Catalog for Azure Blob Storage; see "Catalog storage" below.
Render the overlay locally with `kubectl kustomize ./k8s/terraform` and
review the output before any deployment.

## ServiceAccounts

| Service | Namespace | ServiceAccount |
|---|---|---|
| Auth | `shopkart` | `shopkart-auth-sa` |
| Catalog | `shopkart` | `shopkart-catalog-sa` |

The federated subjects are:

- `system:serviceaccount:shopkart:shopkart-auth-sa`
- `system:serviceaccount:shopkart:shopkart-catalog-sa`

The Kubernetes manifests intentionally contain no environment-specific client
ID. After Terraform creates the identities, run
`powershell -ExecutionPolicy Bypass -File scripts/configure-workload-identity.ps1`
from the repository root. The script reads the Terraform identity client-ID
and AKS cluster name outputs, verifies the current kubectl context targets
that cluster, applies the `k8s/terraform` Kustomize overlay, and annotates
the ServiceAccounts. It is a deployment-time command and was not run during
this integration.

## Catalog storage

The Epic 2 manifest `k8s/catalog.yaml` keeps Catalog on local storage through
`CATALOG_STORAGE_PROVIDER=local` with the PVC and
`CATALOG_UPLOAD_DIR=/app/storage/product-images`.

The `k8s/terraform` overlay configures Catalog for Azure Blob Storage instead:
`CATALOG_STORAGE_PROVIDER=azure`, `AZURE_STORAGE_ACCOUNT_NAME` set to the
Terraform storage account, and `AZURE_STORAGE_CONTAINER` set to the Terraform
`blob_container_name`. The PVC and upload directory are retained for local
fallback. The intended deployment configuration sets
`catalog_blob_storage_access=true`, so the Catalog managed identity receives
Storage Blob Data Contributor on the container. Setting the variable back to
`false` revokes that role assignment; the overlay must then be reverted to
local storage to match.

## Key Vault

No Auth or Catalog source code currently imports
`@azure/keyvault-secrets`, creates a `SecretClient`, or reads a Key Vault URI.
Auth and Catalog therefore require no Key Vault Secrets User role assignment.
Both Terraform booleans remain `false` by default.

## Key Vault naming

The configured name is `shopkart-tf-kv-ea-2026`, which avoids the earlier
`shopkart-tf-kv-2026` name that may conflict with a soft-deleted Key Vault.
Do not purge or recover that old resource. Azure does not expose guaranteed
global availability in source configuration, so name availability must still
be verified during deployment.
