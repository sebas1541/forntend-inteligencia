import { Image } from 'expo-image';

// Clay-style vehicle icons mapped to plate types.
const IMAGES = {
  particular: require('../../assets/images/vehicles/car.png'),
  carro: require('../../assets/images/vehicles/car.png'),
  moto: require('../../assets/images/vehicles/motorcycle.png'),
  publico: require('../../assets/images/vehicles/van.png'),
};

export function VehicleArt({ type, size = 40 }: { type: string; size?: number }) {
  const source = IMAGES[type as keyof typeof IMAGES] ?? IMAGES.particular;
  return <Image source={source} style={{ width: size, height: size }} contentFit="contain" />;
}
