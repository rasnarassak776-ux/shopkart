/**
 * Canonical Address Snapshot structure used across services,
 * specifically embedded in `orders.orders.address_snapshot` by Member 3.
 */
export interface AddressSnapshot {
  fullName: string;
  phone: string;
  addressLine1: string;
  addressLine2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
}
