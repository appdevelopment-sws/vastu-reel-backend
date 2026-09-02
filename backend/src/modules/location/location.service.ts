import { Injectable, Logger } from '@nestjs/common';
import { ReverseGeocodeResponseDto } from './dto/reverse-geocode.dto';

interface CacheEntry {
  data: ReverseGeocodeResponseDto;
  timestamp: number;
}

@Injectable()
export class LocationService {
  private readonly logger = new Logger(LocationService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours cache

  /**
   * Reverse geocodes latitude & longitude into structured Landmark, City, State, and Pincode.
   */
  async reverseGeocode(
    lat: number,
    lng: number,
  ): Promise<ReverseGeocodeResponseDto> {
    // 1. Check in-memory cache (round to 4 decimal places ~11 meters precision)
    const cacheKey = `${lat.toFixed(4)}_${lng.toFixed(4)}`;
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.data;
    }

    let result: ReverseGeocodeResponseDto | null = null;

    // 2. Primary: OpenStreetMap Nominatim reverse geocoding
    try {
      result = await this.fetchFromNominatim(lat, lng);
    } catch (err) {
      this.logger.warn(`Nominatim reverse geocode failed: ${err.message}`);
    }

    // 3. Fallback: BigDataCloud client reverse geocoding
    if (!result || (!result.city && !result.state)) {
      try {
        result = await this.fetchFromBigDataCloud(lat, lng);
      } catch (err) {
        this.logger.warn(`BigDataCloud reverse geocode failed: ${err.message}`);
      }
    }

    // 4. Default fallback if all sources fail
    if (!result) {
      result = {
        landmark: '',
        city: '',
        state: '',
        pincode: '',
        formattedAddress: `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`,
        latitude: lat,
        longitude: lng,
      };
    }

    // Cache the result
    this.cache.set(cacheKey, {
      data: result,
      timestamp: Date.now(),
    });

    // Keep cache bounded
    if (this.cache.size > 5000) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey) this.cache.delete(oldestKey);
    }

    return result;
  }

  private async fetchFromNominatim(
    lat: number,
    lng: number,
  ): Promise<ReverseGeocodeResponseDto | null> {
    const url = new URL('https://nominatim.openstreetmap.org/reverse');
    url.searchParams.set('format', 'json');
    url.searchParams.set('lat', lat.toString());
    url.searchParams.set('lon', lng.toString());
    url.searchParams.set('zoom', '18');
    url.searchParams.set('addressdetails', '1');

    const res = await fetch(url.toString(), {
      headers: {
        'User-Agent': 'VastuReel-Backend/1.0',
        Accept: 'application/json',
      },
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) {
      return null;
    }

    const data: any = await res.json();
    if (!data || !data.address) {
      return null;
    }

    const addr = data.address;
    const city = (
      addr.city ||
      addr.town ||
      addr.city_district ||
      addr.county ||
      addr.municipality ||
      addr.village ||
      ''
    ).trim();

    const state = (
      addr.state ||
      addr.state_district ||
      addr.region ||
      addr.province ||
      ''
    ).trim();

    const pincode = (addr.postcode || '').trim();

    const areaParts: string[] = [];
    if (addr.suburb) areaParts.push(addr.suburb.trim());
    if (addr.neighbourhood && !areaParts.includes(addr.neighbourhood.trim())) {
      areaParts.push(addr.neighbourhood.trim());
    }
    if (addr.residential && !areaParts.includes(addr.residential.trim())) {
      areaParts.push(addr.residential.trim());
    }
    if (addr.road && !areaParts.includes(addr.road.trim())) {
      areaParts.push(addr.road.trim());
    }

    const landmark = areaParts.join(', ');
    const formattedParts = [landmark, city, state, pincode].filter((p) => !!p);

    return {
      landmark,
      city,
      state,
      pincode,
      formattedAddress:
        data.display_name || formattedParts.join(', ') || 'Tagged Location',
      latitude: lat,
      longitude: lng,
    };
  }

  private async fetchFromBigDataCloud(
    lat: number,
    lng: number,
  ): Promise<ReverseGeocodeResponseDto | null> {
    const url = new URL(
      'https://api.bigdatacloud.net/data/reverse-geocode-client',
    );
    url.searchParams.set('latitude', lat.toString());
    url.searchParams.set('longitude', lng.toString());
    url.searchParams.set('localityLanguage', 'en');

    const res = await fetch(url.toString(), {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) {
      return null;
    }

    const data: any = await res.json();
    if (!data) return null;

    const city = (data.city || data.locality || '').trim();
    const state = (data.principalSubdivision || '').trim();
    const pincode = (data.postcode || '').trim();

    let landmark = '';
    if (
      data.localityInfo &&
      Array.isArray(data.localityInfo.administrative) &&
      data.localityInfo.administrative.length > 3
    ) {
      landmark = (data.localityInfo.administrative[3].name || '').trim();
    }

    const formattedParts = [landmark, city, state, pincode].filter((p) => !!p);

    return {
      landmark,
      city,
      state,
      pincode,
      formattedAddress: formattedParts.join(', ') || 'Tagged Location',
      latitude: lat,
      longitude: lng,
    };
  }
}
