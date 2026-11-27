
# ==================================================
# 1. Common Configuration
# ==================================================

variable "resource_group_name" {
  description = "Name of the new Terraform-managed Azure resource group"
  type        = string
}

variable "location" {
  description = "Azure region for the new ShopKart Terraform environment"
  type        = string
}

variable "tags" {
  description = "Common tags for supported Azure resources"
  type        = map(string)
  default     = {}
}

# ==================================================
# 2. Foundation Module
# ==================================================

variable "acr_name" {
  description = "Name of the Azure Container Registry"
  type        = string
}

# ==================================================
# 3. Data Module
# ==================================================

variable "postgresql_server_name" {
  description = "Name of the PostgreSQL Flexible Server"
  type        = string
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

variable "postgresql_database_name" {
  description = "Name of the application database"
  type        = string
  default     = "shopkart"
}

variable "postgresql_version" {
  description = "PostgreSQL server version"
  type        = string
  default     = "16"
}

variable "postgresql_sku_name" {
  description = "PostgreSQL server compute SKU"
  type        = string
  default     = "B_Standard_B1ms"
}

variable "postgresql_storage_mb" {
  description = "PostgreSQL storage capacity in MB"
  type        = number
  default     = 32768
}

variable "postgresql_backup_retention_days" {
  description = "PostgreSQL backup retention period"
  type        = number
  default     = 7
}

variable "storage_account_name" {
  description = "Name of the application Storage Account"
  type        = string
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
  description = "Name of the application Blob Container"
  type        = string
  default     = "shopkart-data"
}

variable "delegated_subnet_address_prefix" {
  description = "Address prefix for the PostgreSQL delegated subnet inside the AKS VNet"
  type        = string
  default     = "10.20.2.0/24"
}

# ==================================================
# 4. Compute Module
# ==================================================

variable "vnet_name" {
  description = "Name of the AKS virtual network"
  type        = string
}

variable "vnet_address_space" {
  description = "Address space of the AKS virtual network"
  type        = list(string)
}

variable "subnet_name" {
  description = "Name of the AKS subnet"
  type        = string
}

variable "subnet_address_prefixes" {
  description = "Address prefixes of the AKS subnet"
  type        = list(string)
}

variable "aks_cluster_name" {
  description = "Name of the AKS cluster"
  type        = string
}

variable "aks_dns_prefix" {
  description = "DNS prefix of the AKS cluster"
  type        = string
}

variable "aks_identity_name" {
  description = "Name of the AKS control-plane managed identity"
  type        = string
}

variable "node_count" {
  description = "Initial AKS system node count"
  type        = number
  default     = 2
}

variable "vm_size" {
  description = "Azure VM size for AKS nodes"
  type        = string
  default     = "Standard_D2s_v5"
}

variable "min_count" {
  description = "Minimum AKS autoscaling node count"
  type        = number
  default     = 2
}

variable "max_count" {
  description = "Maximum AKS autoscaling node count"
  type        = number
  default     = 2
}

variable "pod_cidr" {
  description = "CIDR range for AKS pods"
  type        = string
}

variable "service_cidr" {
  description = "CIDR range for Kubernetes services"
  type        = string
}

variable "dns_service_ip" {
  description = "IP address of the Kubernetes DNS service"
  type        = string
}

# ==================================================
# 5. Security Module
# ==================================================

variable "key_vault_name" {
  description = "Name of the Azure Key Vault"
  type        = string
}

variable "auth_identity_name" {
  description = "Name of the Auth service managed identity"
  type        = string
}

variable "catalog_identity_name" {
  description = "Name of the Catalog service managed identity"
  type        = string
}

variable "auth_key_vault_secrets_access" {
  description = "Enable Key Vault secrets access for Auth service"
  type        = bool
  default     = false
}

variable "catalog_key_vault_secrets_access" {
  description = "Enable Key Vault secrets access for Catalog service"
  type        = bool
  default     = false
}

variable "catalog_blob_storage_access" {
  description = "Enable Blob Data Contributor access for the Catalog managed identity"
  type        = bool
  default     = false
}
