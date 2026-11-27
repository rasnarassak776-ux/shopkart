
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

  auto_grow_enabled = true

  public_network_access_enabled = false
  delegated_subnet_id           = azurerm_subnet.postgres_delegated.id
  private_dns_zone_id           = azurerm_private_dns_zone.postgres.id

  tags = var.tags

  depends_on = [azurerm_private_dns_zone_virtual_network_link.postgres]
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

  tags = var.tags
}

# Azure Blob Container
resource "azurerm_storage_container" "shopkart" {
  name                  = var.blob_container_name
  storage_account_id    = azurerm_storage_account.shopkart.id
  container_access_type = "private"
}

# --------------------------------------------------
# PostgreSQL private networking (VNet integration)
# --------------------------------------------------

# Delegated subnet for PostgreSQL Flexible Server VNet integration.
# The AKS node subnet cannot be delegated to PostgreSQL, so a
# separate subnet is required inside the AKS VNet.
resource "azurerm_subnet" "postgres_delegated" {
  name                 = "postgres-delegated-subnet"
  resource_group_name  = var.resource_group_name
  virtual_network_name = var.vnet_name

  address_prefixes = [var.delegated_subnet_address_prefix]

  delegation {
    name = "postgresql-delegation"

    service_delegation {
      name    = "Microsoft.DBforPostgreSQL/flexibleServers"
      actions = ["Microsoft.Network/virtualNetworks/subnets/join/action"]
    }
  }
}

# Private DNS zone so AKS pods resolve the PostgreSQL FQDN
# to the private VNet-integrated address.
resource "azurerm_private_dns_zone" "postgres" {
  name                = "privatelink.postgres.database.azure.com"
  resource_group_name = var.resource_group_name

  tags = var.tags
}

resource "azurerm_private_dns_zone_virtual_network_link" "postgres" {
  name                  = "postgres-dns-vnet-link"
  resource_group_name   = var.resource_group_name
  private_dns_zone_name = azurerm_private_dns_zone.postgres.name
  virtual_network_id    = var.vnet_id

  registration_enabled = false

  tags = var.tags
}
