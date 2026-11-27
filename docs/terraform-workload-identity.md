# Terraform Workload Identity Integration

The Terraform-managed AKS cluster provides the OIDC issuer used by the
`azurerm_federated_identity_credential` resources. The new cluster issuer is
not hardcoded.

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
from the repository root. The script reads only the Terraform client-ID outputs
and annotates the ServiceAccounts. It is a deployment-time command and was not
run during this integration.

## Catalog storage

Catalog currently defaults to local storage through
`CATALOG_STORAGE_PROVIDER=local`. It keeps the PVC and
`CATALOG_UPLOAD_DIR=/app/storage/product-images`; Azure Blob Storage remains
dormant and must not be silently enabled.

To enable Azure Blob Storage later, set `CATALOG_STORAGE_PROVIDER=azure`,
provide `AZURE_STORAGE_ACCOUNT_NAME` and `AZURE_STORAGE_CONTAINER`, keep the
Terraform container name from `blob_container_name`, and set
`catalog_blob_storage_access=true` for the Terraform deployment. The default
is `false`, so the Catalog identity receives no Blob role assignment until that
explicit opt-in.

## Key Vault

No Auth or Catalog source code currently imports
`@azure/keyvault-secrets`, creates a `SecretClient`, or reads a Key Vault URI.
Auth and Catalog therefore require no Key Vault Secrets User role assignment.
Both Terraform booleans remain `false` by default.

## Key Vault naming

The configured name `shopkart-tf-kv-2026` may conflict because a previous Key
Vault name was soft-deleted. Do not purge or recover that old resource. Before
deployment, replace it with a project-specific, globally unique name approved
by the team. Azure does not expose guaranteed global availability in source
configuration, so the final availability and resulting name must be verified
during deployment configuration, not assumed from this repository.
