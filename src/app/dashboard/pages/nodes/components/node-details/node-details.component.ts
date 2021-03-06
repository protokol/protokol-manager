import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { NodeClientService } from '@core/services/node-client.service';
import { BehaviorSubject, Observable, of } from 'rxjs';
import {
  NodeConfiguration,
  NodeCryptoConfiguration,
} from '@arkecosystem/client/dist/resourcesTypes/node';
import { JsonEditorOptions } from 'ang-jsoneditor';
import { NodeManagerService } from '@core/services/node-manager.service';
import { finalize, tap } from 'rxjs/operators';
import { untilDestroyed } from '@core/until-destroyed';
import { NodeManagerSettingsModalComponent } from '@app/dashboard/pages/nodes/components/node-manager-settings-modal/node-manager-settings-modal.component';
import { Actions, ofActionErrored, Store } from '@ngxs/store';
import { AddMyNode } from '@core/store/nodes/nodes.actions';
import { DEFAULT_CORE_MANAGER_PORT } from '@core/constants/node.constants';
import { NodesState } from '@core/store/nodes/nodes.state';
import { MyNodesUpdateModalComponent } from '@app/dashboard/pages/nodes/components/my-nodes-update-modal/my-nodes-update-modal.component';
import { ManagerCurrSet } from '@core/store/manager-authentication/manager-authentication.actions';
import { NetworkUtils } from '@core/utils/network-utils';
import { NzModalService } from 'ng-zorro-antd/modal';
import { NzMessageService } from 'ng-zorro-antd/message';

@Component({
  selector: 'app-node-details',
  templateUrl: './node-details.component.html',
  styleUrls: ['./node-details.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NodeDetailsComponent implements OnInit, OnDestroy {
  readonly configurationEditorOptions: JsonEditorOptions;
  readonly cryptoEditorOptions: JsonEditorOptions;

  isAddedToMyNodes$ = new BehaviorSubject(false);

  nodeConfiguration$: Observable<(NodeConfiguration & any) | null> = of(null);
  nodeCryptoConfiguration$: Observable<NodeCryptoConfiguration | null> = of(
    null
  );
  nodeUrl$ = new BehaviorSubject('');
  isLoadingNodeManager$ = new BehaviorSubject(false);

  descriptionColumns = { xxl: 2, xl: 2, lg: 2, md: 2, sm: 1, xs: 1 };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private nodeClientService: NodeClientService,
    private nodeManagerService: NodeManagerService,
    private nzMessageService: NzMessageService,
    private nzModalService: NzModalService,
    private store: Store,
    private actions$: Actions
  ) {
    this.cryptoEditorOptions = new JsonEditorOptions();
    this.cryptoEditorOptions.mode = 'view';
    this.cryptoEditorOptions.expandAll = true;

    this.configurationEditorOptions = new JsonEditorOptions();
    this.configurationEditorOptions.mode = 'view';
    this.configurationEditorOptions.expandAll = true;
  }

  ngOnInit(): void {
    const nodeUrl: string = this.route.snapshot.paramMap.get('url');
    if (nodeUrl) {
      this.nodeUrl$.next(nodeUrl);
      const myNode = this.store.selectSnapshot(
        NodesState.getNodeByUrl(nodeUrl)
      );
      if (myNode) {
        this.isAddedToMyNodes$.next(!!myNode);
        this.store.dispatch(
          new ManagerCurrSet(myNode.coreManagerAuth, myNode.coreManagerPort)
        );
      }

      this.nodeConfiguration$ = this.nodeClientService.getNodeConfiguration(
        nodeUrl
      );

      this.nodeCryptoConfiguration$ = this.nodeClientService.getNodeCryptoConfiguration(
        nodeUrl
      );
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  ngOnDestroy(): void {}

  private getManagerUrl(): string {
    const nodeUrl = this.nodeUrl$.getValue();
    if (this.isAddedToMyNodes$.getValue()) {
      return this.store.selectSnapshot(NodesState.getNodeManagerUrl(nodeUrl));
    }
    return NetworkUtils.buildNodeManagerUrl(nodeUrl);
  }

  onNodeManagerClick(event: MouseEvent) {
    event.preventDefault();

    if (this.isLoadingNodeManager$.getValue()) {
      return;
    }

    const managerUrl = this.getManagerUrl();

    this.isLoadingNodeManager$.next(true);
    this.nodeManagerService
      .infoCoreVersion(managerUrl)
      .pipe(
        untilDestroyed(this),
        tap(
          () => {
            this.router.navigate(['/dashboard/nodes/manager', managerUrl]);
          },
          () => {
            this.nzMessageService.error('Core manager not available!');

            this.nzModalService.create({
              nzContent: NodeManagerSettingsModalComponent,
              nzComponentParams: {
                managerUrl,
                nodeUrl: this.nodeUrl$.getValue(),
              },
              nzFooter: null
            });
          }
        ),
        finalize(() => this.isLoadingNodeManager$.next(false))
      )
      .subscribe();
  }

  onAddToMyNodesClick(event: MouseEvent) {
    event.preventDefault();

    this.isAddedToMyNodes$.next(true);

    const nodeUrl = this.nodeUrl$.getValue();
    this.store.dispatch(
      new AddMyNode({
        nodeUrl,
        coreManagerPort: DEFAULT_CORE_MANAGER_PORT,
      })
    );

    this.actions$.pipe(
      untilDestroyed(this),
      ofActionErrored(AddMyNode),
      tap(() => this.isAddedToMyNodes$.next(false))
    );
  }

  onUpdateMyNodesClick(event: MouseEvent) {
    event.preventDefault();

    this.nzModalService.create({
      nzContent: MyNodesUpdateModalComponent,
      nzComponentParams: {
        managerUrl: this.nodeUrl$.getValue(),
      },
      nzFooter: null,
    });
  }
}
