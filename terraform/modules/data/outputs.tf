
output "postgresql_server_id" {
  description = "PostgreSQL Flexible Server resource ID"
  value       = azurerm_postgresql_flexible_server.shopkart.id
}

output "postgresql_server_name" {
  description = "PostgreSQL Flexible Server name"
  value       = azurerm_postgresql_flexible_server.shopkart.name
}

output "postgresql_server_fqdn" {
  description = "PostgreSQL server fully qualified domain name"
  value       = azurerm_postgresql_flexible_server.shopkart.fqdn
}

output "postgresql_database_name" {
  description = "ShopKart PostgreSQL database name"
  value       = azurerm_postgresql_flexible_server_database.shopkart.name
}

output "storage_account_id" {
  description = "Storage Account resource ID"
  value       = azurerm_storage_account.shopkart.id
}

output "storage_account_name" {
  description = "Storage Account name"
  value       = azurerm_storage_account.shopkart.name
}

output "blob_container_name" {
  description = "Blob Container name"
  value       = azurerm_storage_container.shopkart.name
}

output "blob_container_id" {
  description = "Blob Container resource ID"
  value       = azurerm_storage_container.shopkart.id
}
