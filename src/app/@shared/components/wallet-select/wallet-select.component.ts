import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  Input,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { TableUtils } from '@shared/utils/table-utils';
import { BehaviorSubject, combineLatest, OperatorFunction } from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  filter,
  finalize,
  map,
  skip,
  switchMap,
  takeUntil,
  tap,
} from 'rxjs/operators';
import { Store } from '@ngxs/store';
import {
  ControlValueAccessor,
  FormControl,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
} from '@angular/forms';
import { untilDestroyed } from '@core/until-destroyed';
import { Wallet } from '@arkecosystem/client';
import { WalletsService } from '@core/services/wallets.service';
import { SetWalletsByIds } from '@core/store/wallets/wallets.actions';
import { Pagination } from '@shared/interfaces/table.types';
import { NzTableQueryParams } from 'ng-zorro-antd/table';

@Component({
  selector: 'app-wallet-select',
  templateUrl: './wallet-select.component.html',
  styleUrls: ['./wallet-select.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => WalletSelectComponent),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => WalletSelectComponent),
      multi: true,
    },
  ],
})
export class WalletSelectComponent
  implements ControlValueAccessor, OnInit, OnDestroy {
  formControl!: FormControl;
  wallets$ = new BehaviorSubject<Partial<Wallet>[]>([]);
  queryParams$ = new BehaviorSubject<NzTableQueryParams | null>(null);
  isLoading$ = new BehaviorSubject(false);
  isLastPage$ = new BehaviorSubject(false);
  labelProp$ = new BehaviorSubject<keyof Wallet>('address');
  isDisabled$ = new BehaviorSubject(false);
  canAddColdWallet$ = new BehaviorSubject(false);

  @Input() placeholder = 'Select wallet address';

  @Input()
  set canAddColdWallet(canAddColdWallet: boolean) {
    if (canAddColdWallet === true || canAddColdWallet === false) {
      this.canAddColdWallet$.next(canAddColdWallet);
    }
  }

  @Input()
  set isDisabled(isDisabled: boolean) {
    if (isDisabled === true || isDisabled === false) {
      this.isDisabled$.next(isDisabled);
    }
  }

  @Input()
  set labelProp(labelProp: keyof Wallet) {
    this.labelProp$.next(labelProp);
  }

  @Input() filter = (): OperatorFunction<
    Pagination<Wallet>,
    Pagination<Wallet>
  > => {
    return tap();
    // tslint:disable-next-line:semicolon
  };

  @Input()
  set ownerAddress(ownerAddress: string) {
    this.filter = this.filterOutWallet(ownerAddress);
  }

  filterOutWallet = (
    ownerAddress: string
  ): (() => OperatorFunction<Pagination<Wallet>, Pagination<Wallet>>) => {
    return () =>
      map(({ data: originData, meta }) => {
        const data = originData.filter(
          ({ address }) => address !== ownerAddress
        );
        return {
          data,
          meta,
        };
      });
    // tslint:disable-next-line:semicolon
  };

  constructor(private walletsService: WalletsService, private store: Store) {
    this.formControl = new FormControl([]);
    this.formControl.valueChanges
      .pipe(
        tap((formControlValue) => {
          this.onChange(formControlValue);
          this.onTouched();
        }),
        untilDestroyed(this)
      )
      .subscribe();

    this.queryParams$
      .asObservable()
      .pipe(
        filter((queryParams) => !!queryParams),
        map((queryParams) => {
          if (queryParams.filter.length && queryParams.filter[0].value === '') {
            return {
              ...queryParams,
              filter: [],
            };
          }
          return queryParams;
        }),
        distinctUntilChanged(),
        tap(() => this.isLoading$.next(true)),
        debounceTime(1000),
        switchMap((queryParams) => {
          const hasFilters =
            queryParams && queryParams.filter && queryParams.filter.length;

          const loadWallets = hasFilters
            ? this.walletsService.searchWallets(
                TableUtils.toTableApiQuery(queryParams)
              )
            : this.walletsService.getWallets(
                TableUtils.toTableApiQuery(queryParams)
              );

          return loadWallets.pipe(
            this.filter(),
            tap(({ data, meta }) => {
              this.store.dispatch(new SetWalletsByIds(data));

              const wallets = [...this.wallets$.getValue(), ...data];

              const coldWallet: () => Partial<Wallet>[] = () => {
                if (this.canAddColdWallet$.getValue() && hasFilters) {
                  const { value } = queryParams.filter.find(
                    ({ key }) => key === this.labelProp$.getValue()
                  );
                  if (
                    !wallets.some((w) => {
                      const label = w[this.labelProp$.getValue()];
                      return label === value;
                    })
                  ) {
                    return [
                      {
                        [this.labelProp$.getValue()]: value.trim(),
                      },
                    ];
                  }
                }
                return [];
              };

              this.wallets$.next([...wallets, ...coldWallet()]);

              if (!meta.next) {
                this.isLastPage$.next(true);
              }
            }),
            // Cancel previous
            takeUntil(this.queryParams$.asObservable().pipe(skip(1))),
            finalize(() => this.isLoading$.next(false))
          );
        })
      )
      .subscribe();
  }

  ngOnInit() {
    combineLatest([this.canAddColdWallet$.asObservable()])
      .pipe(
        debounceTime(250),
        distinctUntilChanged(),
        tap(() => {
          this.wallets$.next([]);
          this.isLastPage$.next(false);

          this.queryParams$.next({
            ...TableUtils.getDefaultNzTableQueryParams(),
            ...this.queryParams$.getValue(),
            pageIndex: 1,
          });
        }),
        untilDestroyed(this)
      )
      .subscribe();
  }

  next() {
    if (this.isLastPage$.getValue() || this.isLoading$.getValue()) {
      return;
    }

    const prevQueryParams = this.queryParams$.getValue();
    const { pageIndex } = prevQueryParams;
    this.queryParams$.next({
      ...prevQueryParams,
      pageIndex: pageIndex + 1,
    });
  }

  onSearchChanged(event: string) {
    this.wallets$.next([]);
    this.isLastPage$.next(false);

    this.queryParams$.next({
      ...TableUtils.getDefaultNzTableQueryParams(),
      filter: [{ key: this.labelProp$.getValue(), value: event }],
    });
  }

  get value(): Wallet {
    return this.formControl.value;
  }

  set value(value) {
    if (value) {
      this.wallets$.next([...this.wallets$.getValue(), value]);
    }
    this.formControl.setValue(value);
    this.onChange(value);
    this.onTouched();
  }

  onChange: any = () => {};
  onTouched: any = () => {};

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    if (isDisabled) {
      this.formControl.disable();
    } else {
      this.formControl.enable();
    }
  }

  writeValue(value): void {
    if (value) {
      this.value = value;
    }

    if (value === null) {
      this.formControl.reset();
    }
  }

  validate() {
    return this.formControl.valid;
  }

  ngOnDestroy(): void {}
}
