import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';

import { VehicleArt } from '@/components/vehicle-art';
import type { Plate } from '@/lib/api';

/** Map pin for a saved plate: vehicle icon in a white disc + native callout. */
export function PlateMarker({ plate, onPress }: { plate: Plate; onPress?: () => void }) {
  if (plate.lat == null || plate.lng == null) return null;
  return (
    <Marker
      coordinate={{ latitude: plate.lat, longitude: plate.lng }}
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
