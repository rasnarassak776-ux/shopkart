# ShopKart — Terraform Remote Backend Configuration

## 1. Objective

Implement centralized, secure Terraform state management for the new ShopKart Azure environment while preserving the existing Epic 2 infrastructure.

The remote backend allows authorized team members to access a common Terraform state and supports state locking to prevent conflicting infrastructure operations.

## 2. Backend Architecture

| Component | Configuration |
|---|---|
| Backend Type | azurerm |
| Resource Group | shopkart-tf-state-rg |
| Storage Account | shopkarttfstate2026 |
| Storage Account Type | StorageV2 |
| Replication | Standard_LRS |
| Backend Region | Southeast Asia |
| Container | tfstate |
| State Key | shopkart-terraform.tfstate |
| Workspace | default |
| Authentication | Microsoft Entra ID using Azure CLI |

The backend storage account is maintained separately from the application infrastructure managed by the root Terraform configuration.

The backend must exist before Terraform initialization.

## 3. Team Contributions

### Member 2 — Initial Backend Implementation

- Initial backend infrastructure setup.
- Azure Storage backend configuration.
- Integration of backend.tf into the main branch.

### Member 1 — Backend Security and Integration

- Backend infrastructure verification.
- Investigation of Azure RBAC permissions.
- Container-scoped Storage Blob Data Contributor permission configuration.
- Storage security and recovery protection.
- Microsoft Entra ID authentication configuration.
- Backend initialization and state verification.
- Integrated Terraform validation.
- Backend documentation.

## 4. Terraform Backend Configuration

File: terraform/backend.tf

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "shopkart-tf-state-rg"
    storage_account_name = "shopkarttfstate2026"
    container_name       = "tfstate"
    key                  = "shopkart-terraform.tfstate"
    use_azuread_auth     = true
    use_cli              = true
  }
}
```

The authentication settings were introduced through pull request #19, preserving the original backend configuration implemented by Member 2.

## 5. Authentication and Authorization

Terraform uses Microsoft Entra ID for backend data access, with Azure CLI authentication enabled.

Authorized Terraform operators require appropriate Azure Blob Storage data-plane permissions.

The Storage Blob Data Contributor role has been configured for Member 1 at the tfstate container scope.

Container-scoped permissions reduce unnecessary access to unrelated storage resources.

Azure subscription management permissions alone do not automatically provide blob data-plane access through Microsoft Entra ID.

Backend access for other team members must be verified separately before they perform Terraform operations.

Storage account access keys and SAS tokens must not be committed to the repository.

## 6. Storage Security Configuration

The following settings were implemented and verified on 27 November 2026.

| Security Setting | Previous Configuration | Final Configuration |
|---|---|---|
| Minimum TLS | TLS 1.0 | TLS 1.2 |
| HTTPS Only | Enabled | Enabled |
| Anonymous Blob Access | Disabled | Disabled |
| Blob Versioning | Not enabled | Enabled |
| Blob Soft-delete | Disabled | Enabled |
| Blob Retention | Not configured | 14 days |
| Container Soft-delete | Not configured | Enabled |
| Container Retention | Not configured | 14 days |
| Shared-key Access | Not explicitly configured | Unchanged |

### TLS Protection

TLS 1.2 is enforced to protect communication between Terraform clients and Azure Storage.

### Blob Versioning

Blob versioning preserves previous versions when state data is updated, supporting recovery from accidental overwrites.

### Blob Soft-delete

Blob soft-delete provides a 14-day recovery period for eligible deleted blob data.

### Container Soft-delete

Container soft-delete provides a 14-day recovery period for accidentally deleted containers.

### Cost Considerations

Versioning and soft-delete can increase storage consumption as previous versions and deleted data accumulate.

These features do not require additional compute infrastructure. Actual storage costs depend on retained data and storage operations.

## 7. Backend Initialization Procedure

Run the following commands from the ShopKart repository root.

### Authenticate and Verify Subscription

```powershell
az login
az account show --query "{Subscription:name,SubscriptionId:id,State:state}" --output table
```

Confirm that the active subscription is the approved ShopKart subscription.

### Verify Local State

```powershell
Get-ChildItem -Path .\terraform -Filter "terraform.tfstate*" -File -Force
```

Check for custom Terraform data directories and workspace overrides:

```powershell
Get-Item Env:TF_DATA_DIR,Env:TF_WORKSPACE -ErrorAction SilentlyContinue
```

If existing local infrastructure state or an unexpected workspace configuration is detected, stop and coordinate with the team before initialization.

### Initialize Terraform

The following command was successfully used for Member 1's controlled backend initialization:

```powershell
terraform -chdir=terraform init -reconfigure -input=false -lockfile=readonly
```

This configures the existing remote backend without requesting state migration and preserves the existing provider lock file.

Do not use state migration or force-copy options without explicit approval.

## 8. Backend Verification

### Verify Workspace

```powershell
terraform -chdir=terraform workspace show
```

Expected workspace for the current environment:

```text
default
```

### Verify Tracked Resources

```powershell
terraform -chdir=terraform state list
```

On 27 November 2026, this command returned no resource addresses and completed with exit code 0.

This confirmed that the remote state contained no listed resource instances at the time of verification.

### Validate Terraform Configuration

```powershell
terraform -chdir=terraform validate
```

Verified result:

```text
Success! The configuration is valid.
```

## 9. Implementation Verification Record

| Verification | Result |
|---|---|
| Verification Date | 27 November 2026 |
| Terraform Version | 1.17.2 |
| AzureRM Provider Version | 4.81.0 |
| Backend Authentication Commit | 8caf87a |
| Pull Request | #19 |
| Verified Main Commit | 0b7a425 |
| Backend Initialization | Successful |
| Active Workspace | default |
| Remote State Blob Size Before Initialization | 181 bytes |
| State Lease Before Initialization | Unlocked |
| Tracked Resource Instances | 0 |
| State List Exit Code | 0 |
| Terraform Validation | Successful |
| Validation Exit Code | 0 |
| Git Working Tree | Clean |

The remote state resource inventory was verified using Terraform rather than inferred from the blob size.

These results represent the environment at the time of verification and must not be treated as permanent state values.

## 10. Team Workflow and State Locking

The AzureRM backend supports state locking through Azure Blob leases.

Team members must:

- Use the approved backend configuration.
- Authenticate using their authorized Azure identity.
- Verify the intended subscription and workspace.
- Coordinate infrastructure-changing Terraform operations.
- Respect Terraform state locks.
- Avoid unauthorized state migration, restoration or modification.
- Obtain explicit team approval before applying infrastructure changes.

If Terraform reports a state lock, investigate the active operation before attempting any recovery action.

Do not force-unlock state unless the team has confirmed that the lock is stale and recovery has been explicitly approved.

## 11. Pending Verification and Limitations

The technical backend implementation has been successfully verified for Member 1.

The following items remain pending:

- Backend access verification for other authorized team members.
- Verification of state-lock acquisition during an approved Terraform operation.
- Final integrated Terraform configuration review.
- PostgreSQL SKU availability confirmation.
- AKS VM SKU and quota confirmation.
- Final Security and workload identity integration.
- Key Vault naming or recovery decision.
- Consolidated Terraform plan and cost review.
- Team approval for infrastructure deployment.

Shared-key authentication has not been explicitly disabled on the storage account. Terraform is configured to use Microsoft Entra ID instead.

Successful backend initialization and Terraform validation do not guarantee successful Azure infrastructure deployment.

## 12. Safety Requirements

- Preserve the existing Epic 2 infrastructure.
- Keep Terraform backend resources separate from application infrastructure.
- Never commit Terraform state files, secrets, credentials or saved plans.
- Never migrate old state backups into the remote backend without review.
- Never overwrite the remote state without explicit approval.
- Do not bypass Terraform state locking.
- Review Azure costs, quotas and regional availability before deployment.
- Execute Terraform apply or destroy only after explicit team approval.

## 13. Conclusion

The ShopKart Terraform remote backend has been configured, secured, initialized and verified successfully for Member 1.

The implementation provides centralized state management, Microsoft Entra ID authentication, container-scoped authorization, encrypted communication and state recovery protection.

The remote state contained no tracked resource instances during verification, and the integrated Terraform configuration passed validation.

The backend is prepared for the next stage of controlled Terraform integration, subject to team access coordination and the remaining deployment readiness requirements.