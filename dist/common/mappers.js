"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NO_AUTHORIZATION = void 0;
exports.toStoreRef = toStoreRef;
exports.toStoreDto = toStoreDto;
const types_1 = require("@routeflow/types");
const serialize_1 = require("./serialize");
function toStoreRef(store) {
    return {
        id: store.id,
        code: store.code,
        name: store.name,
        network: store.network,
        address: store.address,
        neighborhood: store.neighborhood,
        city: store.city,
        state: store.state,
        region: store.region,
        latitude: store.latitude,
        longitude: store.longitude,
        fullAddress: (0, types_1.formatStoreAddress)(store),
        mapsUrl: (0, types_1.googleMapsSearchUrl)((0, types_1.fullAddressForMaps)(store)),
    };
}
function toStoreDto(store, authorization) {
    return {
        ...toStoreRef(store),
        zipCode: store.zipCode,
        observations: store.observations,
        active: store.active,
        geocodeSource: store.geocodeSource,
        geocodeStatus: store.geocodeStatus,
        authorizationRequired: store.authorizationRequired,
        createdAt: (0, serialize_1.isoInstant)(store.createdAt),
        updatedAt: (0, serialize_1.isoInstant)(store.updatedAt),
        authorization,
    };
}
exports.NO_AUTHORIZATION = {
    required: true,
    validity: null,
    daysLeft: null,
    hasValid: false,
    letterCount: 0,
};
//# sourceMappingURL=mappers.js.map