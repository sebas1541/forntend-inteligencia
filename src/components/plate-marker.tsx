import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';

import { VehicleArt } from '@/components/vehicle-art';
import type { Plate } from '@/lib/api';
import type { Coordinates } from '@/lib/geo';

/**
 * Map pin for a saved plate: vehicle icon in a white disc + native callout.
 * `coordinate` permite ubicarlo fuera de su lat/lng real (para el spiderfy).
 */
export function PlateMarker({
  plate,
  coordinate,
  onPress,
}: {
  plate: Plate;
  coordinate?: Coordinates;
  onPress?: () => void;
}) {
  const coord =
    coordinate ??
    (plate.lat != null && plate.lng != null
      ? { latitude: plate.lat, longitude: plate.lng }
      : null);
  if (!coord) return null;
  return (
    <Marker
      coordinate={coord}
      title={plate.plate}
      description={plate.plate_type}
      onPress={onPress}
      tracksViewChanges={false}
      anchor={{ x: 0.5, y: 0.5 }}
    >
      <View style={styles.pin}>
        <VehicleArt type={plate.plate_type} size={30} />
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  pin: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#4F46E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
});
