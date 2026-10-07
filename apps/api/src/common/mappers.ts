import {
  formatStoreAddress,
  fullAddressForMaps,
  googleMapsSearchUrl,
  type StoreAuthorizationInfo,
  type StoreDto,
  type StoreRef,
} from '@routeflow/types';
import { isoInstant } from './serialize';

export interface StoreRow {
  id: string;
  code: string;
  name: string;
  network: string;
  address: string;
  neighborhood: string | null;
  city: string;
  state: string;
  zipCode: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  geocodeSource: string | null;
  observations: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export function toStoreRef(
  store: Omit<
    StoreRow,
    'createdAt' | 'updatedAt' | 'observations' | 'active' | 'geocodeSource' | 'zipCode'
  >,
): StoreRef {
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
    fullAddress: formatStoreAddress(store),
    mapsUrl: googleMapsSearchUrl(fullAddressForMaps(store)),
  };
}

export function toStoreDto(
  store: StoreRow,
  authorization: StoreAuthorizationInfo | null,
): StoreDto {
  return {
    ...toStoreRef(store),
    zipCode: store.zipCode,
    observations: store.observations,
    active: store.active,
    geocodeSource: store.geocodeSource,
    createdAt: isoInstant(store.createdAt),
    updatedAt: isoInstant(store.updatedAt),
    authorization,
  };
}

export const NO_AUTHORIZATION: StoreAuthorizationInfo = {
  validity: null,
  daysLeft: null,
  hasValid: false,
  letterCount: 0,
};
