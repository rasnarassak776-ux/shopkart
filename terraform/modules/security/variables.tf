variable "resource_group_name" {
  description = "Name of the Terraform-managed resource group"
  type        = string
}

variable "location" {
  description = "Azure region for the Security resources"
  type        = string
}

variable "key_vault_name" {
  description = "Globally unique name for the Azure Key Vault"
  type        = string

  validation {
    condition     = can(regex("^[a-zA-Z0-9][a-zA-Z0-9-]{1,22}[a-zA-Z0-9]$", var.key_vault_name)) && !strcontains(var.key_vault_name, "--")
    error_message = "Key Vault name must be 3-24 characters, use letters, numbers or hyphens, start and end with a letter or number, and not contain consecutive hyphens."
  }
}

variable "tags" {
  description = "Tags applied to Security resources"
  type        = map(string)
  default     = {}
}

variable "auth_identity_name" {
  description = "Name of the Auth user-assigned managed identity"
  type        = string
}

variable "catalog_identity_name" {
  description = "Name of the Catalog user-assigned managed identity"
  type        = string
}

variable "auth_key_vault_secrets_access" {
  description = "Whether the Auth identity requires Key Vault secret-read access"
  type        = bool
  default     = false
}

variable "catalog_key_vault_secrets_access" {
  description = "Whether the Catalog identity requires Key Vault secret-read access"
  type        = bool
  default     = false
}
