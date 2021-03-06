import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { Actions, ofActionDispatched, Select, Store } from '@ngxs/store';
import { NetworksState } from '@core/store/network/networks.state';
import { distinctUntilChanged, filter, switchMap, takeUntil, tap } from 'rxjs/operators';
import { untilDestroyed } from '@core/until-destroyed';
import { BehaviorSubject, Observable, of } from 'rxjs';
import {
  PaginationMeta,
  TableColumnConfig,
} from '@app/@shared/interfaces/table.types';
import { Logger } from '@app/@core/services/logger.service';
import { BaseResourcesTypes } from '@protokol/client';
import { Router } from '@angular/router';
import { BurnsState } from '@app/dashboard/pages/burns/state/burns/burns.state';
import { LoadBurns } from '@app/dashboard/pages/burns/state/burns/burns.actions';
import { StoreUtilsService } from '@core/store/store-utils.service';
import { NzTableQueryParams } from 'ng-zorro-antd/table';
import { ModalUtils } from '@core/utils/modal-utils';
import { NzModalService } from 'ng-zorro-antd/modal';
import { BurnModalComponent } from '@app/dashboard/pages/burns/components/burn-modal/burn-modal.component';
import { RefreshModalResponse } from '@core/interfaces/refresh-modal.response';
import { TableUtils } from '@shared/utils/table-utils';

@Component({
  selector: 'app-burns',
  templateUrl: './burns.component.html',
  styleUrls: ['./burns.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BurnsComponent implements OnInit, OnDestroy {
  readonly log = new Logger(this.constructor.name);

  private params: NzTableQueryParams = TableUtils.getDefaultNzTableQueryParams();

  @Select(BurnsState.getBurnsIds) burnIds$: Observable<string[]>;
  @Select(BurnsState.getMeta) meta$: Observable<PaginationMeta>;

  @ViewChild('idTpl', { static: true }) idTpl!: TemplateRef<{
    row: BaseResourcesTypes.Burns;
  }>;
  @ViewChild('senderTpl', { static: true }) senderTpl!: TemplateRef<{
    row: BaseResourcesTypes.Burns;
  }>;
  @ViewChild('assetsTpl', { static: true }) assetsTpl!: TemplateRef<{
    row: BaseResourcesTypes.Burns;
  }>;
  @ViewChild('timestampTpl', { static: true }) timestampTpl!: TemplateRef<{
    row: BaseResourcesTypes.Burns;
  }>;

  isLoading$ = new BehaviorSubject(false);

  getBaseUrl$: Observable<string>;
  rows$: Observable<BaseResourcesTypes.Burns[]> = of([]);
  tableColumns: TableColumnConfig<BaseResourcesTypes.Burns>[];

  constructor(
    private store: Store,
    private router: Router,
    private storeUtilsService: StoreUtilsService,
    private nzModalService: NzModalService,
    private actions$: Actions
  ) {
    this.storeUtilsService
      .nftConfigurationGuard()
      .pipe(untilDestroyed(this))
      .subscribe();
  }

  ngOnInit() {
    this.tableColumns = [
      {
        propertyName: 'id',
        headerName: 'Id',
        columnTransformTpl: this.idTpl,
        sortBy: true,
      },
      {
        propertyName: 'senderPublicKey',
        headerName: 'Sender',
        columnTransformTpl: this.senderTpl,
      },
      {
        headerName: 'Asset',
        columnTransformTpl: this.assetsTpl,
      },
      {
        propertyName: 'timestamp',
        headerName: 'Timestamp',
        columnTransformTpl: this.timestampTpl,
        sortBy: true,
      },
    ];

    this.rows$ = this.burnIds$.pipe(
      distinctUntilChanged(),
      switchMap((burnIds) =>
        this.store.select(BurnsState.getBurnsByIds(burnIds))
      ),
      tap(() => this.isLoading$.next(false))
    );

    this.getBaseUrl$ = this.store.select(NetworksState.getBaseUrl).pipe(
      filter((baseUrl) => !!baseUrl),
      tap(() => this.isLoading$.next(true)),
      tap(() => this.store.dispatch(new LoadBurns()))
    );
  }

  ngOnDestroy() {}

  paginationChange(params: NzTableQueryParams) {
    this.params = params;
    this.store.dispatch(new LoadBurns(params));
  }

  onAssetClick(nftId: string) {
    this.router.navigate(['/dashboard/assets', nftId]);
  }

  onWalletDetailsClick(addressOrPublicKey: string, assetId: string) {
    this.router.navigate(['/dashboard/wallets', addressOrPublicKey], {
      queryParams: {
        assetId,
      },
    });
  }

  showBurnAssetModal(event: MouseEvent) {
    event.preventDefault();

    const burnModalRef = this.nzModalService.create<BurnModalComponent,
      RefreshModalResponse>({
      nzContent: BurnModalComponent,
      ...ModalUtils.getCreateModalDefaultConfig()
    });

    burnModalRef.afterClose
      .pipe(
        takeUntil(this.actions$.pipe(ofActionDispatched(LoadBurns))),
        tap((response) => {
          const refresh = (response && response.refresh) || false;
          if (refresh) {
            this.store.dispatch(
              new LoadBurns({
                ...this.params,
              })
            );
          }
        }),
        untilDestroyed(this)
      )
      .subscribe();
  }
}
