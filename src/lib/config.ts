import Constants from 'expo-constants';

/**
 * Base URL del API QuickPlate.
 *
 * En desarrollo apunta automáticamente a la máquina que corre Metro (misma IP
 * de la LAN) en el puerto 8000, así el teléfono físico lo alcanza sin tocar
 * nada. En producción, reemplazar por la URL pública.
 */
const metroHost = Constants.expoConfig?.hostUri?.split(':')[0];

export const API_BASE_URL = metroHost
  ? `http://${metroHost}:8000`
  : 'http://localhost:8000';
