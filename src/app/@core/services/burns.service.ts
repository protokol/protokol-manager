import { Injectable } from '@angular/core';
import { defer, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Logger } from '@core/services/logger.service';
import { BaseResourcesTypes } from '@protokol/client';
import { Pagination, TableApiQuery } from '@app/@shared/interfaces/table.types';
import { ConnectionOptions } from '@core/interfaces/node.types';
import { NodeClientService } from '@core/services/node-client.service';
import { Store } from '@ngxs/store';
import { NetworksState } from '@core/store/network/networks.state';

@Injectable()
export class BurnsService {
  readonly log = new Logger(this.constructor.name);

  constructor(private store: Store) {}

  getBurns(
    query: TableApiQuery | {} = {},
    baseUrl: string = this.store.selectSnapshot(NetworksState.getBaseUrl),
    connectionOptions?: ConnectionOptions
  ): Observable<Pagination<BaseResourcesTypes.Burns>> {
    return defer(() =>
      NodeClientService.getNFTConnection(baseUrl, connectionOptions)
        .NFTBaseApi('burns')
        .all({
          ...query,
        })
    ).pipe(
      map((response) => response.body),
      NodeClientService.genericListErrorHandler(this.log)
    );
  }
}
