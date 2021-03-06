import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
  TemplateRef,
  ViewChild
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { CollectionsUtils } from '@app/dashboard/pages/collections/utils/collections-utils';
import { BehaviorSubject } from 'rxjs';
import { TextUtils } from '@core/utils/text-utils';
import {
  AttributeType,
  CreateAttributeModalResponse,
} from '@app/dashboard/pages/collections/interfaces/collection.types';
import { FormUtils } from '@core/utils/form-utils';
import { ObjectUtils } from '@core/utils/object-utils';
import { untilDestroyed } from '@core/until-destroyed';
import { tap } from 'rxjs/operators';
import { NzModalRef } from 'ng-zorro-antd/modal';

@Component({
  selector: 'app-attribute-create-modal',
  templateUrl: './attribute-create-modal.component.html',
  styleUrls: ['./attribute-create-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttributeCreateModalComponent implements OnInit, OnDestroy {
  TextUtils = TextUtils;
  AttributeType = AttributeType;
  AttributeTypes = CollectionsUtils.getAttributeTypes();
  attributeForm!: FormGroup;

  isLoading$ = new BehaviorSubject(false);
  type$ = new BehaviorSubject<AttributeType | null>(null);

  @ViewChild('modalTitleTpl', { static: true })
  modalTitleTpl!: TemplateRef<{}>;

  constructor(
    private formBuilder: FormBuilder,
    public nzModalRef: NzModalRef<
      AttributeCreateModalComponent,
      CreateAttributeModalResponse
    >,
    private cd: ChangeDetectorRef
  ) {
    this.createForm();
  }

  ngOnInit(): void {
    // TODO: ExpressionChangedAfterItHasBeenCheckedError thrown
    setTimeout(() => {
      this.nzModalRef.updateConfig({
        nzTitle: this.modalTitleTpl,
        nzWidth: '35vw',
      });
      this.cd.markForCheck();
    });
  }

  createForm() {
    this.attributeForm = this.formBuilder.group({
      name: [
        '',
        [
          Validators.required,
          Validators.pattern(TextUtils.getAttributeRegex()),
        ],
      ],
      isRequired: [false],
      type: ['', [Validators.required]],
      attributes: [],
    });

    this.c('type')
      .valueChanges.pipe(
        tap((type) => {
          this.type$.next(type);
          this.c('attributes').reset(null);
        }),
        untilDestroyed(this)
      )
      .subscribe();
  }

  c(controlName: string) {
    return this.attributeForm.controls[controlName];
  }

  addAttribute(event: MouseEvent) {
    event.preventDefault();

    if (!this.attributeForm.valid) {
      FormUtils.markFormGroupDirty(this.attributeForm);
      return;
    }
    const { attributes, ...rest } = this.attributeForm.value;
    if (attributes) {
      ObjectUtils.removeEmpty(attributes);
    }

    this.nzModalRef.destroy({
      ...rest,
      attributes,
    });
  }

  ngOnDestroy(): void {}
}
