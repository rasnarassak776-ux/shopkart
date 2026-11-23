output "resource_group_name" {
  description = "Name of the new Azure resource group"
  value       = azurerm_resource_group.foundation.name
}

output "resource_group_id" {
  description = "ID of the new Azure resource group"
  value       = azurerm_resource_group.foundation.id
}

output "acr_id" {
  description = "ID of the new Azure Container Registry"
  value       = azurerm_container_registry.foundation.id
}

output "acr_login_server" {
  description = "Login server of the new Azure Container Registry"
  value       = azurerm_container_registry.foundation.login_server
}