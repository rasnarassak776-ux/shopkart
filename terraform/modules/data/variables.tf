
variable "resource_group_name" {
  description = "Existing Azure Resource Group name"
  type        = string
}

variable "location" {
  description = "Azure region"
  type        = string
}

variable "postgresql_server_name" {
  description = "PostgreSQL Flexible Server name"
  type        = string
}

variable "postgresql_database_name" {
  description = "ShopKart database name"
  type        = string
  default     = "shopkart"
}

variable "postgresql_version" {
  description = "PostgreSQL version"
  type        = string
  default     = "16"
}

variable "postgresql_admin_username" {
  description = "PostgreSQL administrator username"
  type        = string
}

variable "postgresql_admin_password" {
  description = "PostgreSQL administrator password"
  type        = string
  sensitive   = true
}

variable "postgresql_sku_name" {
  description = "PostgreSQL server SKU"
  type        = string
  default     = "B_Standard_B1ms"
}

variable "postgresql_storage_mb" {
  description = "PostgreSQL storage size in MB"
  type        = number
  default     = 32768
}

variable "postgresql_backup_retention_days" {
  description = "PostgreSQL backup retention days"
  type        = number
  default     = 7
}

variable "storage_account_name" {
  description = "Globally unique Azure Storage Account name"
  type        = string

  validation {
    condition     = can(regex("^[a-z0-9]{3,24}$", var.storage_account_name))
    error_message = "Storage account name must contain 3-24 lowercase letters or numbers."
  }
}

variable "storage_account_tier" {
  description = "Storage Account performance tier"
  type        = string
  default     = "Standard"
}

variable "storage_replication_type" {
  description = "Storage Account replication type"
  type        = string
  default     = "LRS"
}

variable "blob_container_name" {
  description = "Azure Blob Container name"
  type        = string
  default     = "shopkart-data"
}

variable "vnet_id" {
  description = "Resource ID of the AKS virtual network for PostgreSQL private access"
  type        = string
}

variable "vnet_name" {
  description = "Name of the AKS virtual network containing the delegated PostgreSQL subnet"
  type        = string
}

variable "delegated_subnet_address_prefix" {
  description = "Address prefix for the PostgreSQL delegated subnet inside the AKS VNet"
  type        = string
}

variable "tags" {
  description = "Common tags for supported Azure resources"
  type        = map(string)
  default     = {}
}
