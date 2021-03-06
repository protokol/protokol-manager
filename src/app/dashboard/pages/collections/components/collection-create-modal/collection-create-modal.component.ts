import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  TemplateRef,
  ViewChild,
} from '@angular/core';
import { JsonEditorOptions } from 'ang-jsoneditor';
import { WidgetConfigService } from '@app/ajsf-widget-library/services/widget-config.service';
import { environment } from '@env/environment';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Logger } from '@core/services/logger.service';
import { CryptoService } from '@app/@core/services/crypto.service';
import { FormUtils } from '@core/utils/form-utils';
import { BehaviorSubject } from 'rxjs';
import { finalize, first, tap } from 'rxjs/operators';
import { untilDestroyed } from '@core/until-destroyed';
import { RefreshModalResponse } from '@core/interfaces/refresh-modal.response';
import { Store } from '@ngxs/store';
import { NetworksState } from '@core/store/network/networks.state';
import { BaseResourcesTypes } from '@protokol/client';
import { MemoryUtils } from '@core/utils/memory-utils';
import { CollectionsUtils } from '@app/dashboard/pages/collections/utils/collections-utils';
import { AttributeCreateModalComponent } from '@app/dashboard/pages/collections/components/attribute-create-modal/attribute-create-modal.component';
import { ModalUtils } from '@core/utils/modal-utils';
import { CreateAttributeModalResponse } from '@app/dashboard/pages/collections/interfaces/collection.types';
import { NzModalRef, NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { NzMessageService } from 'ng-zorro-antd/message';

@Component({
  selector: 'app-collection-create-modal',
  templateUrl: './collection-create-modal.component.html',
  styleUrls: ['./collection-create-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CollectionCreateModalComponent implements OnInit, OnDestroy {
  readonly log = new Logger(this.constructor.name);
  readonly editorOptions: JsonEditorOptions;

  collectionForm!: FormGroup;
  framework = WidgetConfigService.getFramework();
  isProduction = environment.production;

  isLoading$ = new BehaviorSubject(false);
  isMetadataEnabled$ = new BehaviorSubject(false);
  isMetadataValid$ = new BehaviorSubject(false);

  metadata = {};

  cryptoDefaults!: BaseResourcesTypes.BaseConfigurations['crypto']['defaults'];

  @ViewChild('modalTitleTpl', { static: true })
  modalTitleTpl!: TemplateRef<{}>;

  constructor(
    private formBuilder: FormBuilder,
    private cryptoService: CryptoService,
    private nzNotificationService: NzNotificationService,
    public modalRef: NzModalRef<
      CollectionCreateModalComponent,
      RefreshModalResponse
    >,
    private messageService: NzMessageService,
    private store: Store,
    private nzModalService: NzModalService,
    private cd: ChangeDetectorRef
  ) {
    this.editorOptions = new JsonEditorOptions();
    this.editorOptions.mode = 'code';

    this.cryptoDefaults = this.store.selectSnapshot(
      NetworksState.getCryptoDefaults()
    );
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

  get nameMinLength() {
    const {
      nftCollectionName: { minLength },
    } = this.cryptoDefaults;
    return minLength;
  }

  get nameMaxLength() {
    const {
      nftCollectionName: { maxLength },
    } = this.cryptoDefaults;
    return maxLength;
  }

  get descriptionMinLength() {
    const {
      nftCollectionDescription: { minLength },
    } = this.cryptoDefaults;
    return minLength;
  }

  get descriptionMaxLength() {
    const {
      nftCollectionDescription: { maxLength },
    } = this.cryptoDefaults;
    return maxLength;
  }

  get schemaMaxSize() {
    const { nftCollectionJsonSchemaByteSize } = this.cryptoDefaults;
    return nftCollectionJsonSchemaByteSize;
  }

  get maximumSupplyMin() {
    return 0;
  }

  get maximumSupplyMax() {
    return Number.MAX_SAFE_INTEGER;
  }

  schemaSizeValidator = (control: FormControl): ValidationErrors | null => {
    if (
      control.value &&
      MemoryUtils.getBytesFromString(control.value) > this.schemaMaxSize
    ) {
      return { maxSize: true, error: true };
    }

    return null;
    // tslint:disable-next-line:semicolon
  };

  private createForm() {
    this.collectionForm = this.formBuilder.group({
      name: [
        '',
        [
          Validators.required,
          Validators.min(this.nameMinLength),
          Validators.max(this.nameMaxLength),
        ],
      ],
      description: [
        '',
        [
          Validators.required,
          Validators.min(this.descriptionMinLength),
          Validators.max(this.descriptionMaxLength),
        ],
      ],
      maximumSupply: [
        '',
        [
          Validators.min(this.maximumSupplyMin),
          Validators.max(this.maximumSupplyMax),
        ],
      ],
      jsonSchema: [
        CollectionsUtils.getDefaultJsonSchema(),
        [Validators.required, this.schemaSizeValidator],
      ],
      allowedIssuers: [],
    });
  }

  c(controlName: string) {
    return this.collectionForm.controls[controlName];
  }

  createCollection(event: any) {
    event.preventDefault();
    if (this.isLoading$.getValue()) {
      return;
    }

    if (
      this.isMetadataEnabled$.getValue() &&
      !this.isMetadataValid$.getValue()
    ) {
      this.messageService.error('Invalid metadata! Make metadata valid');
      return;
    }

    if (!this.collectionForm.valid) {
      FormUtils.markFormGroupDirty(this.collectionForm);
      return;
    }

    this.isLoading$.next(true);

    const { allowedIssuers, ...rest } = this.collectionForm.value;

    this.cryptoService
      .registerCollection({
        ...rest,
        ...(allowedIssuers && allowedIssuers.length
          ? { allowedIssuers: allowedIssuers.map(({ publicKey }) => publicKey) }
          : {}),
        ...(this.isMetadataEnabled$.getValue()
          ? {
              metadata: { ...this.metadata },
            }
          : {}),
      })
      .pipe(
        tap(
          () => {
            this.messageService.success(
              'Collection transaction broadcast to network!'
            );
            this.modalRef.destroy({ refresh: true });
          },
          (err) => {
            this.nzNotificationService.create(
              'error',
              'Collection transaction broadcast to network failed!',
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

  ngOnDestroy(): void {}

  addNewAttribute(event: MouseEvent) {
    event.preventDefault();

    if (!this.c('jsonSchema').valid) {
      this.messageService.error('Invalid schema! Make schema valid');
      return;
    }

    const attributeCreateModalRef = this.nzModalService.create<
      AttributeCreateModalComponent,
      CreateAttributeModalResponse
    >({
      nzContent: AttributeCreateModalComponent,
      ...ModalUtils.getCreateModalDefaultConfig(),
    });

    attributeCreateModalRef.afterClose
      .pipe(
        first(),
        tap(({ name, isRequired, type, attributes }) => {
          const { properties, required, ...restSchema } = this.c(
            'jsonSchema'
          ).value;
          this.c('jsonSchema').setValue({
            ...restSchema,
            properties: {
              ...(properties || {}),
              [name]: {
                type,
                ...attributes,
              },
            },
            required: [...(required || []), ...(isRequired ? [name] : [])],
          });
        }),
        untilDestroyed(this)
      )
      .subscribe();
  }

  isMetadataValid(valid: boolean) {
    this.isMetadataValid$.next(valid);
  }

  metadataValidationErrors(event: any) {
    this.log.warn(event);
  }
}
