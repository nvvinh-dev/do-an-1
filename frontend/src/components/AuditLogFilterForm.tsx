import { Controller, useForm } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import {
  AUDIT_ACTIONS,
  AUDIT_ENTITY_TYPES,
  type AuditLogFilterFormValues,
  type AuditLogFilters,
} from '@/types/auditLogTypes'
import { getAuditActionLabel, getAuditEntityTypeLabel } from '@/utils/auditLogLabels'
import {
  fromAuditLogFormValues,
  isDateRangeValid,
  toAuditLogFormValues,
  validateAuditLogId,
} from '@/utils/auditLogParams'

interface AuditLogFilterFormProps {
  /** Bộ lọc đang áp dụng (đọc từ URL); form chỉ đọc lúc dựng, trang dựng lại form khi URL đổi. */
  filters: AuditLogFilters
  onApply: (filters: AuditLogFilters) => void
  onClear: () => void
}

/**
 * Bộ lọc của AD4 theo đủ bốn tiêu chí của FR-64: đối tượng (loại và mã), người thực hiện, loại thao
 * tác, khoảng thời gian. Bấm "Tra cứu" mới ghi lên URL, để gõ mã không gọi API theo từng phím.
 * Người thực hiện lọc theo mã tài khoản vì API chỉ nhận `actorUserId`; mã hiện ở từng dòng nhật ký.
 */
export default function AuditLogFilterForm({ filters, onApply, onClear }: AuditLogFilterFormProps) {
  const { control, handleSubmit } = useForm<AuditLogFilterFormValues>({
    defaultValues: toAuditLogFormValues(filters),
    mode: 'onTouched',
  })

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => onApply(fromAuditLogFormValues(values)))}
      className="flex flex-col gap-5 rounded-xl border bg-card p-4"
    >
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Controller
          name="entityType"
          control={control}
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor="audit-entityType">Loại đối tượng</FieldLabel>
              <NativeSelect {...field} id="audit-entityType" className="w-full">
                <NativeSelectOption value="">Tất cả</NativeSelectOption>
                {AUDIT_ENTITY_TYPES.map((value) => (
                  <NativeSelectOption key={value} value={value}>
                    {getAuditEntityTypeLabel(value)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
          )}
        />

        <Controller
          name="entityId"
          control={control}
          rules={{ validate: validateAuditLogId }}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="audit-entityId">Mã đối tượng</FieldLabel>
              <Input
                {...field}
                id="audit-entityId"
                inputMode="numeric"
                className="tabular-nums"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="actorUserId"
          control={control}
          rules={{ validate: validateAuditLogId }}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="col-span-2 lg:col-span-1">
              <FieldLabel htmlFor="audit-actorUserId">Mã người thực hiện</FieldLabel>
              <Input
                {...field}
                id="audit-actorUserId"
                inputMode="numeric"
                className="tabular-nums"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="action"
          control={control}
          render={({ field }) => (
            <Field className="col-span-2 lg:col-span-1">
              <FieldLabel htmlFor="audit-action">Loại thao tác</FieldLabel>
              <NativeSelect {...field} id="audit-action" className="w-full">
                <NativeSelectOption value="">Tất cả thao tác</NativeSelectOption>
                {AUDIT_ACTIONS.map((value) => (
                  <NativeSelectOption key={value} value={value}>
                    {getAuditActionLabel(value)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
          )}
        />

        <Controller
          name="fromDate"
          control={control}
          rules={{ deps: ['toDate'] }}
          render={({ field }) => (
            // Ở 360px nửa hàng không đủ chỗ: ô ngày cắt mất chữ số cuối của năm.
            <Field className="col-span-2 sm:col-span-1">
              <FieldLabel htmlFor="audit-fromDate">Từ ngày</FieldLabel>
              <Input {...field} id="audit-fromDate" type="date" />
            </Field>
          )}
        />

        <Controller
          name="toDate"
          control={control}
          rules={{
            validate: (toDate, values) =>
              isDateRangeValid(values.fromDate, toDate) || 'Đến ngày không được trước từ ngày.',
          }}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="col-span-2 sm:col-span-1">
              <FieldLabel htmlFor="audit-toDate">Đến ngày</FieldLabel>
              <Input {...field} id="audit-toDate" type="date" aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" onClick={onClear}>
          Xóa bộ lọc
        </Button>
        <Button type="submit">Tra cứu</Button>
      </div>
    </form>
  )
}
