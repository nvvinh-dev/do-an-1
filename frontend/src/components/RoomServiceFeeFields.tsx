import { Plus, Trash2 } from 'lucide-react'
import { Controller, useFieldArray, type UseFormReturn } from 'react-hook-form'
import RoomNumberField from '@/components/RoomNumberField'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import type { RoomFormValues } from '@/types/roomTypes'
import { validateRoomMoney, validateServiceFeeName } from '@/utils/validateRoomInput'

export default function RoomServiceFeeFields({ form }: { form: UseFormReturn<RoomFormValues> }) {
  const { control, getValues, trigger } = form
  const { fields, append, remove } = useFieldArray({ control, name: 'serviceFees' })
  // Đổi hoặc bỏ một tên thì lỗi trùng ở các dòng khác cũng đổi theo. Chỉ kiểm tra lại dòng đã có
  // tên, để dòng vừa thêm còn trống không hiện lỗi khi người dùng chưa nhập tới.
  const revalidateNames = () =>
    void trigger(
      getValues('serviceFees').flatMap((fee, i) =>
        fee.name.trim() === '' ? [] : [`serviceFees.${i}.name` as const],
      ),
    )

  return (
    <FieldSet>
      <FieldLegend>Phí dịch vụ cố định</FieldLegend>
      <FieldDescription>Tối đa 10 khoản phí mỗi kỳ. Để trống danh sách nếu không thu phí dịch vụ.</FieldDescription>
      {fields.map((fee, index) => (
        <div key={fee.id} className="flex flex-col gap-3 rounded-lg border p-3">
          <div className="grid gap-4 md:grid-cols-2">
            <Controller
              name={`serviceFees.${index}.name`}
              control={control}
              rules={{
                validate: (value) =>
                  validateServiceFeeName(
                    value,
                    getValues('serviceFees').map((item) => item.name),
                    index,
                  ),
              }}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`fee-name-${fee.id}`}>
                    Tên phí {index + 1} <span aria-hidden="true">*</span>
                  </FieldLabel>
                  <Input
                    {...field}
                    id={`fee-name-${fee.id}`}
                    required
                    placeholder="Ví dụ: Rác, Wifi"
                    aria-invalid={fieldState.invalid}
                    aria-describedby={fieldState.invalid ? `fee-error-${fee.id}` : undefined}
                    onBlur={() => {
                      field.onBlur()
                      revalidateNames()
                    }}
                  />
                  {fieldState.invalid && <FieldError id={`fee-error-${fee.id}`} errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <RoomNumberField
              control={control}
              name={`serviceFees.${index}.amount`}
              label={`Số tiền phí ${index + 1} (đồng/kỳ)`}
              money
              validate={validateRoomMoney}
            />
          </div>
          <Button
            type="button"
            variant="ghost"
            className="self-end"
            aria-label={`Xóa khoản phí ${index + 1}`}
            onClick={() => {
              remove(index)
              revalidateNames()
            }}
          >
            <Trash2 /> Xóa khoản phí
          </Button>
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        className="self-start"
        disabled={fields.length >= 10}
        onClick={() => append({ name: '', amount: '' })}
      >
        <Plus /> Thêm khoản phí ({fields.length}/10)
      </Button>
    </FieldSet>
  )
}
