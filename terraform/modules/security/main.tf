data "azurerm_client_config" "current" {}

resource "azurerm_key_vault" "security" {
  name                = var.key_vault_name
  location            = var.location
  resource_group_name = var.resource_group_name
  tenant_id           = data.azurerm_client_config.current.tenant_id

  sku_name                   = "standard"
  rbac_authorization_enabled = true

  soft_delete_retention_days = 90
  purge_protection_enabled   = true

  tags = var.tags
}

# Auth user-assigned managed identity
resource "azurerm_user_assigned_identity" "auth" {
  name                = var.auth_identity_name
  location            = var.location
  resource_group_name = var.resource_group_name

  tags = var.tags
}

# Catalog user-assigned managed identity
resource "azurerm_user_assigned_identity" "catalog" {
  name                = var.catalog_identity_name
  location            = var.location
  resource_group_name = var.resource_group_name

  tags = var.tags
}

# Auth Key Vault secret access
resource "azurerm_role_assignment" "auth_key_vault_secrets" {
  count = var.auth_key_vault_secrets_access ? 1 : 0

  scope                = azurerm_key_vault.security.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.auth.principal_id
  principal_type       = "ServicePrincipal"
}

# Catalog Key Vault secret access
resource "azurerm_role_assignment" "catalog_key_vault_secrets" {
  count = var.catalog_key_vault_secrets_access ? 1 : 0

  scope                = azurerm_key_vault.security.id
  role_definition_name = "Key Vault Secrets User"
  principal_id         = azurerm_user_assigned_identity.catalog.principal_id
  principal_type       = "ServicePrincipal"
}


