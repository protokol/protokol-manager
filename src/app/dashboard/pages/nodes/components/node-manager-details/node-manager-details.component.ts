import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { NodeManagerService } from '@core/services/node-manager.service';
import { untilDestroyed } from '@core/until-destroyed';
import { Select, Store } from '@ngxs/store';
import { NetworksState } from '@core/store/network/networks.state';
import { BehaviorSubject, Observable, of, timer } from 'rxjs';
import {
  InfoBlockchainHeight,
  InfoCoreStatus,
  InfoCoreVersion,
  InfoCurrentDelegate,
  InfoNextForgingSlot,
  LogArchivedItem,
  ProcessListItem,
  ProcessStatus,
} from '@core/interfaces/core-manager.types';
import {
  distinctUntilChanged,
  exhaustMap,
  finalize,
  map,
  switchMap,
  tap,
} from 'rxjs/operators';
import { ManagerProcessesState } from '@app/dashboard/pages/nodes/state/manager-processes/manager-processes.state';
import { LoadManagerProcesses } from '../../state/manager-processes/manager-processes.actions';
import { TextUtils } from '@core/utils/text-utils';
import { NzMessageService, NzModalService } from 'ng-zorro-antd';
import { Logger } from '@core/services/logger.service';
import { JsonViewModalComponent } from '@shared/components/json-view-modal/json-view-modal.component';
import { TextViewModalComponent } from '@app/dashboard/pages/nodes/components/text-view-modal/text-view-modal.component';
import { NzModalRef } from 'ng-zorro-antd/modal/modal-ref';

@Component({
  selector: 'app-node-manager-details',
  templateUrl: './node-manager-details.component.html',
  styleUrls: ['./node-manager-details.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NodeManagerDetailsComponent implements OnInit, OnDestroy {
  readonly log = new Logger(this.constructor.name);

  private updatePluginsRef: NzModalRef = null;

  descriptionColumns = { xxl: 2, xl: 2, lg: 2, md: 2, sm: 1, xs: 1 };

  @Select(NetworksState.getNodeManagerUrl()) nodeManagerUrl$;
  @Select(ManagerProcessesState.getManagerProcessesIds)
  managerProcessesIds$: Observable<
    ReturnType<typeof ManagerProcessesState.getManagerProcessesIds>
  >;

  infoCoreVersion$: Observable<InfoCoreVersion> = of(null);
  infoCoreStatus$: BehaviorSubject<InfoCoreStatus> = new BehaviorSubject(null);
  infoCurrentDelegate$: BehaviorSubject<
    InfoCurrentDelegate
  > = new BehaviorSubject(null);
  infoNextForgingSlot$: BehaviorSubject<
    InfoNextForgingSlot
  > = new BehaviorSubject(null);
  blockchainHeight$: BehaviorSubject<
    InfoBlockchainHeight
  > = new BehaviorSubject(null);
  logArchived$: Observable<LogArchivedItem[]> = of([]);
  processList$: Observable<ProcessListItem[]> = of([]);

  isLastForgedBlockLoading$: BehaviorSubject<boolean> = new BehaviorSubject(
    false
  );
  isConfigurationLoading$ = new BehaviorSubject<boolean>(false);
  isUpdatePluginsLoading$ = new BehaviorSubject<boolean>(false);

  @ViewChild('updatePluginsModalFooter', { static: true })
  updatePluginsModalFooter!: TemplateRef<{
    data: any;
  }>;

  constructor(
    private nodeManagerService: NodeManagerService,
    private store: Store,
    private nzModalService: NzModalService,
    private nzMessageService: NzMessageService
  ) {}

  ngOnInit(): void {
    this.infoCoreVersion$ = this.nodeManagerService
      .infoCoreVersion()
      .pipe(untilDestroyed(this));

    this.logArchived$ = this.nodeManagerService
      .logArchived()
      .pipe(untilDestroyed(this));

    this.processList$ = this.managerProcessesIds$.pipe(
      distinctUntilChanged(),
      switchMap((processIds) =>
        this.store.select(
          ManagerProcessesState.getManagerProcessesByIds(processIds)
        )
      )
    );

    timer(0, 1000)
      .pipe(
        untilDestroyed(this),
        exhaustMap(() =>
          this.nodeManagerService.infoNextForgingSlot().pipe(
            untilDestroyed(this),
            tap((nextSlot) => this.infoNextForgingSlot$.next(nextSlot))
          )
        ),
        exhaustMap(() =>
          this.nodeManagerService.infoCoreStatus().pipe(
            untilDestroyed(this),
            tap((status) => this.infoCoreStatus$.next(status))
          )
        )
      )
      .subscribe();

    timer(0, 3000)
      .pipe(
        untilDestroyed(this),
        exhaustMap(() => this.store.dispatch(new LoadManagerProcesses())),
        exhaustMap(() =>
          this.nodeManagerService.infoNextForgingSlot().pipe(
            untilDestroyed(this),
            tap((nextSlot) => this.infoNextForgingSlot$.next(nextSlot))
          )
        ),
        exhaustMap(() =>
          this.nodeManagerService.infoCurrentDelegate().pipe(
            untilDestroyed(this),
            tap((delegate) => this.infoCurrentDelegate$.next(delegate))
          )
        )
      )
      .subscribe();

    timer(0, 8000)
      .pipe(
        untilDestroyed(this),
        exhaustMap(() =>
          this.nodeManagerService.infoBlockchainHeight().pipe(
            untilDestroyed(this),
            tap((height) => this.blockchainHeight$.next(height))
          )
        )
      )
      .subscribe();
  }

  transformText(status: ProcessStatus) {
    return TextUtils.capitalizeFirst(status);
  }

  viewLastForgedBlock(event: MouseEvent) {
    event.preventDefault();

    this.isLastForgedBlockLoading$.next(true);
    this.nodeManagerService
      .infoLastForgedBlock()
      .pipe(
        untilDestroyed(this),
        tap(
          (block) => {
            this.nzModalService.create({
              nzTitle: 'Last forged block',
              nzContent: JsonViewModalComponent,
              nzComponentParams: {
                inputData: block,
              },
              nzFooter: null,
              nzWidth: '55vw',
            });
          },
          (err) => {
            this.log.error(err);
            this.nzMessageService.error(`Retrieving last forged block failed!`);
          }
        ),
        finalize(() => this.isLastForgedBlockLoading$.next(false))
      )
      .subscribe();
  }

  ngOnDestroy(): void {}

  onGetEnv(event: MouseEvent) {
    event.preventDefault();

    this.isConfigurationLoading$.next(true);

    this.nodeManagerService
      .configurationGetEnv()
      .pipe(
        untilDestroyed(this),
        tap(
          (env) => {
            this.nzModalService.create({
              nzTitle: 'Configuration environment',
              nzContent: TextViewModalComponent,
              nzComponentParams: {
                text: env,
              },
              nzFooter: null,
              nzWidth: '75vw',
            });
          },
          (err) => {
            this.log.error(err);
            this.nzMessageService.error(
              'Retrieving configuration environment failed!'
            );
          }
        ),
        finalize(() => this.isConfigurationLoading$.next(false))
      )
      .subscribe();
  }

  getConfigurationPlugins() {
    this.isConfigurationLoading$.next(true);

    return this.nodeManagerService.configurationGetPlugins().pipe(
      untilDestroyed(this),
      map((env) => JSON.parse(env)),
      finalize(() => this.isConfigurationLoading$.next(false))
    );
  }

  onGetPlugins(event: MouseEvent) {
    event.preventDefault();

    this.getConfigurationPlugins()
      .pipe(
        tap(
          (env) => {
            this.nzModalService.create({
              nzTitle: 'Plugins environment',
              nzContent: JsonViewModalComponent,
              nzComponentParams: {
                inputData: env,
              },
              nzFooter: null,
              nzWidth: '75vw',
            });
          },
          (err) => {
            this.log.error(err);
            this.nzMessageService.error('Retrieving plugins failed!');
          }
        )
      )
      .subscribe();
  }

  onUpdatePlugins(event: MouseEvent) {
    event.preventDefault();

    this.getConfigurationPlugins()
      .pipe(
        tap(
          (env) => {
            this.updatePluginsRef = this.nzModalService.create({
              nzTitle: 'Update plugins',
              nzContent: JsonViewModalComponent,
              nzComponentParams: {
                inputData: env,
                footer: this.updatePluginsModalFooter,
              },
              nzFooter: null,
              nzWidth: '75vw',
            });
          },
          (err) => {
            this.log.error(err);
            this.nzMessageService.error('Retrieving plugins failed!');
          }
        )
      )
      .subscribe();
  }

  onUpdatePluginsSubmit(event: MouseEvent, data: any) {
    event.preventDefault();

    this.isUpdatePluginsLoading$.next(true);

    this.nodeManagerService
      .configurationUpdatePlugins(data)
      .pipe(
        untilDestroyed(this),
        tap(
          (response) => {
            if (!response.hasOwnProperty('error')) {
              this.nzMessageService.success('Configuration updated!');
              this.updatePluginsRef.destroy();
            } else {
              this.nzMessageService.error(
                'Configuration failed, check console!'
              );
              this.log.error(response);
            }
          },
          (err) => {
            this.log.error(err);
            this.nzMessageService.error('Configuration update failed!');
          }
        ),
        finalize(() => this.isUpdatePluginsLoading$.next(false))
      )
      .subscribe();
  }
}
