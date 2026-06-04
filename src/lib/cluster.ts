import { haversineKm, type Coordinates } from './geo';
import type { Plate } from './api';

export interface PlateCluster {
  id: string;
  lat: number;
  lng: number;
  plates: Plate[];
}

/**
 * Agrupa placas que están a menos de `thresholdKm` entre sí (mismo punto). Greedy:
 * cada placa cae en el primer cluster cercano, o crea uno nuevo. El centro del
 * cluster es la primera placa.
 */
export function clusterPlates(plates: Plate[], thresholdKm = 0.03): PlateCluster[] {
  const clusters: PlateCluster[] = [];
  for (const p of plates) {
    if (p.lat == null || p.lng == null) continue;
    const point: Coordinates = { latitude: p.lat, longitude: p.lng };
    const existing = clusters.find(
      (c) => haversineKm({ latitude: c.lat, longitude: c.lng }, point) <= thresholdKm,
    );
    if (existing) existing.plates.push(p);
    else clusters.push({ id: `cl-${p.id}`, lat: p.lat, lng: p.lng, plates: [p] });
  }
  return clusters;
}

/**
 * Posición en un anillo alrededor del centro (para el "abanico" / spiderfy).
 * `radiusDeg` ~0.0007 ≈ 75m; se ajusta la longitud por la latitud.
 */
export function ringCoord(
  centerLat: number,
  centerLng: number,
  index: number,
  count: number,
  radiusDeg = 0.0008,
): Coordinates {
  const angle = (2 * Math.PI * index) / count - Math.PI / 2;
  const latitude = centerLat + radiusDeg * Math.sin(angle);
  const longitude = centerLng + (radiusDeg * Math.cos(angle)) / Math.cos((centerLat * Math.PI) / 180);
  return { latitude, longitude };
}
