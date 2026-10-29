import { useState } from 'react'
import { Controller, type Control, type FieldPathByValue } from 'react-hook-form'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import type { RoomFormValues } from '@/types/roomTypes'
import { normalizeRoomArea, normalizeRoomMoney } from '@/utils/validateRoomInput'

interface RoomNumberFieldProps {
  control: Control<RoomFormValues>
  name: FieldPathByValue<RoomFormValues, string>
  label: string
  money?: boolean
  decimal?: boolean
  validate: (value: string) => true | string
}

/**
 * Ô nhập số của form phòng. Rời ô thì đưa chuỗi về dạng API nhận ("3.000.000" → "3000000",
 * "20,5" → "20.5") và với tiền thì hiện dấu chấm hàng nghìn (design-system mục 8); chuỗi sai giữ
 * nguyên để người dùng thấy và sửa.
 */
export default function RoomNumberField({ control, name, label, money, decimal, validate }: RoomNumberFieldProps) {
  const [focused, setFocused] = useState(false)
  const id = `room-${name}`
  const normalize = money ? normalizeRoomMoney : decimal ? normalizeRoomArea : (value: string) => value.trim()
  return (
    <Controller
      name={name}
      control={control}
      // react-hook-form gọi validate(value, formValues); chỉ chuyển value để tham số thứ hai của
      // hàm kiểm tra (như `positive` của validateRoomMoney) không nhận nhầm cả form.
      rules={{ validate: (value) => validate(value) }}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id}>
            {label} <span aria-hidden="true">*</span>
          </FieldLabel>
          <Input
            {...field}
            id={id}
            inputMode={decimal ? 'decimal' : 'numeric'}
            className="tabular-nums"
            required
            aria-invalid={fieldState.invalid}
            aria-describedby={fieldState.invalid ? `${id}-error` : undefined}
            value={
              money && !focused && validate(field.value) === true
                ? Number(normalize(field.value)).toLocaleString('vi-VN')
                : field.value
            }
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false)
              const normalized = normalize(field.value)
              if (normalized !== field.value) field.onChange(normalized)
              field.onBlur()
            }}
          />
          {fieldState.invalid && <FieldError id={`${id}-error`} errors={[fieldState.error]} />}
        </Field>
      )}
    />
  )
}
