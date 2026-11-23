variable "resource_group_name" {
  description = "Name of the new Terraform-managed Azure resource group"
  type        = string
}

variable "location" {
  description = "Azure region for the new ShopKart Terraform environment"
  type        = string
}