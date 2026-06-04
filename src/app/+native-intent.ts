/**
 * Intercepta deep links del sistema antes de que expo-router los enrute.
 *
 * El redirect de Google OAuth (`...://oauthredirect?code=...`) NO es una pantalla:
 * lo consume expo-auth-session (en el AuthProvider) para completar el login. Si
 * dejáramos que expo-router lo enrutara, mostraría "Unmatched Route". Aquí lo
 * desviamos al home: el intercambio del código ocurre en paralelo en el provider
 * y, al terminar, la app ya queda con sesión iniciada.
 */
export function redirectSystemPath({
  path,
}: {
  path: string;
  initial: boolean;
}): string {
  if (path.includes('oauthredirect') || path.includes('oauth2redirect')) {
    return '/';
  }
  return path;
}
