
variable "resource_group_name" {
  description = "Name of the resource group created by the Foundation module"
  type        = string
}

variable "location" {
  description = "Azure region for the Compute resources"
  type        = string
}

variable "vnet_name" {
  description = "Name of the AKS virtual network"
  type        = string
}

variable "vnet_address_space" {
  description = "CIDR address space for the virtual network"
  type        = list(string)
}

variable "subnet_name" {
  description = "Name of the AKS subnet"
  type        = string
}

variable "subnet_address_prefixes" {
  description = "CIDR address prefixes for the AKS subnet"
  type        = list(string)
}

variable "pod_cidr" {
  description = "CIDR range for AKS Azure CNI Overlay pods"
  type        = string
}

variable "service_cidr" {
  description = "CIDR range for Kubernetes services"
  type        = string
}

variable "dns_service_ip" {
  description = "Kubernetes DNS service IP within the service CIDR"
  type        = string
}

variable "aks_cluster_name" {
  description = "Name of the AKS cluster"
  type        = string
  default     = "shopkart-aks-terraform"
}

variable "aks_dns_prefix" {
  description = "DNS prefix for the AKS cluster"
  type        = string
  default     = "shopkart-aks-terraform"
}

variable "aks_identity_name" {
  description = "Name of the AKS control-plane managed identity"
  type        = string
  default     = "shopkart-aks-control-plane-identity"
}

variable "node_count" {
  description = "Initial number of AKS nodes"
  type        = number
  default     = 2
}

variable "vm_size" {
  description = "Virtual machine size for AKS nodes"
  type        = string
  default     = "Standard_D2s_v5"
}

variable "min_count" {
  description = "Minimum AKS node count"
  type        = number
  default     = 2
}

variable "max_count" {
  description = "Maximum AKS node count"
  type        = number
  default     = 3
}

variable "acr_id" {
  description = "Resource ID of the Azure Container Registry that AKS pulls images from"
  type        = string
}

variable "tags" {
  description = "Tags applied to Compute resources"
  type        = map(string)
  default     = {}
}
