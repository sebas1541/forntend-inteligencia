import { recognizeText } from '../../../modules/plate-ocr';
import type { PlateType } from './decode';

// Placa colombiana = SIEMPRE 6 caracteres:
//   · Carro particular: LLLNNN  (3 letras + 3 números) → ABC123
//   · Moto:             LLLNNL  (3 letras + 2 números + 1 letra) → ABC12D
// El guard solo acepta candidatos de 6 chars que cumplan uno de estos patrones.

// Correcciones típicas de OCR según la posición esperada.
const DIGIT_TO_LETTER: Record<string, string> = {
  '0': 'O', '1': 'I', '2': 'Z', '4': 'A', '5': 'S', '6': 'G', '8': 'B',
};
const LETTER_TO_DIGIT: Record<string, string> = {
  O: '0', Q: '0', D: '0', I: '1', L: '1', Z: '2', A: '4', S: '5', B: '8', G: '6', T: '7',
};

function clean(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** Coacciona un char a letra (corrige dígitos confundidos); null si no se puede. */
function asLetter(c: string): string | null {
  if (c >= 'A' && c <= 'Z') return c;
  return DIGIT_TO_LETTER[c] ?? null;
}
/** Coacciona un char a dígito (corrige letras confundidas); null si no se puede. */
function asDigit(c: string): string | null {
  if (c >= '0' && c <= '9') return c;
  return LETTER_TO_DIGIT[c] ?? null;
}

/**
 * Intenta encajar una ventana de EXACTAMENTE 6 chars en carro (LLLNNN) o moto
 * (LLLNNL), corrigiendo confusiones de OCR por posición. Devuelve la placa +
 * tipo, o null si no cumple ningún patrón válido.
 */
function coerce(w: string): { plate: string; type: PlateType } | null {
  if (w.length !== 6) return null;

  const tryCarro = (): { plate: string; type: PlateType } | null => {
    const a = [asLetter(w[0]), asLetter(w[1]), asLetter(w[2]), asDigit(w[3]), asDigit(w[4]), asDigit(w[5])];
    return a.every(Boolean) ? { plate: a.join(''), type: 'carro' } : null;
  };
  const tryMoto = (): { plate: string; type: PlateType } | null => {
    const a = [asLetter(w[0]), asLetter(w[1]), asLetter(w[2]), asDigit(w[3]), asDigit(w[4]), asLetter(w[5])];
    return a.every(Boolean) ? { plate: a.join(''), type: 'moto' } : null;
  };

  // Decidir por el último char natural: letra → moto, dígito → carro.
  const last = w[5];
  if (last >= 'A' && last <= 'Z') return tryMoto() ?? tryCarro();
  return tryCarro() ?? tryMoto();
}

/**
 * Clasifica las líneas OCR. GUARD: solo devuelve placa si alguna ventana de 6
 * chars cumple el formato (carro/moto). Si no, plate = null (no se muestra).
 */
export function classifyPlateText(lines: string[]): { plate: string | null; type: PlateType } {
  const joined = clean(lines.join('')); // moto va en 2 líneas → unir
  const candidates = [joined, ...lines.map(clean)].filter(Boolean);

  for (const c of candidates) {
    for (let i = 0; i + 6 <= c.length; i++) {
      const res = coerce(c.slice(i, i + 6));
      if (res) return res;
    }
  }
  return { plate: null, type: 'desconocido' };
}

/** OCR on-device del recorte (base64) + clasificación con guard de 6 chars. */
export async function readPlate(imageBase64: string): Promise<{ plate: string | null; type: PlateType }> {
  const lines = await recognizeText(imageBase64);
  return classifyPlateText(lines);
}
