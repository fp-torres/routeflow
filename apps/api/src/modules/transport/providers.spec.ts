import { compactGoogleSteps, estimateTransit, vehicleToStepMode } from './providers';

describe('transporte público', () => {
  it('converte as etapas da Google Routes API juntando caminhadas', () => {
    // Formato de routes.legs.steps da Routes API (TRANSIT)
    const steps = compactGoogleSteps([
      { travelMode: 'WALK', distanceMeters: 120, staticDuration: '95s' },
      { travelMode: 'WALK', distanceMeters: 230, staticDuration: '190s' },
      {
        travelMode: 'TRANSIT',
        distanceMeters: 5400,
        staticDuration: '1320s',
        transitDetails: {
          headsign: 'Copacabana',
          stopCount: 14,
          stopDetails: {
            departureStop: { name: 'Rua do Bispo' },
            arrivalStop: { name: 'Av. N. S. de Copacabana' },
          },
          transitLine: { nameShort: '422', vehicle: { type: 'BUS' } },
        },
      },
      {
        travelMode: 'TRANSIT',
        staticDuration: '480s',
        transitDetails: { transitLine: { name: 'Linha 1', vehicle: { type: 'SUBWAY' } } },
      },
      { travelMode: 'WALK', distanceMeters: 300, staticDuration: '240s' },
    ]);
    expect(steps.map((s) => s.mode)).toEqual(['WALK', 'BUS', 'METRO', 'WALK']);
    expect(steps[0]).toMatchObject({ durationSeconds: 285, distanceMeters: 350 });
    expect(steps[1]).toMatchObject({
      line: '422',
      headsign: 'Copacabana',
      from: 'Rua do Bispo',
      stopCount: 14,
    });
    expect(steps[2]).toMatchObject({ line: 'Linha 1', durationSeconds: 480 });
  });

  it('classifica os veículos do Rio (ônibus, metrô, trem, VLT, barca)', () => {
    expect(vehicleToStepMode('BUS')).toBe('BUS');
    expect(vehicleToStepMode('SUBWAY')).toBe('METRO');
    expect(vehicleToStepMode('COMMUTER_TRAIN')).toBe('TRAIN');
    expect(vehicleToStepMode('LIGHT_RAIL')).toBe('TRAM');
    expect(vehicleToStepMode('FERRY')).toBe('FERRY');
    expect(vehicleToStepMode(undefined)).toBe('BUS');
  });

  it('estima a pé trechos curtos e transporte público nos longos', () => {
    const copa1 = { latitude: -22.9711, longitude: -43.1863 };
    const copa2 = { latitude: -22.9735, longitude: -43.1891 };
    const home = { latitude: -22.9235, longitude: -43.2112 };
    expect(estimateTransit(copa1, copa2).walkOnly).toBe(true);
    const long = estimateTransit(home, copa1);
    expect(long.walkOnly).toBe(false);
    expect(long.seconds).toBeGreaterThan(25 * 60);
    expect(long.seconds).toBeLessThan(60 * 60);
  });
});
