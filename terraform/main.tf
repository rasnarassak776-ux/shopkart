
# ==================================================
# 1. Foundation Module - Member 1
# ==================================================

module "foundation" {
  source = "./modules/foundation"

  resource_group_name = var.resource_group_name
  location            = var.location
  acr_name            = var.acr_name
}

# ==================================================
# 2. Data Module - Member 2
# ==================================================

module "data" {
  source = "./modules/data"

  resource_group_name = module.foundation.resource_group_name
  location            = var.location

  postgresql_server_name           = var.postgresql_server_name
  postgresql_admin_username        = var.postgresql_admin_username
  postgresql_admin_password        = var.postgresql_admin_password
  postgresql_database_name         = var.postgresql_database_name
  postgresql_version               = var.postgresql_version
  postgresql_sku_name              = var.postgresql_sku_name
  postgresql_storage_mb            = var.postgresql_storage_mb
  postgresql_backup_retention_days = var.postgresql_backup_retention_days

  storage_account_name     = var.storage_account_name
  storage_account_tier     = var.storage_account_tier
  storage_replication_type = var.storage_replication_type
  blob_container_name      = var.blob_container_name

  vnet_id                         = module.compute.vnet_id
  vnet_name                       = module.compute.vnet_name
  delegated_subnet_address_prefix = var.delegated_subnet_address_prefix
  tags                            = var.tags
}

# ==================================================
# 3. Compute Module - Member 3
# ==================================================

module "compute" {
  source = "./modules/compute"

  resource_group_name = module.foundation.resource_group_name
  location            = var.location

  vnet_name               = var.vnet_name
  vnet_address_space      = var.vnet_address_space
  subnet_name             = var.subnet_name
  subnet_address_prefixes = var.subnet_address_prefixes

  aks_cluster_name  = var.aks_cluster_name
  aks_dns_prefix    = var.aks_dns_prefix
  aks_identity_name = var.aks_identity_name

  node_count = var.node_count
  vm_size    = var.vm_size
  min_count  = var.min_count
  max_count  = var.max_count

  acr_id = module.foundation.acr_id

  pod_cidr       = var.pod_cidr
  service_cidr   = var.service_cidr
  dns_service_ip = var.dns_service_ip

  tags = var.tags
}

# ==================================================
# 4. Security Module - Member 4
# ==================================================

module "security" {
  source = "./modules/security"

  resource_group_name = module.foundation.resource_group_name
  location            = var.location

  key_vault_name        = var.key_vault_name
  auth_identity_name    = var.auth_identity_name
  catalog_identity_name = var.catalog_identity_name

  auth_key_vault_secrets_access    = var.auth_key_vault_secrets_access
  catalog_key_vault_secrets_access = var.catalog_key_vault_secrets_access

  tags = var.tags
}
