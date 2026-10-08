"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Preenche latitude/longitude das lojas (e do endereço de casa) sem coordenadas.
 * Usa GEOCODING_PROVIDER (nominatim = OpenStreetMap gratuito, ~1 consulta/s).
 */
const geocoding_service_1 = require("../modules/geocoding/geocoding.service");
const context_1 = require("./context");
async function main() {
    const { config, db, close } = (0, context_1.createCliContext)();
    try {
        const geocoding = new geocoding_service_1.GeocodingService(config, db);
        const info = geocoding.describe();
        if (!info.configured)
            throw new Error(`Geocodificação não configurada: ${info.description}`);
        console.log(`Geocodificando com: ${info.description}`);
        const homes = await db.homeAddress.findMany({
            where: { active: true, OR: [{ latitude: null }, { longitude: null }] },
        });
        for (const home of homes) {
            const result = await geocoding.geocode({ address: home.address });
            if (result) {
                await db.homeAddress.update({
                    where: { id: home.id },
                    data: { latitude: result.latitude, longitude: result.longitude },
                });
                await db.route.updateMany({
                    where: { employeeId: home.employeeId, startAddress: home.address },
                    data: {
                        startLatitude: result.latitude,
                        startLongitude: result.longitude,
                        legsComputedAt: null,
                    },
                });
            }
            console.log(`${result ? '✔' : '✖'} Casa: ${home.address}`);
        }
        const summary = await geocoding.geocodeMissingStores((line) => console.log(line));
        await db.route.updateMany({ data: { legsComputedAt: null } });
        console.log(`\nLojas atualizadas: ${summary.updated}/${summary.processed}.`);
        if (summary.failed.length)
            console.log(`Sem resultado (corrija o endereço ou informe as coordenadas manualmente):\n - ${summary.failed.join('\n - ')}`);
    }
    finally {
        await close();
    }
}
main().catch((error) => {
    console.error('✖ Geocodificação falhou:', error instanceof Error ? error.message : error);
    process.exit(1);
});
//# sourceMappingURL=geocode-stores.js.map