import { ChangeDetectionStrategy, Component, forwardRef, Input, OnDestroy } from '@angular/core';
import { ControlValueAccessor, FormArray, FormBuilder, NG_VALIDATORS, NG_VALUE_ACCESSOR } from '@angular/forms';
import { first, tap } from 'rxjs/operators';
import { untilDestroyed } from '@core/until-destroyed';
import { BehaviorSubject } from 'rxjs';
import { Store } from '@ngxs/store';
import { GuardianState } from '@app/dashboard/pages/guardian/state/guardian/guardian.state';
import { GuardianUtils } from '@app/dashboard/pages/guardian/utils/guardian-utils';
import {
  PermissionFormItem,
  PermissionKind,
  TransactionType,
  UserGroupsFormItem
} from '@app/dashboard/pages/guardian/interfaces/guardian.types';
import { LoadGuardianGroup } from '@app/dashboard/pages/guardian/state/guardian/guardian.actions';
import { GuardianResourcesTypes } from '@protokol/client';

@Component({
  selector: 'app-guardian-group-permissions-form',
  templateUrl: './guardian-group-permissions-form.component.html',
  styleUrls: ['./guardian-group-permissions-form.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => GuardianGroupPermissionsFormComponent),
      multi: true,
    },
    {
      provide: NG_VALIDATORS,
      useExisting: forwardRef(() => GuardianGroupPermissionsFormComponent),
      multi: true,
    },
  ],
})
export class GuardianGroupPermissionsFormComponent
  implements ControlValueAccessor, OnDestroy {
  readonly PermissionKind = PermissionKind;

  form!: FormArray;
  isFormReady$ = new BehaviorSubject(false);
  isLoading$ = new BehaviorSubject(false);
  transactionTypes$ = new BehaviorSubject<TransactionType[] | null>(null);
  isExpanded$ = new BehaviorSubject<{ [type: number]: boolean }>({});
  groupNames$ = new BehaviorSubject<UserGroupsFormItem[]>([]);
  groups$ = new BehaviorSubject<GuardianResourcesTypes.Group[] | null>(null);

  @Input('groupNames')
  set groupNames(groupNames: UserGroupsFormItem[]) {
    this.groupNames$.next(groupNames);
  }

  constructor(private formBuilder: FormBuilder, private store: Store) {
    this.store
      .select(GuardianState.getTransactionTypes)
      .pipe(
        first((transactionTypes) => !!transactionTypes),
        tap((transactionTypes) => {
          const transactionTypesEntries = Object.entries(
            transactionTypes
          ).map(([index, value]) => [
            parseInt(index, 10),
            value,
          ]) as TransactionType[];

          this.isExpanded$.next(
            transactionTypesEntries
              .map(([index]) => index)
              .reduce((acc, curr) => ({ ...acc, [curr]: false }), {})
          );

          this.transactionTypes$.next(transactionTypesEntries);

          const formDefaultValues = transactionTypesEntries
            .map(([transactionTypeGroup, typeGroupValue]) => {
              return Object.values(typeGroupValue).map((transactionType) => {
                return {
                  kind: PermissionKind.Intermediate,
                  transactionTypeGroup,
                  transactionType
                };
              });
            })
            .flat() as PermissionFormItem[];

          this.createForm(formDefaultValues);
          this.isFormReady$.next(true);
        }),
        untilDestroyed(this)
      )
      .subscribe();

    this.groupNames$
      .pipe(
        tap((groupNames) => {
          this.groups$.next(null);

          if (groupNames.length) {
            this.store.select(
              GuardianState.getGuardianGroupsByIds(groupNames.map(({ name }) => name))
            ).pipe(
              untilDestroyed(this),
              first(groups => groups.every(g => !!g)),
              tap((groups) =>
                this.groups$.next(
                  (groups as GuardianResourcesTypes.Group[])
                    .sort(({ priority: aPriority, priority: bPriority }) =>
                      aPriority - bPriority
                    )
                )
              )
            ).subscribe();

            this.store.dispatch(groupNames.map(({ name }) =>
              new LoadGuardianGroup(name)
            ));
          }
        }),
        untilDestroyed(this)
      ).subscribe();
  }

  fromPermissionToFormItem({
                             kind,
                             transactionType,
                             transactionTypeGroup
                           }: PermissionFormItem) {
    return this.formBuilder.group({
      kind: [kind],
      transactionTypeGroup: [transactionTypeGroup],
      transactionType: [transactionType]
    });
  }

  createForm(formPermissions: PermissionFormItem[]) {
    this.form = this.formBuilder.array(
      formPermissions
        .sort(
          (
            { transactionTypeGroup: a },
            { transactionTypeGroup: b }
          ) => a - b
        )
        .map((p) => this.fromPermissionToFormItem(p))
    );

    this.form.valueChanges
      .pipe(
        tap((formValue) => {
          this.onChange(formValue);
          this.onTouched();
        }),
        untilDestroyed(this)
      )
      .subscribe();
  }

  c(controlName: string) {
    return this.form.controls[controlName];
  }

  get value(): PermissionFormItem[] {
    return this.form.value;
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
      this.form.disable();
    } else {
      this.form.enable();
    }
  }

  writeValue(value): void {
    if (value) {
      this.setDefaultValues(value);
    } else if (value === null) {
      const formDefaultValues = this.transactionTypes$.getValue()
        .map(([transactionTypeGroup, typeGroupValue]) => {
          return Object.values(typeGroupValue).map((transactionType) => {
            return {
              kind: PermissionKind.Intermediate,
              transactionTypeGroup,
              transactionType
            };
          });
        })
        .flat() as PermissionFormItem[];

      this.setDefaultValues(formDefaultValues);
    }
  }

  validate() {
    return this.form.valid;
  }

  getGroupName(transactionTypeGroup: number) {
    return GuardianUtils.transactionTypeIndexToGroupName(transactionTypeGroup);
  }

  isTypeGroupSelected(transactionTypeGroupIndex: number, kindSelected: PermissionKind) {
    const permissions = this.form.value as PermissionFormItem[];
    const permissionsForTransactionKind = permissions.filter(
      ({ transactionTypeGroup }) =>
        transactionTypeGroupIndex === transactionTypeGroup
    );
    return permissionsForTransactionKind.every(({ kind }) => kind === kindSelected);
  }

  selectTypeGroup(isSelected: boolean, transactionTypeGroupIndex: number, kindSelected: PermissionKind) {
    const permissions = this.form.value as PermissionFormItem[];
    const markAsKind = isSelected ? kindSelected : PermissionKind.Intermediate;
    this.isLoading$.next(true);

    permissions.forEach(
      ({ kind, transactionTypeGroup }, index) => {
        if (
          kind !== markAsKind &&
          transactionTypeGroupIndex === transactionTypeGroup
        ) {
          this.form.at(index).patchValue({
            kind: markAsKind,
          });
        }
      }
    );

    this.isLoading$.next(false);
  }

  isTypeSelected(
    transactionTypeGroupIndex: number,
    transactionTypeIndex: number,
    kind: PermissionKind
  ) {
    const permissions = this.form.value as PermissionFormItem[];
    return (
      permissions.find(
        ({ transactionTypeGroup, transactionType }) =>
          transactionTypeGroupIndex === transactionTypeGroup &&
          transactionTypeIndex === transactionType
      )?.kind === kind
    );
  }

  selectType(
    isSelected: boolean,
    transactionTypeGroupIndex: number,
    transactionTypeIndex: number,
    kind: PermissionKind
  ) {
    const permissions = this.form.value as PermissionFormItem[];
    const markAsKind = isSelected ? kind : PermissionKind.Intermediate;

    const permissionIndex = permissions.findIndex(
      ({ transactionTypeGroup, transactionType }) =>
        transactionTypeGroupIndex === transactionTypeGroup &&
        transactionTypeIndex === transactionType
    );
    if (permissionIndex >= 0) {
      this.form.at(permissionIndex).patchValue({
        kind: markAsKind,
      });
    }
  }

  onExpand(
    event: MouseEvent,
    transactionTypeGroupIndex: number,
    expand: boolean
  ) {
    event.preventDefault();

    this.isExpanded$.next({
      ...this.isExpanded$.getValue(),
      [transactionTypeGroupIndex]: expand,
    });
  }

  setDefaultValues(defaultValues: PermissionFormItem[]) {
    if (defaultValues?.length) {
      this.isFormReady$.asObservable()
        .pipe(
          first(isFormReady => !!isFormReady),
          tap(() => {
            this.isLoading$.next(true);

            defaultValues.forEach(({ kind, transactionTypeGroup, transactionType }) => {
              const permissions = this.form.value as PermissionFormItem[];

              const permissionIndex = permissions.findIndex(
                ({ transactionTypeGroup: typeGroup, transactionType: type }) => {
                  return transactionTypeGroup === typeGroup && type === transactionType;
                });

              this.form.at(permissionIndex).patchValue({
                kind
              });
            });

            this.onChange(this.form.value);
            this.onTouched();

            this.isLoading$.next(false);
          }),
          untilDestroyed(this)
        )
        .subscribe();
    }
  }

  ngOnDestroy(): void {}

  hasGroupPermissions(group: GuardianResourcesTypes.Group, typeGroup: number, typeValue: number): PermissionKind | null {
    const { active } = group;
    if (!active) {
      return null;
    }

    const { allow, deny } = group;
    let isAllowed = null;
    let isDenied = null;

    if (allow?.length) {
      isAllowed = allow.some(({ transactionTypeGroup, transactionType }) =>
        transactionTypeGroup === typeGroup && typeValue === transactionType
      ) ? PermissionKind.Allow : null;
    }
    if (deny?.length) {
      isDenied = deny.some(({ transactionTypeGroup, transactionType }) =>
        transactionTypeGroup === typeGroup && typeValue === transactionType
      ) ? PermissionKind.Deny : null;
    }

    return isAllowed || isDenied;
  }
}
