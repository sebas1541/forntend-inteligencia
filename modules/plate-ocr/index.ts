import PlateOcr from './src/PlateOcrModule';

/**
 * OCR on-device. iOS usa Apple Vision; Android usa ML Kit. Recibe una imagen en
 * base64 (JPEG/PNG, con o sin prefijo data URL) y devuelve las líneas de texto
 * reconocidas (cada bloque/línea como un string).
 */
export function recognizeText(imageBase64: string): Promise<string[]> {
  return PlateOcr.recognizeText(imageBase64);
}
