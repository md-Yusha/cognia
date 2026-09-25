import { Platform } from 'react-native';
import * as Location from 'expo-location';

export interface LiveLocationResult {
  latitude: number;
  longitude: number;
  city: string;
  address: string;
  suburb?: string;
  state?: string;
}

/**
 * Known Northeast India City coordinates for fallback mapping
 */
export const NER_CITY_COORDINATES: Record<string, [number, number]> = {
  guwahati: [26.1445, 91.7362],
  dispur: [26.1360, 91.7915],
  shillong: [25.5788, 91.8933],
  jorhat: [26.7509, 94.2037],
  dibrugarh: [27.4728, 94.9120],
  tezpur: [26.6528, 92.7926],
  silchar: [24.8333, 92.7789],
  tura: [25.5141, 90.2023],
  nagaon: [26.3466, 92.6841],
  bongaigaon: [26.5024, 90.5577],
  sivasagar: [26.9826, 94.6426],
  itanagar: [27.0844, 93.6053],
  kohima: [25.6751, 94.1086],
  imphal: [24.8170, 93.9368],
  aizawl: [23.7271, 92.7176],
  agartala: [23.8315, 91.2868],
  gangtok: [27.3389, 88.6065],
  diphu: [25.8456, 93.4316],
  golaghat: [26.5186, 93.9686],
  barpeta: [26.3211, 91.0064],
};

/**
 * Reverse geocode via OpenStreetMap Nominatim for detailed neighborhood / street names
 */
async function reverseGeocodeWithNominatim(lat: number, lon: number): Promise<{ city: string; address: string; suburb?: string } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Cognia-Dementia-Care/1.0',
      },
    });
    if (!res.ok) return null;
    const json = await res.json();
    if (!json || !json.address) return null;

    const addr = json.address;
    const city = addr.city || addr.town || addr.municipality || addr.village || addr.county || addr.state_district || 'Guwahati';
    const suburb = addr.suburb || addr.neighbourhood || addr.residential || addr.quarter || addr.subdistrict;
    const road = addr.road || addr.pedestrian || addr.footway;

    const parts = [road, suburb, city].filter(Boolean);
    const address = parts.length > 0 ? parts.join(', ') : (json.display_name?.split(',').slice(0, 3).join(',') || city);

    return { city, address, suburb };
  } catch {
    return null;
  }
}

/**
 * Request permission and obtain current high-precision device GPS location.
 * Reverse-geocodes to get neighborhood, city, and street level details.
 */
export async function getCurrentLiveLocation(): Promise<LiveLocationResult> {
  let lat: number | null = null;
  let lng: number | null = null;

  if (Platform.OS === 'web') {
    // Try browser geolocation first
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000,
          });
        });
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch (webErr: any) {
        // Fallback to Expo Location for web
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          throw new Error('Location permission was denied. Please allow location access in your browser.');
        }
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        lat = loc.coords.latitude;
        lng = loc.coords.longitude;
      }
    } else {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        throw new Error('Location permission was denied.');
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      lat = loc.coords.latitude;
      lng = loc.coords.longitude;
    }
  } else {
    // Native (iOS & Android)
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Location permission was denied. Please enable location permissions in device settings.');
    }

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    lat = loc.coords.latitude;
    lng = loc.coords.longitude;
  }

  if (typeof lat !== 'number' || typeof lng !== 'number') {
    throw new Error('Unable to retrieve GPS coordinates from your device.');
  }

  // Perform reverse geocoding to resolve street & city
  let resolvedCity = '';
  let resolvedAddress = '';
  let resolvedSuburb = '';
  let resolvedState = '';

  // 1. Try Nominatim for detailed regional street/neighborhood name
  const nominatimRes = await reverseGeocodeWithNominatim(lat, lng);
  if (nominatimRes) {
    resolvedCity = nominatimRes.city;
    resolvedAddress = nominatimRes.address;
    resolvedSuburb = nominatimRes.suburb || '';
  }

  // 2. If needed, supplement with Expo Location reverse geocode
  if (!resolvedCity || !resolvedAddress) {
    try {
      const geocoded = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (geocoded && geocoded.length > 0) {
        const item = geocoded[0];
        resolvedCity = resolvedCity || item.city || item.subregion || item.region || 'Guwahati';
        resolvedState = item.region || '';
        const street = item.street || item.name || '';
        const district = item.district || item.subregion || '';
        const parts = [street, district, resolvedCity].filter(Boolean);
        resolvedAddress = resolvedAddress || (parts.length > 0 ? parts.join(', ') : resolvedCity);
      }
    } catch {
      // Ignore geocoding failure if coordinates were obtained
    }
  }

  // Default fallback if geocoders could not determine city name
  if (!resolvedCity) {
    resolvedCity = 'Guwahati';
  }
  if (!resolvedAddress) {
    resolvedAddress = `${resolvedCity} (${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E)`;
  }

  return {
    latitude: lat,
    longitude: lng,
    city: resolvedCity,
    address: resolvedAddress,
    suburb: resolvedSuburb,
    state: resolvedState,
  };
}
