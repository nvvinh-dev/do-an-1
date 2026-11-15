import { useState, type ReactNode } from 'react'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { validatePaymentAmount } from '@/utils/invoiceForm'
import { normalizeRoomMoney } from '@/utils/validateRoomInput'

interface PaymentAmountFieldProps {
  id: string
  label: string
  /** Chuỗi chữ số người dùng gõ; hiện dấu chấm hàng nghìn khi rời ô (docs/design-system.md mục 8). */
  value: string
  onChange: (value: string) => void
  description?: ReactNode
  error: string | null
  disabled: boolean
}

/** Ô số tiền của hộp thoại báo đã thanh toán (T5) và xác nhận đã thu (L8). */
export default function PaymentAmountField({
  id,
  label,
  value,
  onChange,
  description,
  error,
  disabled,
}: PaymentAmountFieldProps) {
  const [focused, setFocused] = useState(false)
  const display =
    !focused && validatePaymentAmount(value) === true ? Number(normalizeRoomMoney(value)).toLocaleString('vi-VN') : value

  return (
    <Field data-invalid={error !== null}>
      <FieldLabel htmlFor={id}>
        {label} <span aria-hidden="true">*</span>
      </FieldLabel>
      <Input
        id={id}
        value={display}
        inputMode="numeric"
        className="tabular-nums"
        disabled={disabled}
        aria-invalid={error !== null}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false)
          onChange(normalizeRoomMoney(value))
        }}
        onChange={(event) => onChange(event.target.value)}
      />
      {description && <FieldDescription>{description}</FieldDescription>}
      {error && <FieldError>{error}</FieldError>}
    </Field>
  )
}
