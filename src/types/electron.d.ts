import { AuraAPI } from '../../electron/preload';

declare global {
  interface Window {
    auraAPI?: AuraAPI;
  }
}

export {};

