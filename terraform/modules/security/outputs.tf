# Key Vault outputs
output "key_vault_id" {
  description = "Resource ID of the Key Vault"
  value       = azurerm_key_vault.security.id
}

output "key_vault_name" {
  description = "Name of the Key Vault"
  value       = azurerm_key_vault.security.name
}

output "key_vault_uri" {
  description = "URI of the Key Vault"
  value       = azurerm_key_vault.security.vault_uri
}

# Auth managed identity outputs
output "auth_identity_id" {
  description = "Resource ID of the Auth managed identity"
  value       = azurerm_user_assigned_identity.auth.id
}

output "auth_identity_client_id" {
  description = "Client ID of the Auth managed identity"
  value       = azurerm_user_assigned_identity.auth.client_id
}

output "auth_identity_principal_id" {
  description = "Principal ID of the Auth managed identity"
  value       = azurerm_user_assigned_identity.auth.principal_id
}

# Catalog managed identity outputs
output "catalog_identity_id" {
  description = "Resource ID of the Catalog managed identity"
  value       = azurerm_user_assigned_identity.catalog.id
}

output "catalog_identity_client_id" {
  description = "Client ID of the Catalog managed identity"
  value       = azurerm_user_assigned_identity.catalog.client_id
}

output "catalog_identity_principal_id" {
  description = "Principal ID of the Catalog managed identity"
  value       = azurerm_user_assigned_identity.catalog.principal_id
}
