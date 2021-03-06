import {
  ChangeDetectionStrategy, ChangeDetectorRef,
  Component,
  OnDestroy, OnInit,
  TemplateRef,
  ViewChild
} from '@angular/core';
import { FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';
import { JsonEditorOptions } from 'ang-jsoneditor';
import { WidgetConfigService } from '@app/ajsf-widget-library/services/widget-config.service';
import { environment } from '@env/environment';
import { BehaviorSubject } from 'rxjs';
import { FormUtils } from '@core/utils/form-utils';
import { finalize, tap } from 'rxjs/operators';
import { untilDestroyed } from '@core/until-destroyed';
import { CryptoService } from '@core/services/crypto.service';
import { Logger } from '@core/services/logger.service';
import { IpfsUploadFilePinataComponent } from '@shared/components/ipfs-upload-file-pinata/ipfs-upload-file-pinata.component';
import { ModalUtils } from '@core/utils/modal-utils';
import { NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzMessageService } from 'ng-zorro-antd/message';

const { api: { transactionBatchLimit } } = environment;

@Component({
  selector: 'app-asset-create-modal',
  templateUrl: './asset-create-modal.component.html',
  styleUrls: ['./asset-create-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssetCreateModalComponent implements OnInit, OnDestroy {
  log: Logger = new Logger(this.constructor.name);

  readonly editorOptions: JsonEditorOptions;

  collectionForm!: FormGroup;

  framework = WidgetConfigService.getFramework();
  isProduction = environment.production;

  isLoading$ = new BehaviorSubject(false);
  isAssetValid$ = new BehaviorSubject(false);
  isMultipleAssetsEnabled$ = new BehaviorSubject(false);

  asset = {};

  @ViewChild('modalTitleTpl', { static: true })
  modalTitleTpl!: TemplateRef<{}>;

  numOfAssetsFormControl = new FormControl(
    1,
    [
      Validators.min(1),
      Validators.max(transactionBatchLimit)
    ]
  );

  constructor(
    private formBuilder: FormBuilder,
    public modalRef: NzModalRef,
    private cryptoService: CryptoService,
    private notificationService: NzNotificationService,
    private messageService: NzMessageService,
    private modalService: NzModalService,
    private cd: ChangeDetectorRef
  ) {
    this.editorOptions = new JsonEditorOptions();
    this.editorOptions.mode = 'view';
    this.editorOptions.expandAll = true;

    this.isMultipleAssetsEnabled$.asObservable()
      .pipe(
        tap((isMultipleAssetsEnabled) => {
          if (isMultipleAssetsEnabled) {
            this.numOfAssetsFormControl.setValidators(Validators.required);
          } else {
            this.numOfAssetsFormControl.clearValidators();
          }

          this.numOfAssetsFormControl.updateValueAndValidity();
        }),
        untilDestroyed(this)
      )
      .subscribe();

    this.createForm();
  }

  ngOnInit(): void {
    // TODO: ExpressionChangedAfterItHasBeenCheckedError thrown
    setTimeout(() => {
      this.modalRef.updateConfig({
        nzTitle: this.modalTitleTpl,
        nzWidth: '75vw',
      });
      this.cd.markForCheck();
    });
  }

  createForm() {
    this.collectionForm = this.formBuilder.group({
      collection: ['', Validators.required],
    });
  }

  c(controlName: string) {
    return this.collectionForm.controls[controlName];
  }

  get collection$() {
    return this.c('collection').valueChanges;
  }

  onCancel() {
    this.modalRef.destroy();
  }

  createAsset(event: MouseEvent) {
    event.preventDefault();

    if (this.isLoading$.getValue() || !this.isAssetValid$.getValue()) {
      return;
    }

    if (!this.collectionForm.valid) {
      FormUtils.markFormGroupDirty(this.collectionForm);
      return;
    }

    this.isLoading$.next(true);

    const numOfReplications = this.isMultipleAssetsEnabled$.getValue()
      ? this.numOfAssetsFormControl.value
      : 1;

    const {
      collection: { id: collectionId },
    } = this.collectionForm.value;
    this.cryptoService
      .registerAsset({
        collectionId,
        attributes: this.asset,
      }, numOfReplications)
      .pipe(
        tap(
          () => {
            this.messageService.success('Asset transaction(s) broadcast to network!');
            this.modalRef.destroy({ refresh: true });
          },
          (err) => {
            this.notificationService.create(
              'error',
              'Asset transaction(s) broadcast to network failed!',
              err
            );
          }
        ),
        finalize(() => {
          this.isLoading$.next(false);
        }),
        untilDestroyed(this)
      )
      .subscribe();
  }

  isAssetValid(event: boolean) {
    this.isAssetValid$.next(event);
  }

  assetValidationErrors(event: any) {
    this.log.info(event);
  }

  ngOnDestroy() {}

  onUploadFile(event: MouseEvent) {
    event.preventDefault();

    this.modalService.create({
      nzContent: IpfsUploadFilePinataComponent,
      ...ModalUtils.getCreateModalDefaultConfig(),
      nzClosable: false,
    });
  }

  getTransactionBatchLimit() {
    return transactionBatchLimit;
  }
}
