import BottomSheet, {
  BottomSheetFlatList,
  type BottomSheetBackgroundProps,
} from '@gorhom/bottom-sheet';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { useFocusEffect, useRouter } from 'expo-router';
import { Locate, ScanLine } from 'lucide-react-native';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, {
  AnimatedRegion,
  MarkerAnimated,
  PROVIDER_GOOGLE,
  type Region,
} from 'react-native-maps';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ClusterMarker } from '@/components/cluster-marker';
import { GlassCard } from '@/components/glass/glass-card';
import { PlateMarker } from '@/components/plate-marker';
import { ProfileMenu } from '@/components/profile-menu';
import { Button } from '@/components/ui/button';
import { VehicleArt } from '@/components/vehicle-art';
import { MAP_STYLE_DARK, MAP_STYLE_LIGHT } from '@/constants/map-styles';
import { Radius, Spacing } from '@/constants/theme';
import { useIsDarkMode, useThemeColors } from '@/hooks/use-theme-colors';
import { api, type Plate } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { clusterPlates, ringCoord, type PlateCluster } from '@/lib/cluster';
import { haversineKm } from '@/lib/geo';
import { useUserLocation } from '@/lib/use-location';

function SheetBackground({ style }: BottomSheetBackgroundProps) {
  const colors = useThemeColors();
  if (isLiquidGlassAvailable()) {
    return (
      <GlassView
        glassEffectStyle="regular"
        style={[style, styles.sheetGlass]}
      />
    );
  }
  return <View style={[style, styles.sheetSolid, { backgroundColor: colors.card }]} />;
}

export default function MapScreen() {
  const router = useRouter();
  const colors = useThemeColors();
  const isDark = useIsDarkMode();
  const insets = useSafeAreaInsets();
  const { token } = useAuth();
  const { coords, status, refresh } = useUserLocation();

  const mapRef = useRef<MapView>(null);
  const sheetTopY = useSharedValue(0);
  const snapPoints = useMemo(() => ['48%', '100%'], []);

  const [plates, setPlates] = useState<Plate[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  // Al tocar un cluster, el onPress del mapa también dispara: ignorar el colapso
  // durante un instante para que el abanico no se cierre en el mismo toque.
  const suppressCollapseRef = useRef(0);
  // Coordenadas animadas de cada placa del cluster abierto (para el abanico suave).
  const spiderRegionsRef = useRef<Record<string, AnimatedRegion[]>>({});
  const load = useCallback(async () => {
    if (!token) {
      setPlates([]);
      return;
    }
    try {
      setPlates(await api.listPlates(token));
    } catch {
      /* keep last list */
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      setExpandedId(null);
      spiderRegionsRef.current = {};
      void load();
    }, [load]),
  );

  const located = useMemo(
    () => plates.filter((p) => p.lat != null && p.lng != null),
    [plates],
  );

  // Agrupar placas en el mismo punto para no encimar marcadores.
  const clusters = useMemo(() => clusterPlates(located), [located]);

  const sorted = useMemo(() => {
    const withDistance = located.map((p) => ({
      plate: p,
      distance: coords
        ? haversineKm(coords, { latitude: p.lat as number, longitude: p.lng as number })
        : null,
    }));
    return withDistance.sort((a, b) => (a.distance ?? 1e9) - (b.distance ?? 1e9));
  }, [located, coords]);

  const initialRegion: Region | null = coords
    ? { ...coords, latitudeDelta: 0.03, longitudeDelta: 0.03 }
    : null;

  const focusUser = () => {
    if (coords) {
      mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.03, longitudeDelta: 0.03 }, 500);
    } else {
      void refresh();
    }
  };

  // Tocar un grupo: abre el abanico animando cada carro desde el centro hacia su
  // posición en el anillo (suave + escalonado) y centra el mapa para verlo.
  const expandCluster = (cl: PlateCluster) => {
    suppressCollapseRef.current = Date.now();
    const regions = cl.plates.map(
      () =>
        new AnimatedRegion({
          latitude: cl.lat,
          longitude: cl.lng,
          latitudeDelta: 0,
          longitudeDelta: 0,
        }),
    );
    spiderRegionsRef.current[cl.id] = regions;
    setExpandedId(cl.id);
    mapRef.current?.animateToRegion(
      { latitude: cl.lat, longitude: cl.lng, latitudeDelta: 0.006, longitudeDelta: 0.006 },
      350,
    );
    cl.plates.forEach((_, i) => {
      const target = ringCoord(cl.lat, cl.lng, i, cl.plates.length);
      setTimeout(() => {
        regions[i]
          .timing({
            toValue: 0, // requerido por el tipo; AnimatedRegion usa lat/lng
            latitude: target.latitude,
            longitude: target.longitude,
            latitudeDelta: 0,
            longitudeDelta: 0,
            duration: 340,
            useNativeDriver: false,
          })
          .start();
      }, 60 + i * 45);
    });
  };

  const collapseClusters = () => {
    setExpandedId(null);
    spiderRegionsRef.current = {};
  };

  const openPlate = (p: Plate) => {
    router.push({ pathname: '/plate/[id]', params: { id: String(p.id) } });
  };

  return (
    <View style={[styles.fill, { backgroundColor: colors.background }]}>
      {initialRegion ? (
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.fill}
          initialRegion={initialRegion}
          customMapStyle={(isDark ? MAP_STYLE_DARK : MAP_STYLE_LIGHT) as never}
          showsUserLocation
          showsMyLocationButton={false}
          showsCompass={false}
          onPress={() => {
            // Ignorar el colapso si viene del mismo toque que expandió el cluster.
            if (Date.now() - suppressCollapseRef.current < 500) return;
            collapseClusters();
          }}
        >
          {clusters.map((cl) => {
            // Punto único → marcador normal.
            if (cl.plates.length === 1) {
              const p = cl.plates[0];
              return <PlateMarker key={p.id} plate={p} onPress={() => openPlate(p)} />;
            }
            // Grupo cerrado → círculo con el número.
            if (expandedId !== cl.id) {
              return <ClusterMarker key={cl.id} cluster={cl} onPress={() => expandCluster(cl)} />;
            }
            // Grupo abierto → abanico animado: cada placa sale del centro al anillo.
            return cl.plates.map((p, i) => {
              const region = spiderRegionsRef.current[cl.id]?.[i];
              if (!region) return null;
              return (
                <MarkerAnimated
                  key={p.id}
                  coordinate={region as never}
                  onPress={() => openPlate(p)}
                  anchor={{ x: 0.5, y: 0.5 }}
                  tracksViewChanges={false}
                >
                  <View style={styles.spiderPin}>
                    <VehicleArt type={p.plate_type} size={30} />
                  </View>
                </MarkerAnimated>
              );
            });
          })}
        </MapView>
      ) : (
        <View style={[styles.fill, styles.center]}>
          <ActivityIndicator color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
            {status === 'denied' ? 'Permite ubicación para ver el mapa' : 'Buscando tu ubicación…'}
          </Text>
        </View>
      )}

      <SafeAreaView edges={['top']} style={styles.header} pointerEvents="box-none">
        <View style={styles.headerRow}>
          <ProfileMenu />
          <Pressable onPress={() => router.navigate('/scanner')} accessibilityLabel="Nueva placa">
            <GlassCard radius={Radius.pill} interactive style={styles.scanPill}>
              <View style={styles.scanInner}>
                <ScanLine size={18} color={colors.foreground} />
                <Text style={[styles.scanText, { color: colors.foreground }]}>Escanear</Text>
              </View>
            </GlassCard>
          </Pressable>
        </View>
      </SafeAreaView>

      {initialRegion ? <FloatingLocate animatedSheetTop={sheetTopY} onPress={focusUser} /> : null}

      <BottomSheet
        index={0}
        snapPoints={snapPoints}
        topInset={insets.top + 76}
        animatedPosition={sheetTopY}
        enablePanDownToClose={false}
        enableDynamicSizing={false}
        enableOverDrag={false}
        animateOnMount
        handleIndicatorStyle={{ backgroundColor: colors.mutedForeground, width: 44, height: 5, borderRadius: 3 }}
        backgroundComponent={SheetBackground}
      >
        <View style={styles.sheetHeader}>
          <Text style={[styles.sheetTitle, { color: colors.foreground }]}>Tus escaneos</Text>
          {token && located.length > 0 && (
            <Text style={[styles.sheetCount, { color: colors.primary }]}>{located.length}</Text>
          )}
        </View>

        {!token ? (
          <View style={styles.sheetBody}>
            <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>
              Inicia sesión para ver en el mapa dónde escaneaste cada placa.
            </Text>
            <Button
              label="Iniciar sesión"
              onPress={() => router.push('/(auth)/login')}
              style={styles.bodyBtn}
            />
          </View>
        ) : located.length === 0 ? (
          <View style={styles.sheetBody}>
            <Text style={[styles.bodyText, { color: colors.mutedForeground }]}>
              Aún no tienes placas con ubicación. Escanea una o agrégala desde Historial y aparecerá aquí.
            </Text>
          </View>
        ) : (
          <BottomSheetFlatList
            data={sorted}
            keyExtractor={(item) => String(item.plate.id)}
            contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 96 }]}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <PlateRow plate={item.plate} distanceKm={item.distance} onPress={() => openPlate(item.plate)} />
            )}
          />
        )}
      </BottomSheet>
    </View>
  );
}

function PlateRow({
  plate,
  distanceKm,
  onPress,
}: {
  plate: Plate;
  distanceKm: number | null;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="button">
      <GlassCard style={styles.row}>
        <VehicleArt type={plate.plate_type} size={40} />
        <View style={styles.rowBody}>
          <Text style={[styles.rowPlate, { color: colors.foreground }]}>{plate.plate}</Text>
          <Text style={[styles.rowMeta, { color: colors.mutedForeground }]}>{plate.plate_type}</Text>
        </View>
        {distanceKm != null && (
          <Text style={[styles.rowDist, { color: colors.primary }]}>
            {distanceKm < 1 ? `${Math.round(distanceKm * 1000)} m` : `${distanceKm.toFixed(1)} km`}
          </Text>
        )}
      </GlassCard>
    </Pressable>
  );
}

function FloatingLocate({
  animatedSheetTop,
  onPress,
}: {
  animatedSheetTop: ReturnType<typeof useSharedValue<number>>;
  onPress: () => void;
}) {
  const colors = useThemeColors();
  const SIZE = 44;
  const style = useAnimatedStyle(() => ({
    position: 'absolute',
    right: 16,
    top: animatedSheetTop.value - SIZE - 12,
  }));
  return (
    <Animated.View pointerEvents="box-none" style={style}>
      <GlassCard radius={Radius.pill} interactive style={{ width: SIZE, height: SIZE }}>
        <Pressable
          onPress={onPress}
          accessibilityLabel="Centrar en mi ubicación"
          style={styles.center}
        >
          <Locate size={18} color={colors.primary} />
        </Pressable>
      </GlassCard>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: Spacing.three, fontSize: 14 },
  header: { position: 'absolute', top: 0, left: 0, right: 0 },
  headerRow: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  spiderPin: {
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
  scanPill: { height: 44 },
  scanInner: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, gap: 6 },
  scanText: { fontSize: 14, fontWeight: '700' },
  sheetGlass: { borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  sheetSolid: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
  },
  sheetHeader: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.one,
    paddingBottom: Spacing.two,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  sheetTitle: { fontSize: 24, fontWeight: '800', letterSpacing: -0.3 },
  sheetCount: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  sheetBody: { paddingHorizontal: Spacing.four, paddingTop: Spacing.two, gap: Spacing.three },
  bodyText: { fontSize: 15, lineHeight: 21 },
  bodyBtn: { alignSelf: 'flex-start' },
  list: { paddingHorizontal: Spacing.four, paddingBottom: 40, gap: Spacing.three },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.three, padding: Spacing.three },
  rowBody: { flex: 1, gap: 2 },
  rowPlate: { fontSize: 17, fontWeight: '700', letterSpacing: 1 },
  rowMeta: { fontSize: 13, textTransform: 'capitalize' },
  rowDist: { fontSize: 14, fontWeight: '700' },
});
