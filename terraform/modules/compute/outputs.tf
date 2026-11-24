
# --------------------------------------------------
# Virtual Network Outputs
# --------------------------------------------------

output "vnet_id" {
  description = "Virtual network ID"
  value       = azurerm_virtual_network.aks_vnet.id
}

output "vnet_name" {
  description = "Virtual network name"
  value       = azurerm_virtual_network.aks_vnet.name
}

# --------------------------------------------------
# AKS Subnet Output
# --------------------------------------------------

output "subnet_id" {
  description = "AKS subnet ID"
  value       = azurerm_subnet.aks_subnet.id
}

# --------------------------------------------------
# AKS Cluster Outputs
# --------------------------------------------------

output "aks_cluster_id" {
  description = "Resource ID of the AKS cluster"
  value       = azurerm_kubernetes_cluster.aks.id
}

output "aks_cluster_name" {
  description = "Name of the AKS cluster"
  value       = azurerm_kubernetes_cluster.aks.name
}

# --------------------------------------------------
# AKS Control Plane Identity Outputs
# --------------------------------------------------

output "aks_identity_id" {
  description = "Resource ID of the AKS control-plane managed identity"
  value       = azurerm_user_assigned_identity.aks_identity.id
}

output "aks_identity_principal_id" {
  description = "Principal ID of the AKS control-plane managed identity"
  value       = azurerm_user_assigned_identity.aks_identity.principal_id
}
