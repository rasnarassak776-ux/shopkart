
# ==================================================
# 1. Foundation Module Outputs
# ==================================================

output "resource_group_name" {
  description = "Name of the Terraform-managed resource group"
  value       = module.foundation.resource_group_name
}

output "resource_group_id" {
  description = "Resource ID of the resource group"
  value       = module.foundation.resource_group_id
}

output "acr_id" {
  description = "Resource ID of the Azure Container Registry"
  value       = module.foundation.acr_id
}

output "acr_login_server" {
  description = "Login server of the Azure Container Registry"
  value       = module.foundation.acr_login_server
}

# ==================================================
# 2. Data Module Outputs
# ==================================================

output "postgresql_server_id" {
  description = "Resource ID of the PostgreSQL server"
  value       = module.data.postgresql_server_id
}

output "postgresql_server_name" {
  description = "Name of the PostgreSQL server"
  value       = module.data.postgresql_server_name
}

output "postgresql_server_fqdn" {
  description = "Fully qualified domain name of PostgreSQL"
  value       = module.data.postgresql_server_fqdn
}

output "postgresql_database_name" {
  description = "Name of the application database"
  value       = module.data.postgresql_database_name
}

output "storage_account_id" {
  description = "Resource ID of the Storage Account"
  value       = module.data.storage_account_id
}

output "storage_account_name" {
  description = "Name of the Storage Account"
  value       = module.data.storage_account_name
}

output "blob_container_name" {
  description = "Name of the Blob Container"
  value       = module.data.blob_container_name
}

output "blob_container_id" {
  description = "Resource ID of the Blob Container"
  value       = module.data.blob_container_id
}

# ==================================================
# 3. Compute Module Outputs
# ==================================================

output "vnet_id" {
  description = "Resource ID of the AKS virtual network"
  value       = module.compute.vnet_id
}

output "vnet_name" {
  description = "Name of the AKS virtual network"
  value       = module.compute.vnet_name
}

output "subnet_id" {
  description = "Resource ID of the AKS subnet"
  value       = module.compute.subnet_id
}

output "aks_cluster_id" {
  description = "Resource ID of the AKS cluster"
  value       = module.compute.aks_cluster_id
}

output "aks_cluster_name" {
  description = "Name of the AKS cluster"
  value       = module.compute.aks_cluster_name
}

output "aks_identity_id" {
  description = "Resource ID of the AKS control-plane identity"
  value       = module.compute.aks_identity_id
}

output "aks_identity_principal_id" {
  description = "Principal ID of the AKS control-plane identity"
  value       = module.compute.aks_identity_principal_id
}

output "aks_kubelet_identity_object_id" {
  description = "Object ID of the AKS kubelet identity"
  value       = module.compute.aks_kubelet_identity_object_id
}

output "aks_oidc_issuer_url" {
  description = "OIDC issuer URL for AKS Workload Identity"
  value       = module.compute.aks_oidc_issuer_url
}

# ==================================================
# 4. Security Module Outputs
# ==================================================

output "key_vault_id" {
  description = "Resource ID of the Azure Key Vault"
  value       = module.security.key_vault_id
}

output "key_vault_name" {
  description = "Name of the Azure Key Vault"
  value       = module.security.key_vault_name
}

output "key_vault_uri" {
  description = "URI of the Azure Key Vault"
  value       = module.security.key_vault_uri
}

output "auth_identity_id" {
  description = "Resource ID of the Auth managed identity"
  value       = module.security.auth_identity_id
}

output "auth_identity_client_id" {
  description = "Client ID of the Auth managed identity"
  value       = module.security.auth_identity_client_id
}

output "auth_identity_principal_id" {
  description = "Principal ID of the Auth managed identity"
  value       = module.security.auth_identity_principal_id
}

output "catalog_identity_id" {
  description = "Resource ID of the Catalog managed identity"
  value       = module.security.catalog_identity_id
}

output "catalog_identity_client_id" {
  description = "Client ID of the Catalog managed identity"
  value       = module.security.catalog_identity_client_id
}

output "catalog_identity_principal_id" {
  description = "Principal ID of the Catalog managed identity"
  value       = module.security.catalog_identity_principal_id
}
