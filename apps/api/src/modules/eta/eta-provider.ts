import { GeoPoint } from '@mcg-convoy/shared';
import { haversineMeters } from '../locations/location-validation';

export interface EtaRequest {
  origin: GeoPoint;
  destination: GeoPoint;
  /** Optional — never used for scoring. */
  departedAt?: Date;
}

export interface EtaResult {
  provider: string;
  etaAt: Date | null;
  durationSec: number | null;
  distanceM: number;
  confidence: 'high' | 'medium' | 'low' | 'unavailable';
  stale: boolean;
}

export interface EtaProvider {
  readonly name: string;
  calculate(req: EtaRequest): Promise<EtaResult>;
}

/** Straight-line fallback using average urban speed ~35 km/h. */
export class HaversineEtaProvider implements EtaProvider {
  readonly name = 'haversine';

  async calculate(req: EtaRequest): Promise<EtaResult> {
    const distanceM = haversineMeters(req.origin, req.destination);
    if (distanceM < 20) {
      return {
        provider: this.name,
        etaAt: new Date(),
        durationSec: 0,
        distanceM,
        confidence: 'high',
        stale: false,
      };
    }
    const avgMps = 35_000 / 3600;
    const durationSec = Math.round(distanceM / avgMps);
    return {
      provider: this.name,
      etaAt: new Date(Date.now() + durationSec * 1000),
      durationSec,
      distanceM,
      confidence: 'low',
      stale: false,
    };
  }
}

/** OSRM stub — calls public demo or falls back to Haversine. */
export class OsrmEtaProvider implements EtaProvider {
  readonly name = 'osrm';
  private fallback = new HaversineEtaProvider();

  constructor(private readonly baseUrl = 'https://router.project-osrm.org') {}

  async calculate(req: EtaRequest): Promise<EtaResult> {
    const url =
      `${this.baseUrl}/route/v1/driving/` +
      `${req.origin.lng},${req.origin.lat};${req.destination.lng},${req.destination.lat}` +
      `?overview=false`;
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(3000),
      });
      if (!res.ok) return this.fallback.calculate(req);
      const data = (await res.json()) as {
        code?: string;
        routes?: { duration: number; distance: number }[];
      };
      const route = data.routes?.[0];
      if (!route) return this.fallback.calculate(req);
      const durationSec = Math.round(route.duration);
      return {
        provider: this.name,
        etaAt: new Date(Date.now() + durationSec * 1000),
        durationSec,
        distanceM: route.distance,
        confidence: 'medium',
        stale: false,
      };
    } catch {
      return this.fallback.calculate(req);
    }
  }
}

export function createEtaProvider(
  name: string,
  osrmBaseUrl?: string,
): EtaProvider {
  if (name === 'osrm') return new OsrmEtaProvider(osrmBaseUrl);
  return new HaversineEtaProvider();
}
