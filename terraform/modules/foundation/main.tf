resource "azurerm_resource_group" "foundation" {
  name     = var.resource_group_name
  location = var.location
}

resource "azurerm_container_registry" "foundation" {
  name                = var.acr_name
  resource_group_name = azurerm_resource_group.foundation.name
  location            = azurerm_resource_group.foundation.location
  sku                 = "Basic"
  admin_enabled       = false
}