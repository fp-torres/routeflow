export interface Position {
  latitude: number;
  longitude: number;
  accuracy: number;
}

/**
 * Localização aproximada SOMENTE no momento da ação (início/fim da visita),
 * com permissão do navegador. Não há rastreamento contínuo.
 */
export function currentPosition(timeoutMs = 8000): Promise<Position | null> {
  if (!('geolocation' in navigator)) return Promise.resolve(null);
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (p) =>
        resolve({
          latitude: p.coords.latitude,
          longitude: p.coords.longitude,
          accuracy: p.coords.accuracy,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: timeoutMs, maximumAge: 60_000 },
    );
  });
}
