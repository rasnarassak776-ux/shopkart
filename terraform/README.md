
# ShopKart Terraform Infrastructure

## Objective
Create a new Azure environment using Terraform while preserving
the existing ShopKart deployment.

## Environment
- New Resource Group: shopkart-terraform (proposed)
- Default Region: southeastasia (proposed)
- Terraform Provider: hashicorp/azurerm ~> 4.0
- Remote State: Azure Blob Storage (pending setup)
- Terraform Import: Not required

## Module Responsibilities

| Member | Module | Responsibilities |
|--------|--------|------------------|
| Member 1 | foundation | Resource Group and ACR |
| Member 2 | data | PostgreSQL, Storage Account, Blob Container, remote backend |
| Member 3 | compute | AKS, node pools and networking |
| Member 4 | security | Key Vault, managed identities and RBAC |

## Module Interfaces

### foundation
Inputs: resource_group_name, location, acr_name
Outputs: resource_group_name, resource_group_id,
         acr_id, acr_login_server

### data
Inputs: resource_group_name, location, database and storage settings
Outputs: postgres_server_id, storage_account_id

### compute
Inputs: resource_group_name, location, AKS settings
Outputs: aks_cluster_id, cluster identity

### security
Inputs: resource_group_name, location, Key Vault and identity settings
Outputs: key_vault_id, managed_identity_ids

Exact input/output names must be agreed upon before module development.

## Git Workflow
- Shared setup branch: terraform/shared-setup
- Member 1 branch: terraform/foundation
- Member 2 branch: terraform/data
- Member 3 branch: terraform/compute
- Member 4 branch: terraform/security
- Each member creates a pull request for review.
- Do not edit shared root files without coordination.

## Safety
- Do not delete existing ShopKart resources.
- Do not commit secrets, credentials, state files or saved plans.
- Use Azure Blob Storage for remote Terraform state.
- Review Azure costs before provisioning resources.
- Run terraform apply only after explicit team approval.
