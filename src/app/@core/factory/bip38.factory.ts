import { Bip38ServiceInterface } from '@core/interfaces/bip38-service.interface';
import { Bip38Service } from '@core/services/bip38.service';
import { ArkCryptoService } from '@core/services/ark-crypto.service';

/**
 * Provide bip38 service as worker, or as main thread blocking service
 * The issue is that hot reload breaks worker service in develop mode
 */
export const bip38Factory = (
  arkCryptoService: ArkCryptoService
): Bip38ServiceInterface => {
  /*if (environment.production) {
    return new Bip38WorkerService();
  }*/
  return new Bip38Service(arkCryptoService);
};
