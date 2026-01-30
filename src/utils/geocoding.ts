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
 */
export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<GeocodingResult> {
  // Create cache key based on coordinates (rounded to 4 decimals ~11m precision)
  const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;

  // Check cache first
  if (geocodeCache.has(cacheKey)) {
    return geocodeCache.get(cacheKey)!;
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
      {
        headers: {
          'User-Agent': 'GreenMobilityPass/1.0',
          'Accept-Language': 'fr',
        },
      },
    );

    if (!response.ok) {
      throw new Error('Geocoding request failed');
    }

    const data: NominatimResponse = await response.json();
    const address = data.address;

    // Extract city
    const city =
      address.city ||
      address.town ||
      address.village ||
      address.municipality ||
      address.county ||
      '';

    // Extract street
    const street = address.road || '';
    const houseNumber = address.house_number || '';
    const neighbourhood = address.neighbourhood || address.suburb || '';

    // Build short address (street + number or neighbourhood)
    let shortAddress = '';
    if (street) {
      shortAddress = houseNumber ? `${houseNumber} ${street}` : street;
    } else if (neighbourhood) {
      shortAddress = neighbourhood;
    } else if (city) {
      shortAddress = city;
    } else {
      // Fallback to coordinates
      shortAddress = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
    }

    // Add city if different and not already included
    if (city && shortAddress !== city && !shortAddress.includes(city)) {
      shortAddress = `${shortAddress}, ${city}`;
    }

    const result: GeocodingResult = {
      fullAddress: data.display_name,
      shortAddress,
      city,
      street,
    };

    // Cache the result
    geocodeCache.set(cacheKey, result);

    return result;
  } catch (error) {
    console.warn('Geocoding failed:', error);
    // Return formatted coordinates as fallback
    return {
      fullAddress: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      shortAddress: `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
      city: '',
      street: '',
    };
  }
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
