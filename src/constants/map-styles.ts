/**
 * Google Maps custom style (light + dark) matching the QuickPlate theme:
 * clean surface, POIs/transit hidden, highways tinted with the brand indigo.
 */
type MapStyle = ReadonlyArray<Record<string, unknown>>;

export const MAP_STYLE_LIGHT: MapStyle = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { elementType: 'geometry', stylers: [{ color: '#F5F6F8' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#1F2937' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road.local', elementType: 'geometry', stylers: [{ color: '#F1F1F1' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#EDEDED' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#818CF8' }] },
  { featureType: 'water', stylers: [{ color: '#CFE8FF' }] },
  { featureType: 'landscape.natural', stylers: [{ color: '#EEF2F5' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
];

export const MAP_STYLE_DARK: MapStyle = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { elementType: 'geometry', stylers: [{ color: '#0F0F0F' }] },
  { elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#A3A3A3' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#0F0F0F' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#1C1C1C' }] },
  { featureType: 'road.local', elementType: 'geometry', stylers: [{ color: '#1C1C1C' }] },
  { featureType: 'road.arterial', elementType: 'geometry', stylers: [{ color: '#292929' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#818CF8' }] },
  { featureType: 'water', stylers: [{ color: '#0A0A1A' }] },
  { featureType: 'landscape.natural', stylers: [{ color: '#161616' }] },
  { featureType: 'administrative.land_parcel', stylers: [{ visibility: 'off' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#383838' }] },
];
