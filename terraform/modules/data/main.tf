
# PostgreSQL Flexible Server
resource "azurerm_postgresql_flexible_server" "shopkart" {
  name                = var.postgresql_server_name
  resource_group_name = var.resource_group_name
  location            = var.location

  version                = var.postgresql_version
  administrator_login    = var.postgresql_admin_username
  administrator_password = var.postgresql_admin_password

  sku_name   = var.postgresql_sku_name
  storage_mb = var.postgresql_storage_mb

  backup_retention_days        = var.postgresql_backup_retention_days
  geo_redundant_backup_enabled = false

  public_network_access_enabled = true
}

# ShopKart PostgreSQL Database
resource "azurerm_postgresql_flexible_server_database" "shopkart" {
  name      = var.postgresql_database_name
  server_id = azurerm_postgresql_flexible_server.shopkart.id
  charset   = "UTF8"
  collation = "en_US.utf8"
}

# Azure Storage Account
resource "azurerm_storage_account" "shopkart" {
  name                = var.storage_account_name
  resource_group_name = var.resource_group_name
  location            = var.location

  account_tier             = var.storage_account_tier
  account_replication_type = var.storage_replication_type
  account_kind             = "StorageV2"

  min_tls_version                 = "TLS1_2"
  allow_nested_items_to_be_public = false
}

# Azure Blob Container
resource "azurerm_storage_container" "shopkart" {
  name                  = var.blob_container_name
  storage_account_id    = azurerm_storage_account.shopkart.id
  container_access_type = "private"
}
