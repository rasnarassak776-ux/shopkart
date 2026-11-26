terraform {
  backend "azurerm" {
    resource_group_name  = "shopkart-tf-state-rg"
    storage_account_name = "shopkarttfstate2026"
    container_name       = "tfstate"
    key                  = "shopkart-terraform.tfstate"
    use_azuread_auth     = true
    use_cli              = true
  }
}
