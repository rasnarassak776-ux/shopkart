
# --------------------------------------------------
# 1. AKS Virtual Network
# --------------------------------------------------

resource "azurerm_virtual_network" "aks_vnet" {
  name                = var.vnet_name
  location            = var.location
  resource_group_name = var.resource_group_name
  address_space       = var.vnet_address_space

  tags = var.tags
}

# --------------------------------------------------
# 2. AKS Subnet
# --------------------------------------------------

resource "azurerm_subnet" "aks_subnet" {
  name                 = var.subnet_name
  resource_group_name  = var.resource_group_name
  virtual_network_name = azurerm_virtual_network.aks_vnet.name
  address_prefixes     = var.subnet_address_prefixes
}

# --------------------------------------------------
# 3. AKS Control Plane Managed Identity
# --------------------------------------------------

resource "azurerm_user_assigned_identity" "aks_identity" {
  name                = var.aks_identity_name
  location            = var.location
  resource_group_name = var.resource_group_name

  tags = var.tags
}

# --------------------------------------------------
# 4. Network Contributor Role Assignment
# --------------------------------------------------

resource "azurerm_role_assignment" "aks_subnet_network_contributor" {
  scope                = azurerm_subnet.aks_subnet.id
  role_definition_name = "Network Contributor"
  principal_id         = azurerm_user_assigned_identity.aks_identity.principal_id
  principal_type       = "ServicePrincipal"

  skip_service_principal_aad_check = true
}

# --------------------------------------------------
# 5. AKS Kubernetes Cluster
# --------------------------------------------------

resource "azurerm_kubernetes_cluster" "aks" {
  name                = var.aks_cluster_name
  location            = var.location
  resource_group_name = var.resource_group_name
  dns_prefix          = var.aks_dns_prefix

  role_based_access_control_enabled = true

  # Enable OIDC issuer and Microsoft Entra Workload Identity
  oidc_issuer_enabled       = true
  workload_identity_enabled = true

  default_node_pool {
    name                 = "systempool"
    type                 = "VirtualMachineScaleSets"
    node_count           = var.node_count
    vm_size              = var.vm_size
    vnet_subnet_id       = azurerm_subnet.aks_subnet.id
    auto_scaling_enabled = true
    min_count            = var.min_count
    max_count            = var.max_count
  }

  identity {
    type = "UserAssigned"
    identity_ids = [
      azurerm_user_assigned_identity.aks_identity.id
    ]
  }

  network_profile {
    network_plugin      = "azure"
    network_plugin_mode = "overlay"
    pod_cidr            = var.pod_cidr
    service_cidr        = var.service_cidr
    dns_service_ip      = var.dns_service_ip
    load_balancer_sku   = "standard"
    outbound_type       = "loadBalancer"
  }

  tags = var.tags

  lifecycle {
    ignore_changes = [
      default_node_pool[0].node_count
    ]
  }

  depends_on = [
    azurerm_role_assignment.aks_subnet_network_contributor
  ]
}

# --------------------------------------------------
# 6. ACR Pull Role Assignment
# --------------------------------------------------

# Allows AKS nodes (kubelet identity) to pull images from the
# Foundation module's Azure Container Registry.
resource "azurerm_role_assignment" "aks_acr_pull" {
  scope                = var.acr_id
  role_definition_name = "AcrPull"
  principal_id         = azurerm_kubernetes_cluster.aks.kubelet_identity[0].object_id
  principal_type       = "ServicePrincipal"

  skip_service_principal_aad_check = true
}
