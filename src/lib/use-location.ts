import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';

import type { Coordinates } from '@/lib/geo';

export type LocationStatus = 'idle' | 'loading' | 'granted' | 'denied' | 'error';

interface UseUserLocationResult {
  coords: Coordinates | null;
  status: LocationStatus;
  error: string | null;
  refresh: () => Promise<void>;
}

/** Requests foreground location and returns the user's current coordinates. */
export function useUserLocation(): UseUserLocationResult {
  const [coords, setCoords] = useState<Coordinates | null>(null);
  const [status, setStatus] = useState<LocationStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const { status: perm } = await Location.requestForegroundPermissionsAsync();
      if (perm !== 'granted') {
        setStatus('denied');
        setError('Permiso de ubicación denegado');
        return;
      }
      // Last-known fix first so the map renders instantly, then refine.
      const last = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60_000 });
      if (last) {
        setCoords({ latitude: last.coords.latitude, longitude: last.coords.longitude });
        setStatus('granted');
      }
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      setStatus('granted');
    } catch (e) {
      setStatus('error');
      setError(e instanceof Error ? e.message : 'Error obteniendo ubicación');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { coords, status, error, refresh };
}

/** One-shot: get current coordinates (or null) to tag a saved plate. */
export async function getCurrentCoords(): Promise<Coordinates | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  } catch {
    return null;
  }
}
