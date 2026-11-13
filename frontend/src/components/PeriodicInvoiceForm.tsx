import { Plus, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Controller, useFieldArray, useForm, useWatch, type Control } from 'react-hook-form'
import { Link } from 'react-router'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import ImageUploader from '@/components/ImageUploader'
import MoneyText from '@/components/MoneyText'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import type { MeterReading } from '@/types/contractTypes'
import type { ContractInvoiceListItem, PeriodicInvoiceRequest } from '@/types/invoiceTypes'
import { normalizeMeterIndex, validateMeterIndex } from '@/utils/contractForm'
import { formatDate } from '@/utils/formatDate'
import { formatMeterIndex } from '@/utils/formatMeterIndex'
import { emptyAdjustmentLine, toPeriodicInvoiceRequest, type InvoiceFormValues } from '@/utils/invoiceForm'
import {
  normalizeLineAmount,
  validateLineAmount,
  validateLineDescription,
  validateNotBelowPrevious,
} from '@/utils/settlementForm'

interface PeriodicInvoiceFormProps {
  defaultValues: InvoiceFormValues
  /** Chỉ số cũ của kỳ này; `null` khi chưa tải được thì bỏ qua phần so sánh, server vẫn kiểm tra. */
  previousReading: MeterReading | null
  /** Đơn giá điện, nước đã chốt trong hợp đồng, chỉ để Chủ trọ đối chiếu. */
  unitPrices: { electricity: number; water: number }
  /** Hóa đơn định kỳ trước của hợp đồng, để dòng điều chỉnh chọn hóa đơn gốc (BR-16). */
  relatedInvoices: ContractInvoiceListItem[]
  submitLabel: string
  /** Trang quay về khi bấm Quay lại (chi tiết hợp đồng khi lập, chi tiết hóa đơn khi sửa). */
  backPath: string
  isPending: boolean
  error: unknown
  onSubmit: (request: PeriodicInvoiceRequest) => void
}

/**
 * Form L7 (docs/frontend-screens.md mục 6): chỉ số mới và ảnh đồng hồ, các dòng điều chỉnh (mô tả, số tiền, hóa
 * đơn gốc). Chỉ hiện số điện, nước đã dùng (mới − cũ), không tự tính tiền (security-design mục 5.2): tổng tiền và
 * cách tính xem ở L8 sau khi lưu nháp. Kiểm tra ở đây chỉ để báo sớm; `409`, `422` hiện `detail` trên nút lưu và
 * giữ nguyên dữ liệu đã nhập.
 */
export default function PeriodicInvoiceForm({
  defaultValues,
  previousReading,
  unitPrices,
  relatedInvoices,
  submitLabel,
  backPath,
  isPending,
  error,
  onSubmit,
}: PeriodicInvoiceFormProps) {
  const { control, handleSubmit } = useForm<InvoiceFormValues>({ mode: 'onTouched', defaultValues })
  const lineArray = useFieldArray({ control, name: 'adjustmentLines' })
  // Hai ô ảnh có thể tải cùng lúc; gửi khi ảnh chưa tải xong thì thiếu `path` của ảnh đó.
  const [uploadingCount, setUploadingCount] = useState(0)
  const onUploadingChange = (uploading: boolean) => setUploadingCount((count) => count + (uploading ? 1 : -1))

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => {
        if (isPending || uploadingCount > 0) return
        onSubmit(toPeriodicInvoiceRequest(values))
      })}
      className="flex max-w-2xl flex-col gap-6"
    >
      <FormSection title="Chốt điện nước">
        <div className="grid gap-6 md:grid-cols-2">
          <MeterFields
            control={control}
            kind="electricity"
            previous={previousReading?.electricityIndex ?? null}
            unitPrice={unitPrices.electricity}
            disabled={isPending}
            onUploadingChange={onUploadingChange}
          />
          <MeterFields
            control={control}
            kind="water"
            previous={previousReading?.waterIndex ?? null}
            unitPrice={unitPrices.water}
            disabled={isPending}
            onUploadingChange={onUploadingChange}
          />
        </div>
      </FormSection>

      <FormSection title="Điều chỉnh">
        <p className="text-sm text-muted-foreground">
          Sửa sai sót của hóa đơn trước (đã thanh toán hoặc không còn sửa được) bằng một dòng ở hóa đơn kỳ này. Mỗi
          khoản một dòng có mô tả; khoản giảm ghi số âm. Tổng hóa đơn không được âm — khoản giảm lớn hơn tiền tháng
          thì chia sang các kỳ sau.
        </p>

        {lineArray.fields.map((line, index) => (
          <AdjustmentLineFields
            key={line.id}
            id={line.id}
            index={index}
            control={control}
            relatedInvoices={relatedInvoices}
            disabled={isPending}
            onRemove={() => lineArray.remove(index)}
          />
        ))}

        <Button
          type="button"
          variant="outline"
          className="self-start"
          disabled={isPending}
          onClick={() => lineArray.append(emptyAdjustmentLine(), { shouldFocus: true })}
        >
          <Plus />
          Thêm dòng điều chỉnh
        </Button>
      </FormSection>

      <ApiErrorAlert error={error} />

      <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
        <Button asChild variant="outline" size="page">
          <Link to={backPath}>Quay lại</Link>
        </Button>
        <Button type="submit" size="page" disabled={isPending || uploadingCount > 0}>
          {isPending && <Spinner />}
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <FieldSet className="flex min-w-0 flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm md:p-6">
      <FieldLegend className="text-lg font-medium">{title}</FieldLegend>
      {children}
    </FieldSet>
  )
}

const METER_TEXT = {
  electricity: {
    index: 'currentElectricityIndex',
    photo: 'electricityPhoto',
    label: 'Chỉ số điện mới (kWh)',
    photoLabel: 'Ảnh đồng hồ điện',
    unit: 'kWh',
  },
  water: {
    index: 'currentWaterIndex',
    photo: 'waterPhoto',
    label: 'Chỉ số nước mới (m³)',
    photoLabel: 'Ảnh đồng hồ nước',
    unit: 'm³',
  },
} as const

interface MeterFieldsProps {
  control: Control<InvoiceFormValues>
  kind: keyof typeof METER_TEXT
  previous: number | null
  unitPrice: number
  disabled: boolean
  onUploadingChange: (uploading: boolean) => void
}

/** Chỉ số cũ do hệ thống điền (chỉ đọc), chỉ số mới, số đã dùng và ảnh đồng hồ tùy chọn của một đồng hồ. */
function MeterFields({ control, kind, previous, unitPrice, disabled, onUploadingChange }: MeterFieldsProps) {
  const text = METER_TEXT[kind]
  const id = `invoice-${kind}`
  const current = useWatch({ control, name: text.index })
  const used =
    previous !== null && validateMeterIndex(current) === true
      ? Number(normalizeMeterIndex(current)) - previous
      : null

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <Controller
        name={text.index}
        control={control}
        rules={{
          validate: (value) => {
            const format = validateMeterIndex(value)
            return format === true ? validateNotBelowPrevious(value, previous) : format
          },
        }}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={id}>
              {text.label} <span aria-hidden="true">*</span>
            </FieldLabel>
            <Input
              {...field}
              id={id}
              inputMode="decimal"
              className="tabular-nums"
              disabled={disabled}
              aria-invalid={fieldState.invalid}
              onBlur={() => {
                const normalized = normalizeMeterIndex(field.value).replace('.', ',')
                if (normalized !== field.value) field.onChange(normalized)
                field.onBlur()
              }}
            />
            <FieldDescription>
              {previous !== null && (
                <>
                  Chỉ số cũ {formatMeterIndex(previous)} {text.unit}
                  {used !== null && used >= 0 && ` · đã dùng ${formatMeterIndex(used)} ${text.unit}`}
                  {' · '}
                </>
              )}
              Đơn giá <MoneyText amount={unitPrice} /> / {text.unit}
            </FieldDescription>
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )}
      />
      <Controller
        name={text.photo}
        control={control}
        render={({ field }) => (
          <Field>
            <FieldLabel>{text.photoLabel}</FieldLabel>
            <ImageUploader
              purpose="AnhDongHo"
              value={field.value}
              onChange={field.onChange}
              disabled={disabled}
              onUploadingChange={onUploadingChange}
              imageLabel={text.photoLabel}
            />
          </Field>
        )}
      />
    </div>
  )
}

interface AdjustmentLineFieldsProps {
  id: string
  index: number
  control: Control<InvoiceFormValues>
  relatedInvoices: ContractInvoiceListItem[]
  disabled: boolean
  onRemove: () => void
}

/** Một dòng điều chỉnh (`DieuChinhKhac`): mô tả, số tiền (âm là khoản giảm), hóa đơn gốc tùy chọn. */
function AdjustmentLineFields({ id, index, control, relatedInvoices, disabled, onRemove }: AdjustmentLineFieldsProps) {
  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">Dòng {index + 1}</span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={`Xóa dòng ${index + 1}`}
          disabled={disabled}
          onClick={onRemove}
        >
          <Trash2 />
          <span className="max-md:sr-only">Xóa dòng</span>
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_12rem] md:items-start">
        <Controller
          name={`adjustmentLines.${index}.description`}
          control={control}
          rules={{ validate: validateLineDescription }}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`adjustment-description-${id}`}>
                Mô tả <span aria-hidden="true">*</span>
              </FieldLabel>
              <Textarea
                {...field}
                id={`adjustment-description-${id}`}
                placeholder="Ví dụ: Tháng 10 ghi dư 20 số điện"
                disabled={disabled}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name={`adjustmentLines.${index}.amount`}
          control={control}
          rules={{ validate: (value) => validateLineAmount(value, 'DieuChinhKhac') }}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`adjustment-amount-${id}`}>
                Số tiền (₫) <span aria-hidden="true">*</span>
              </FieldLabel>
              <Input
                {...field}
                id={`adjustment-amount-${id}`}
                className="tabular-nums"
                disabled={disabled}
                aria-invalid={fieldState.invalid}
                onBlur={() => {
                  const normalized = normalizeLineAmount(field.value)
                  if (normalized !== field.value) field.onChange(normalized)
                  field.onBlur()
                }}
              />
              <FieldDescription>Khoản giảm ghi số âm, ví dụ -70000.</FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </div>

      {relatedInvoices.length > 0 && (
        <Controller
          name={`adjustmentLines.${index}.relatedInvoiceId`}
          control={control}
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor={`adjustment-related-${id}`}>Hóa đơn gốc</FieldLabel>
              <NativeSelect {...field} id={`adjustment-related-${id}`} className="w-full" disabled={disabled}>
                <NativeSelectOption value="">Không gắn hóa đơn nào</NativeSelectOption>
                {relatedInvoices.map((invoice) => (
                  <NativeSelectOption key={invoice.id} value={String(invoice.id)}>
                    #{invoice.id} · Kỳ {formatDate(invoice.periodStart)} – {formatDate(invoice.periodEnd)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldDescription>Chọn hóa đơn có sai sót mà dòng này sửa.</FieldDescription>
            </Field>
          )}
        />
      )}
    </div>
  )
}
