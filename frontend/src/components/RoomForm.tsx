import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Link } from 'react-router'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import ImageUploader from '@/components/ImageUploader'
import RoomNumberField from '@/components/RoomNumberField'
import RoomServiceFeeFields from '@/components/RoomServiceFeeFields'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import type { Amenity } from '@/types/amenityTypes'
import type { RoomFormValues, RoomRequest } from '@/types/roomTypes'
import {
  normalizeRoomArea,
  normalizeRoomMoney,
  validateRoomArea,
  validateRoomMoney,
  validateRoomOccupants,
} from '@/utils/validateRoomInput'

const MAX_ROOM_IMAGES = 10

interface RoomFormProps {
  defaultValues: RoomFormValues
  amenities: Amenity[]
  submitLabel: string
  cancelTo: string
  isPending: boolean
  error: unknown
  onSubmit: (request: RoomRequest) => void
}

export default function RoomForm({
  defaultValues,
  amenities,
  submitLabel,
  cancelTo,
  isPending,
  error,
  onSubmit,
}: RoomFormProps) {
  const form = useForm<RoomFormValues>({ mode: 'onTouched', defaultValues })
  const { control, handleSubmit } = form
  // Gửi khi ảnh chưa tải xong thì `imagePaths` thiếu ảnh đó.
  const [isUploading, setIsUploading] = useState(false)
  const submit = handleSubmit((values) => {
    if (isPending || isUploading) return
    // Bấm Enter ngay trong ô thì ô chưa rời, chuỗi chưa được chuẩn hóa: chuẩn hóa lại ở đây.
    const money = (value: string) => Number(normalizeRoomMoney(value))
    onSubmit({
      code: values.code.trim(),
      area: Number(normalizeRoomArea(values.area)),
      maxOccupants: Number(values.maxOccupants.trim()),
      rentPrice: money(values.rentPrice),
      electricityUnitPrice: money(values.electricityUnitPrice),
      waterUnitPrice: money(values.waterUnitPrice),
      description: values.description.trim() || null,
      serviceFees: values.serviceFees.map((fee) => ({ name: fee.name.trim(), amount: money(fee.amount) })),
      amenityIds: values.amenityIds,
      // PUT thay toàn bộ danh sách ảnh: ảnh bị bỏ khỏi danh sách là bỏ khỏi phòng. Phòng đang hiển thị
      // mà bỏ hết ảnh thì server trả 422 kèm `detail` (API mục 5.2).
      imagePaths: values.images.map((image) => image.path),
    })
  })

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-6 rounded-xl border bg-card p-4 md:p-6">
      <fieldset disabled={isPending} className="min-w-0">
        <FieldGroup>
          <Controller
            name="code"
            control={control}
            rules={{
              validate: (value) => value.trim() !== '' || 'Vui lòng nhập mã phòng.',
              maxLength: { value: 50, message: 'Mã phòng tối đa 50 ký tự.' },
            }}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="room-code">
                  Mã phòng <span aria-hidden="true">*</span>
                </FieldLabel>
                <Input
                  {...field}
                  id="room-code"
                  required
                  placeholder="Ví dụ: P101"
                  aria-invalid={fieldState.invalid}
                  aria-describedby={fieldState.invalid ? 'room-code-error' : 'room-code-help'}
                />
                {fieldState.invalid ? (
                  <FieldError id="room-code-error" errors={[fieldState.error]} />
                ) : (
                  <FieldDescription id="room-code-help">Mã phòng không được trùng trong cùng khu trọ.</FieldDescription>
                )}
              </Field>
            )}
          />

          <div className="grid gap-5 md:grid-cols-2">
            <RoomNumberField control={control} name="area" label="Diện tích (m²)" decimal validate={validateRoomArea} />
            <RoomNumberField
              control={control}
              name="maxOccupants"
              label="Số người tối đa"
              validate={validateRoomOccupants}
            />
            <RoomNumberField
              control={control}
              name="rentPrice"
              label="Giá thuê (đồng/tháng)"
              money
              validate={(value) => validateRoomMoney(value, true)}
            />
            <RoomNumberField
              control={control}
              name="electricityUnitPrice"
              label="Đơn giá điện (đồng/kWh)"
              money
              validate={validateRoomMoney}
            />
            <RoomNumberField
              control={control}
              name="waterUnitPrice"
              label="Đơn giá nước (đồng/m³)"
              money
              validate={validateRoomMoney}
            />
          </div>

          <RoomServiceFeeFields form={form} />

          <Controller
            name="description"
            control={control}
            rules={{ maxLength: { value: 2000, message: 'Mô tả tối đa 2.000 ký tự.' } }}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="room-description">Mô tả</FieldLabel>
                <Textarea
                  {...field}
                  id="room-description"
                  rows={4}
                  placeholder="Ví dụ: Có gác lửng, cửa sổ thoáng"
                  aria-invalid={fieldState.invalid}
                  aria-describedby={fieldState.invalid ? 'room-description-error' : undefined}
                />
                {fieldState.invalid && <FieldError id="room-description-error" errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="amenityIds"
            control={control}
            render={({ field }) => (
              <FieldSet>
                <FieldLegend>Tiện ích của phòng</FieldLegend>
                {amenities.length === 0 ? (
                  <FieldDescription>Chưa có tiện ích phòng trong danh mục.</FieldDescription>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {amenities.map((amenity) => (
                      <Field key={amenity.id} orientation="horizontal">
                        <Checkbox
                          id={`room-amenity-${amenity.id}`}
                          checked={field.value.includes(amenity.id)}
                          onBlur={field.onBlur}
                          onCheckedChange={(checked) =>
                            field.onChange(
                              checked === true
                                ? [...field.value, amenity.id]
                                : field.value.filter((id) => id !== amenity.id),
                            )
                          }
                        />
                        <FieldLabel htmlFor={`room-amenity-${amenity.id}`} className="font-normal">
                          {amenity.name}
                        </FieldLabel>
                      </Field>
                    ))}
                  </div>
                )}
              </FieldSet>
            )}
          />

          <Controller
            name="images"
            control={control}
            render={({ field }) => (
              <FieldSet>
                <FieldLegend>Ảnh phòng</FieldLegend>
                <FieldDescription>
                  Ảnh đầu tiên là ảnh đại diện của tin đăng. Dùng mũi tên để đổi thứ tự.
                </FieldDescription>
                <ImageUploader
                  purpose="AnhPhong"
                  value={field.value}
                  onChange={field.onChange}
                  maxFiles={MAX_ROOM_IMAGES}
                  reorderable
                  disabled={isPending}
                  onUploadingChange={setIsUploading}
                  imageLabel={defaultValues.code ? `Ảnh phòng ${defaultValues.code}` : undefined}
                />
              </FieldSet>
            )}
          />
        </FieldGroup>
      </fieldset>
      <ApiErrorAlert
        error={error}
        onRetry={() => {
          if (!isPending) void submit()
        }}
      />
      <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
        <Button asChild variant="outline" size="page">
          <Link to={cancelTo}>Hủy</Link>
        </Button>
        <Button type="submit" size="page" disabled={isPending || isUploading}>
          {isPending && <Spinner />}
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
