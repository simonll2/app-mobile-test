/**
 * Geocoding utilities - Convert GPS coordinates to real addresses
 * Uses Nominatim (OpenStreetMap) - Free, no API key required
 */

interface NominatimResponse {
  display_name: string;
  address: {
    road?: string;
    house_number?: string;
    suburb?: string;
    neighbourhood?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    country?: string;
    postcode?: string;
  };
}

export interface GeocodingResult {
  fullAddress: string;
  shortAddress: string;
  city: string;
  street: string;
}

// Cache to avoid repeated requests
const geocodeCache = new Map<string, GeocodingResult>();

/**
 * Reverse geocode coordinates to a human-readable address
 *
 * V1 PRIVACY: Cette fonction est neutralisée pour des raisons de protection des données.
 * Elle retourne des valeurs neutres sans effectuer d'appel réseau.
 * Les coordonnées GPS ne sont plus transformées en adresses exploitables.
 */
export async function reverseGeocode(
  _latitude: number,
  _longitude: number,
): Promise<GeocodingResult> {
  // V1 Privacy: Ne pas effectuer de géocodage inverse
  // Retourner des valeurs neutres uniquement
  return {
    fullAddress: 'Position non affichée',
    shortAddress: 'Position non affichée',
    city: '',
    street: '',
  };
}

/**
 * Format coordinates as fallback display
 */
export function formatCoordinates(lat: number, lon: number): string {
  return `${lat.toFixed(4)}°, ${lon.toFixed(4)}°`;
}

/**
 * Clear geocoding cache
 */
export function clearGeocodeCache(): void {
  geocodeCache.clear();
}
