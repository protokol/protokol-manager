import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { Select, Store } from '@ngxs/store';
import { NetworksState } from '@core/store/network/networks.state';
import {
  distinctUntilChanged,
  filter,
  map,
  switchMap,
  tap,
} from 'rxjs/operators';
import { untilDestroyed } from '@core/until-destroyed';
import { BehaviorSubject, Observable, of } from 'rxjs';
import {
  PaginationMeta,
  TableColumnConfig,
} from '@app/@shared/interfaces/table.types';
import { Logger } from '@app/@core/services/logger.service';
import { WalletsState } from '@app/@core/store/wallets/wallets.state';
import { Wallet } from '@arkecosystem/client';
import { LoadWallets } from '@app/@core/store/wallets/wallets.actions';
import { Router } from '@angular/router';
import { NzTableQueryParams } from 'ng-zorro-antd/table';

@Component({
  selector: 'app-wallets',
  templateUrl: './wallets.component.html',
  styleUrls: ['./wallets.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WalletsComponent implements OnInit, OnDestroy {
  readonly log = new Logger(this.constructor.name);

  @Select(WalletsState.getWalletsIds) walletIds$: Observable<string[]>;
  @Select(WalletsState.getMeta) meta$: Observable<PaginationMeta>;

  @ViewChild('addressTpl', { static: true }) addressTpl!: TemplateRef<{
    row: Wallet;
  }>;
  @ViewChild('publicKeyTpl', { static: true }) publicKeyTpl!: TemplateRef<{
    row: Wallet;
  }>;

  isLoading$ = new BehaviorSubject(false);

  rows$: Observable<Wallet[]> = of([]);
  tableColumns: TableColumnConfig<Wallet>[];

  constructor(private store: Store, private router: Router) {}

  ngOnInit() {
    this.tableColumns = [
      {
        propertyName: 'address',
        headerName: 'Address',
        columnTransformTpl: this.addressTpl,
        sortBy: true,
      },
      {
        propertyName: 'balance',
        headerName: 'Balance',
        sortBy: true,
      },
      {
        propertyName: 'nonce',
        headerName: 'Nonce',
        sortBy: true,
      },
      {
        propertyName: 'publicKey',
        headerName: 'Public Key',
        columnTransformTpl: this.publicKeyTpl,
        sortBy: true,
      },
    ];

    this.rows$ = this.walletIds$.pipe(
      distinctUntilChanged(),
      switchMap((walletIds) =>
        this.store.select(WalletsState.getWalletsByIds(walletIds))
      ),
      map((wallets) =>
        wallets.map((w) => {
          const { wallet } = w || {};
          return wallet;
        })
      ),
      tap(() => this.isLoading$.next(false))
    );

    this.store
      .select(NetworksState.getBaseUrl)
      .pipe(
        untilDestroyed(this),
        filter((baseUrl) => !!baseUrl),
        tap(() => this.isLoading$.next(true)),
        tap(() => this.store.dispatch(new LoadWallets()))
      )
      .subscribe();
  }

  ngOnDestroy() {}

  paginationChange(params: NzTableQueryParams) {
    this.store.dispatch(new LoadWallets(params));
  }

  onWalletDetailsClick(addressOrPublicKey: string) {
    this.router.navigate(['/dashboard/wallets', addressOrPublicKey]);
  }
}
