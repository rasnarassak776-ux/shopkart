# ShopKart Terraform Infrastructure

## Objective

Create a new Azure environment using Terraform while preserving the existing ShopKart deployment developed during Epic 2.

The Terraform-managed environment is separate from the existing infrastructure. Importing existing Azure resources is not part of the current implementation approach.

## Environment

| Configuration | Value |
|---|---|
| New Resource Group | shopkart-terraform (proposed) |
| Deployment Region | eastasia (AKS feasibility verified; PostgreSQL verification pending) |
| Terraform Version | 1.17.2 (tested) |
| AzureRM Provider | 4.81.0 (tested) |
| Remote State | Azure Blob Storage |
| Backend Authentication | Microsoft Entra ID |
| Terraform Workspace | default |
| Terraform Import | Not required under the current approach |

## Module Responsibilities

| Member | Module | Responsibilities |
|---|---|---|
| Member 1 | foundation | Resource Group, ACR, root integration, backend security and deployment coordination |
| Member 2 | data | PostgreSQL, Storage Account, Blob Container, database networking and initial remote backend setup |
| Member 3 | compute | AKS, node pools, virtual networking and ACR integration |
| Member 4 | security | Key Vault, managed identities, RBAC and workload identity integration |

## Project Structure

```text
terraform/
├── backend.tf
├── main.tf
├── variables.tf
├── outputs.tf
├── providers.tf
├── versions.tf
├── terraform.tfvars.example
├── .terraform.lock.hcl
├── .gitignore
├── README.md
└── modules/
    ├── foundation/
    ├── data/
    ├── compute/
    └── security/
```

## Module Interfaces

### Foundation

Creates the resource group and Azure Container Registry.

Key outputs:

- resource_group_name
- resource_group_id
- acr_id
- acr_login_server

### Data

Manages PostgreSQL Flexible Server, application storage, private database networking and DNS configuration.

Key outputs:

- postgresql_server_id
- postgresql_server_fqdn
- postgresql_database_name
- storage_account_id
- storage_account_name
- blob_container_id
- blob_container_name

### Compute

Manages AKS, virtual networking, cluster identity, workload identity configuration and ACR image-pull permissions.

Key outputs:

- vnet_id
- vnet_name
- subnet_id
- aks_cluster_id
- aks_cluster_name
- aks_identity_principal_id
- aks_kubelet_identity_object_id
- aks_oidc_issuer_url

### Security

Manages Azure Key Vault, application managed identities and associated RBAC permissions.

Key outputs:

- key_vault_id
- key_vault_name
- key_vault_uri
- auth_identity_client_id
- auth_identity_principal_id
- catalog_identity_client_id
- catalog_identity_principal_id

Refer to each module's variables.tf and outputs.tf files for its complete and authoritative interface.

## Remote State Management

The Azure Blob Storage remote backend has been implemented and successfully initialized.

| Configuration | Value |
|---|---|
| Resource Group | shopkart-tf-state-rg |
| Storage Account | shopkarttfstate2026 |
| Container | tfstate |
| State Key | shopkart-terraform.tfstate |
| Authentication | Microsoft Entra ID using Azure CLI |
| Minimum TLS | TLS 1.2 |
| HTTPS Only | Enabled |
| Anonymous Blob Access | Disabled |
| Blob Versioning | Enabled |
| Blob Soft-delete | Enabled — 14 days |
| Container Soft-delete | Enabled — 14 days |

The backend infrastructure is maintained separately from the application infrastructure managed by the root Terraform configuration.

See the [Remote Backend Configuration Guide](../docs/terraform-remote-backend.md) for authentication, initialization, security and verification procedures.

## Terraform Workflow

All Terraform commands must be executed against the intended subscription and environment.

The standard workflow consists of:

1. Authenticate using Azure CLI.
2. Verify the Azure subscription and backend permissions.
3. Initialize Terraform.
4. Check formatting and validate the configuration.
5. Prepare and review a Terraform plan.
6. Obtain explicit team approval.
7. Apply the approved saved plan.
8. Verify deployed infrastructure and Terraform state.

Deployment operations must not be performed until all module integration, resource availability, quota and cost requirements are confirmed.

## Git Workflow

- Shared setup branch: terraform/shared-setup
- Member 1 branch: terraform/foundation
- Member 2 branch: terraform/data
- Member 3 branch: terraform/compute
- Member 4 branch: terraform/security

Create dedicated feature branches for subsequent integration, security and documentation changes.

All changes should be reviewed through pull requests. Coordinate changes to shared root configuration files to avoid conflicts.

## Current Implementation Status

- Initial Foundation, Data, Compute and Security modules implemented and merged.
- Initial root module integration completed.
- Private PostgreSQL networking and AKS ACR integration implemented.
- Remote backend authentication and storage protection implemented.
- Remote backend initialization successfully verified by Member 1.
- Default workspace verified.
- No tracked resource instances found in the remote state during verification.
- Integrated Terraform validation passed at commit 0b7a425.

## Pending Deployment Requirements

- Confirm PostgreSQL SKU availability.
- Confirm AKS VM SKU availability and CPU quotas.
- Finalize deployment region and resource sizing.
- Complete final Security and workload identity integration.
- Confirm an available Key Vault name or approved recovery strategy.
- Verify backend permissions for authorized team members.
- Review final integrated Terraform configuration.
- Review the consolidated Terraform plan and estimated costs.
- Obtain explicit team approval before deployment.

## Safety

- Do not modify or delete existing Epic 2 infrastructure.
- Do not commit secrets, credentials, state files or saved plans.
- Do not overwrite or migrate Terraform state without explicit approval.
- Do not bypass Terraform state locking.
- Do not perform concurrent infrastructure-changing operations.
- Review Azure resource availability and costs before provisioning.
- Execute Terraform apply or destroy only after explicit team approval.

Successful Terraform validation does not guarantee that Azure resources can be provisioned. Subscription restrictions, quotas, regional capacity and runtime integration must be verified separately.