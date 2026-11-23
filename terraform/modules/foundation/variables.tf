variable "resource_group_name" {
  description = "Name of the new Terraform-managed resource group"
  type        = string
}

variable "location" {
  description = "Azure region for the foundation resources"
  type        = string
}

variable "acr_name" {
  description = "Globally unique name for the new Azure Container Registry"
  type        = string

  validation {
    condition     = can(regex("^[a-zA-Z0-9]{5,50}$", var.acr_name))
    error_message = "ACR name must contain 5–50 alphanumeric characters."
  }
}