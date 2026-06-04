import { StyleSheet, Text, View } from 'react-native';
import { Marker } from 'react-native-maps';

import type { PlateCluster } from '@/lib/cluster';

/** Marcador de grupo: círculo índigo con el número de placas en ese punto. */
export function ClusterMarker({ cluster, onPress }: { cluster: PlateCluster; onPress?: () => void }) {
  return (
    <Marker
      coordinate={{ latitude: cluster.lat, longitude: cluster.lng }}
      onPress={onPress}
      tracksViewChanges={false}
      anchor={{ x: 0.5, y: 0.5 }}
      zIndex={10}
    >
      <View style={styles.cluster}>
        <Text style={styles.count}>{cluster.plates.length}</Text>
      </View>
    </Marker>
  );
}

const styles = StyleSheet.create({
  cluster: {
    minWidth: 46,
    height: 46,
    paddingHorizontal: 8,
    borderRadius: 23,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  count: { color: '#FFFFFF', fontSize: 18, fontWeight: '900' },
});
