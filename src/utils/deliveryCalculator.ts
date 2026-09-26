/**
 * Delivery Charge Calculator for Pharmacy Home Delivery
 *
 * Rules:
 * - Within 3.0 km: ₹0 Free delivery
 * - Above 3.0 km (e.g. 3.1 km to 4.0 km): ₹50 base delivery charge
 * - Above 4.0 km up to 12.0 km: Add ₹10 for every additional 1 km (or part thereof)
 * - Maximum delivery range: 12.0 km (Deliveries beyond 12 km are not serviceable)
 */

export interface DeliveryCalculation {
  distanceKm: number;
  deliveryCharge: number;
  isFree: boolean;
  isOutOfRange: boolean;
  maxDistanceKm: number;
  rateRuleDescription: string;
  distanceBreakdown: string;
}

export const MAX_DELIVERY_DISTANCE_KM = 12.0;
export const FREE_DELIVERY_THRESHOLD_KM = 3.0;
export const BASE_SURCHARGE_KM_THRESHOLD = 4.0;
export const BASE_SURCHARGE_AMOUNT = 50;
export const ADDITIONAL_PER_KM_RATE = 10;

export function calculatePharmacyDeliveryFee(distanceKm: number): DeliveryCalculation {
  const dist = Math.max(0, Math.round(distanceKm * 10) / 10);

  if (dist === 0) {
    return {
      distanceKm: 0,
      deliveryCharge: 0,
      isFree: true,
      isOutOfRange: false,
      maxDistanceKm: MAX_DELIVERY_DISTANCE_KM,
      rateRuleDescription: 'Counter Pickup / In-Store Dispensing',
      distanceBreakdown: 'In-store collection (₹0)',
    };
  }

  // Within 3 km: Free delivery
  if (dist <= FREE_DELIVERY_THRESHOLD_KM) {
    return {
      distanceKm: dist,
      deliveryCharge: 0,
      isFree: true,
      isOutOfRange: false,
      maxDistanceKm: MAX_DELIVERY_DISTANCE_KM,
      rateRuleDescription: 'FREE Home Delivery within 3.0 km',
      distanceBreakdown: `${dist} km is within local 3 km free radius (₹0)`,
    };
  }

  // Beyond maximum 12 km limit
  if (dist > MAX_DELIVERY_DISTANCE_KM) {
    return {
      distanceKm: dist,
      deliveryCharge: 0,
      isFree: false,
      isOutOfRange: true,
      maxDistanceKm: MAX_DELIVERY_DISTANCE_KM,
      rateRuleDescription: 'Exceeds maximum delivery range of 12.0 km',
      distanceBreakdown: `Destination (${dist} km) exceeds store delivery zone (Max 12 km)`,
    };
  }

  // From 3.1 km to 4.0 km: Base fee ₹50
  if (dist <= BASE_SURCHARGE_KM_THRESHOLD) {
    return {
      distanceKm: dist,
      deliveryCharge: BASE_SURCHARGE_AMOUNT,
      isFree: false,
      isOutOfRange: false,
      maxDistanceKm: MAX_DELIVERY_DISTANCE_KM,
      rateRuleDescription: 'Standard Delivery (3.1 to 4.0 km): ₹50 Base Fee',
      distanceBreakdown: `${dist} km: ₹50 base delivery charge`,
    };
  }

  // Beyond 4.0 km up to 12.0 km: ₹50 base + ₹10 for each additional 1 km
  const extraKm = Math.ceil(dist - BASE_SURCHARGE_KM_THRESHOLD);
  const totalCharge = BASE_SURCHARGE_AMOUNT + extraKm * ADDITIONAL_PER_KM_RATE;

  return {
    distanceKm: dist,
    deliveryCharge: totalCharge,
    isFree: false,
    isOutOfRange: false,
    maxDistanceKm: MAX_DELIVERY_DISTANCE_KM,
    rateRuleDescription: `₹50 (up to 4 km) + ₹10/km for ${extraKm} extra km`,
    distanceBreakdown: `${dist} km: ₹50 base + (${extraKm} km × ₹10) = ₹${totalCharge}`,
  };
}
