import Constants from 'expo-constants';

/**
 * Base URL del API QuickPlate.
 *
 * - Si EXPO_PUBLIC_API_URL está definida (ej. la URL de Railway), se usa esa
 *   (para builds desplegados/Release).
 * - Si no, en desarrollo apunta a la máquina que corre Metro (LAN) en :8000,
 *   así el teléfono físico lo alcanza sin tocar nada.
 */
const explicit = process.env.EXPO_PUBLIC_API_URL?.replace(/\/$/, '');
const metroHost = Constants.expoConfig?.hostUri?.split(':')[0];

export const API_BASE_URL =
  explicit || (metroHost ? `http://${metroHost}:8000` : 'http://localhost:8000');
