/*
 * Getting a delivery pin out of the browser.
 *
 * No API key and no map library: the browser already knows where the phone is,
 * and a coordinate pair is the whole of what a rider needs. Turning that into
 * a street name would need a paid geocoder, so we don't pretend to — the
 * customer's own words stay the human-readable half.
 */

export interface Pin {
  latitude: number;
  longitude: number;
  /// Radius in metres the browser believes the true position lies within.
  accuracyMeters: number;
  at: number;
}

export type GeoFailure =
  | 'unsupported'
  | 'insecure'
  | 'denied'
  | 'unavailable'
  | 'timeout';

export class GeoError extends Error {
  readonly reason: GeoFailure;

  constructor(reason: GeoFailure, message: string) {
    super(message);
    this.name = 'GeoError';
    this.reason = reason;
  }
}

/// Geolocation is refused outright on an insecure origin, so this is worth
/// knowing before a button is offered. `localhost` counts as secure, which is
/// why development works and a plain-http deployment would not.
export function canLocate(): boolean {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
    return false;
  }
  return window.isSecureContext;
}

const MESSAGES: Record<GeoFailure, string> = {
  unsupported: 'This browser cannot share a location. Type the address instead.',
  insecure:
    'Location sharing needs a secure (https) connection. Type the address instead.',
  denied:
    'Location permission was blocked. Allow it in your browser settings, or type the address instead.',
  unavailable:
    'Your device could not get a fix. Move near a window or outside, or type the address instead.',
  timeout: 'That took too long. Try again, or type the address instead.',
};

export function geoMessage(reason: GeoFailure): string {
  return MESSAGES[reason];
}

/// One fix, with a generous timeout: a cold GPS on a phone indoors genuinely
/// takes ten seconds or more, and failing early would just push people to type
/// an address they were happy to share.
export function getPin(timeoutMs = 20_000): Promise<Pin> {
  if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
    return Promise.reject(new GeoError('unsupported', MESSAGES.unsupported));
  }
  if (!window.isSecureContext) {
    return Promise.reject(new GeoError('insecure', MESSAGES.insecure));
  }

  return new Promise<Pin>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) =>
        resolve({
          latitude: round(position.coords.latitude),
          longitude: round(position.coords.longitude),
          accuracyMeters: Math.round(position.coords.accuracy),
          at: position.timestamp,
        }),
      (error) => {
        const reason: GeoFailure =
          error.code === error.PERMISSION_DENIED
            ? 'denied'
            : error.code === error.TIMEOUT
              ? 'timeout'
              : 'unavailable';
        reject(new GeoError(reason, MESSAGES[reason]));
      },
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 0 },
    );
  });
}

/// Seven decimal places is about a centimetre. Anything beyond that is noise
/// the GPS never had, and it matches the column the API stores it in.
function round(value: number): number {
  return Number(value.toFixed(7));
}

/// Turn-by-turn straight to the pin. A plain maps URL needs no API key and
/// opens the Maps app on both Android and iOS.
export function directionsUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
}

/// How much to trust a pin, in words a person can act on.
export function accuracyNote(metres: number): string {
  if (metres <= 25) return 'Pinpoint accurate';
  if (metres <= 100) return `Accurate to about ${Math.round(metres)}m`;
  if (metres <= 500) return `Rough — within about ${Math.round(metres)}m`;
  return 'Very rough — add a landmark below so the rider can find you';
}
