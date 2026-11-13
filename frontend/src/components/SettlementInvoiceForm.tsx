import { Plus, Trash2 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Controller, useFieldArray, useForm, useWatch, type Control } from 'react-hook-form'
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
import type { ContractInvoiceListItem, InvoiceLine } from '@/types/invoiceTypes'
import type { SettlementInvoiceRequest, SettlementLineCategory } from '@/types/settlementTypes'
import { normalizeMeterIndex, validateMeterIndex } from '@/utils/contractForm'
import { formatCurrency } from '@/utils/formatCurrency'
import { formatDate } from '@/utils/formatDate'
import { formatMeterIndex } from '@/utils/formatMeterIndex'
import { getInvoiceLineCategoryLabel } from '@/utils/invoiceLineCategoryLabels'
import {
  emptySettlementLine,
  MAX_SETTLEMENT_LINES,
  normalizeLineAmount,
  toSettlementInvoiceRequest,
  validateLineAmount,
  validateLineDescription,
  validateMoveOutDate,
  validateNotBelowPrevious,
  type SettlementFormValues,
} from '@/utils/settlementForm'

interface SettlementInvoiceFormProps {
  defaultValues: SettlementFormValues
  /** Chỉ số cũ của lần chốt này; `null` khi chưa tải được thì bỏ qua phần so sánh, server vẫn kiểm tra. */
  previousReading: MeterReading | null
  contractStartDate: string
  depositAmount: number
  /** `penaltyAllowed` của thông báo trả phòng: chỉ khi `true` mới thêm được dòng phí phạt (FR-87). */
  penaltyAllowed: boolean
  /** Hóa đơn định kỳ của hợp đồng, để dòng điều chỉnh chọn hóa đơn gốc (BR-16). */
  relatedInvoices: ContractInvoiceListItem[]
  /** Dòng công nợ, trừ cọc server đã thêm (khi sửa); chỉ hiển thị. */
  systemLines: InvoiceLine[]
  today: string
  submitLabel: string
  isPending: boolean
  error: unknown
  onSubmit: (request: SettlementInvoiceRequest) => void
  /** Có thì hiện nút thôi sửa (khi sửa bảng nháp). */
  onCancel?: () => void
}

/**
 * Form lập và sửa bảng thanh lý ở L9 (docs/frontend-screens.md mục 6): chỉ số cuối và ảnh đồng hồ, ngày trả
 * phòng thực tế, dòng bồi thường hư hỏng kèm ảnh, dòng phí phạt khi được phép, dòng điều chỉnh. Dòng công nợ và
 * trừ tiền cọc do server thêm, form chỉ hiển thị. Kiểm tra ở đây chỉ để báo sớm; `409`, `422` hiện `detail` trên
 * nút lưu và giữ nguyên dữ liệu đã nhập.
 */
export default function SettlementInvoiceForm({
  defaultValues,
  previousReading,
  contractStartDate,
  depositAmount,
  penaltyAllowed,
  relatedInvoices,
  systemLines,
  today,
  submitLabel,
  isPending,
  error,
  onSubmit,
  onCancel,
}: SettlementInvoiceFormProps) {
  const { control, handleSubmit } = useForm<SettlementFormValues>({ mode: 'onTouched', defaultValues })
  const lineArray = useFieldArray({ control, name: 'lines' })
  // Nhiều ô ảnh có thể tải cùng lúc; gửi khi ảnh chưa tải xong thì thiếu `path` của ảnh đó.
  const [uploadingCount, setUploadingCount] = useState(0)
  const onUploadingChange = (uploading: boolean) => setUploadingCount((count) => count + (uploading ? 1 : -1))
  const canAddPenalty = penaltyAllowed && depositAmount > 0
  const isFull = lineArray.fields.length >= MAX_SETTLEMENT_LINES

  const addLine = (category: SettlementLineCategory) =>
    lineArray.append(emptySettlementLine(category), { shouldFocus: true })

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => {
        if (isPending || uploadingCount > 0) return
        onSubmit(toSettlementInvoiceRequest(values))
      })}
      className="flex flex-col gap-6"
    >
      <FormSection title="Ngày trả phòng">
        <Controller
          name="moveOutDate"
          control={control}
          rules={{ validate: (value) => validateMoveOutDate(value, contractStartDate, today) }}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid} className="md:max-w-xs">
              <FieldLabel htmlFor="settlement-move-out-date">
                Ngày trả phòng thực tế <span aria-hidden="true">*</span>
              </FieldLabel>
              <Input
                {...field}
                id="settlement-move-out-date"
                type="date"
                min={contractStartDate}
                max={today}
                aria-invalid={fieldState.invalid}
              />
              <FieldDescription>Ngày người thuê dọn đi và bàn giao phòng; là ngày cuối kỳ của bảng.</FieldDescription>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FormSection>

      <FormSection title="Chốt điện nước lần cuối">
        <div className="grid gap-6 md:grid-cols-2">
          <MeterFields
            control={control}
            kind="electricity"
            previous={previousReading?.electricityIndex ?? null}
            disabled={isPending}
            onUploadingChange={onUploadingChange}
          />
          <MeterFields
            control={control}
            kind="water"
            previous={previousReading?.waterIndex ?? null}
            disabled={isPending}
            onUploadingChange={onUploadingChange}
          />
        </div>
      </FormSection>

      <FormSection title="Các khoản khấu trừ và điều chỉnh">
        <p className="text-sm text-muted-foreground">
          Mỗi khoản là một dòng riêng có mô tả. Bồi thường hư hỏng và phí phạt là số dương; điều chỉnh khác nhận số
          âm (thêm dấu trừ) để giảm tiền.
          {canAddPenalty && ` Tổng phí phạt không vượt tiền cọc ${formatCurrency(depositAmount)}.`}
        </p>

        {lineArray.fields.map((line, index) => (
          <LineFields
            key={line.id}
            id={line.id}
            index={index}
            control={control}
            category={line.category}
            relatedInvoices={relatedInvoices}
            disabled={isPending}
            removeDisabled={isPending || uploadingCount > 0}
            onUploadingChange={onUploadingChange}
            onRemove={() => lineArray.remove(index)}
          />
        ))}

        <div className="flex flex-col gap-2 md:flex-row md:flex-wrap">
          <Button type="button" variant="outline" disabled={isFull} onClick={() => addLine('BoiThuongHuHong')}>
            <Plus />
            Bồi thường hư hỏng
          </Button>
          {canAddPenalty && (
            <Button type="button" variant="outline" disabled={isFull} onClick={() => addLine('PhiPhat')}>
              <Plus />
              Phí phạt
            </Button>
          )}
          <Button type="button" variant="outline" disabled={isFull} onClick={() => addLine('DieuChinhKhac')}>
            <Plus />
            Điều chỉnh khác
          </Button>
        </div>
        {isFull && <p className="text-sm text-muted-foreground">Bảng có tối đa {MAX_SETTLEMENT_LINES} dòng.</p>}
      </FormSection>

      <FormSection title="Dòng hệ thống tự thêm">
        {systemLines.length > 0 ? (
          <ul className="flex flex-col divide-y">
            {systemLines.map((line, index) => (
              <li key={index} className="flex flex-col gap-1 py-2 text-sm md:flex-row md:justify-between md:gap-4">
                <span className="flex min-w-0 flex-col">
                  <span className="font-medium">{getInvoiceLineCategoryLabel(line.category)}</span>
                  <span className="text-muted-foreground wrap-anywhere">{line.description}</span>
                </span>
                <MoneyText amount={line.amount} className="md:shrink-0" />
              </li>
            ))}
          </ul>
        ) : null}
        <p className="text-sm text-muted-foreground">
          Khi lưu, hệ thống tự thêm một dòng công nợ cho mỗi hóa đơn còn thiếu tiền (hóa đơn đó chuyển vào bảng thanh
          lý)
          {depositAmount > 0
            ? ` và dòng trừ tiền cọc ${formatCurrency(depositAmount)}.`
            : '; hợp đồng không đặt cọc nên không có dòng trừ cọc.'}{' '}
          Tiền phòng, điện nước của kỳ cuối và số dư do hệ thống tính.
        </p>
      </FormSection>

      <ApiErrorAlert error={error} />

      <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
        {onCancel && (
          <Button type="button" variant="outline" size="page" disabled={isPending} onClick={onCancel}>
            Thôi sửa
          </Button>
        )}
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
  control: Control<SettlementFormValues>
  kind: keyof typeof METER_TEXT
  previous: number | null
  disabled: boolean
  onUploadingChange: (uploading: boolean) => void
}

/** Chỉ số mới, số đã dùng (mới − cũ, không phải tiền) và ảnh đồng hồ tùy chọn của một đồng hồ. */
function MeterFields({ control, kind, previous, disabled, onUploadingChange }: MeterFieldsProps) {
  const text = METER_TEXT[kind]
  const id = `settlement-${kind}`
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
              aria-invalid={fieldState.invalid}
              onBlur={() => {
                const normalized = normalizeMeterIndex(field.value).replace('.', ',')
                if (normalized !== field.value) field.onChange(normalized)
                field.onBlur()
              }}
            />
            {previous !== null && (
              <FieldDescription>
                Chỉ số cũ {formatMeterIndex(previous)} {text.unit}
                {used !== null && used >= 0 && ` · đã dùng ${formatMeterIndex(used)} ${text.unit}`}
              </FieldDescription>
            )}
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

interface LineFieldsProps {
  id: string
  index: number
  control: Control<SettlementFormValues>
  category: SettlementLineCategory
  relatedInvoices: ContractInvoiceListItem[]
  disabled: boolean
  /**
   * Khóa nút xóa khi đang lưu hoặc còn ảnh đang tải. Xóa một dòng làm các dòng sau dồn lên chỉ số mới, mà ảnh
   * tải xong vẫn ghi theo tên ô cũ (`lines.<chỉ số>.evidence`): ảnh của dòng đã xóa sẽ gắn nhầm sang dòng khác.
   */
  removeDisabled: boolean
  onUploadingChange: (uploading: boolean) => void
  onRemove: () => void
}

/** Một dòng Chủ trọ nhập. Loại dòng chọn lúc thêm và không đổi; muốn đổi thì xóa dòng rồi thêm lại. */
function LineFields({
  id,
  index,
  control,
  category,
  relatedInvoices,
  disabled,
  removeDisabled,
  onUploadingChange,
  onRemove,
}: LineFieldsProps) {
  const label = getInvoiceLineCategoryLabel(category)

  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-lg border p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium">
          {index + 1}. {label}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          aria-label={`Xóa dòng ${index + 1}`}
          disabled={removeDisabled}
          onClick={onRemove}
        >
          <Trash2 />
          <span className="max-md:sr-only">Xóa dòng</span>
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_14rem] md:items-start">
        <Controller
          name={`lines.${index}.description`}
          control={control}
          rules={{ validate: validateLineDescription }}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`line-description-${id}`}>
                Mô tả <span aria-hidden="true">*</span>
              </FieldLabel>
              <Textarea
                {...field}
                id={`line-description-${id}`}
                placeholder={DESCRIPTION_PLACEHOLDERS[category]}
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
        <Controller
          name={`lines.${index}.amount`}
          control={control}
          rules={{ validate: (value) => validateLineAmount(value, category) }}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor={`line-amount-${id}`}>
                Số tiền (₫) <span aria-hidden="true">*</span>
              </FieldLabel>
              <Input
                {...field}
                id={`line-amount-${id}`}
                inputMode={category === 'DieuChinhKhac' ? 'text' : 'numeric'}
                className="tabular-nums"
                aria-invalid={fieldState.invalid}
                onBlur={() => {
                  const normalized = normalizeLineAmount(field.value)
                  if (normalized !== field.value) field.onChange(normalized)
                  field.onBlur()
                }}
              />
              {category === 'DieuChinhKhac' && <FieldDescription>Khoản giảm ghi số âm, ví dụ -70000.</FieldDescription>}
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </div>

      {category === 'BoiThuongHuHong' && (
        <Controller
          name={`lines.${index}.evidence`}
          control={control}
          render={({ field }) => (
            <Field>
              <FieldLabel>Ảnh hư hỏng</FieldLabel>
              <ImageUploader
                purpose="AnhHuHong"
                value={field.value}
                onChange={field.onChange}
                disabled={disabled}
                onUploadingChange={onUploadingChange}
                imageLabel={`Ảnh hư hỏng dòng ${index + 1}`}
              />
            </Field>
          )}
        />
      )}

      {category === 'DieuChinhKhac' && relatedInvoices.length > 0 && (
        <Controller
          name={`lines.${index}.relatedInvoiceId`}
          control={control}
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor={`line-related-${id}`}>Hóa đơn gốc</FieldLabel>
              <NativeSelect {...field} id={`line-related-${id}`} className="w-full">
                <NativeSelectOption value="">Không gắn hóa đơn nào</NativeSelectOption>
                {relatedInvoices.map((invoice) => (
                  <NativeSelectOption key={invoice.id} value={String(invoice.id)}>
                    #{invoice.id} · Kỳ {formatDate(invoice.periodStart)} – {formatDate(invoice.periodEnd)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldDescription>Chọn khi dòng này sửa sai sót của một hóa đơn trước.</FieldDescription>
            </Field>
          )}
        />
      )}
    </div>
  )
}

const DESCRIPTION_PLACEHOLDERS: Record<SettlementLineCategory, string> = {
  BoiThuongHuHong: 'Ví dụ: Vỡ kính cửa sổ phòng ngủ',
  PhiPhat: 'Ví dụ: Báo trả phòng trước 10 ngày, hợp đồng quy định 30 ngày',
  DieuChinhKhac: 'Ví dụ: Tháng 10 ghi dư 20 số điện',
}
