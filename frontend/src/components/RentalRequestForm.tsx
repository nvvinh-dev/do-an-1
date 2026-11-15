import { Controller, useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { useSubmitRentalRequest } from '@/hooks/useSubmitRentalRequest'
import { cn } from '@/lib/utils'
import { getVietnamToday } from '@/utils/getVietnamToday'

const NOTE_MAX_LENGTH = 500

interface RentalRequestFormProps {
  /** `room.id` của `GET /rooms/{id}/public`. */
  roomId: number
  /** `room.maxOccupants`: ô số người cho chọn từ 1 tới số này (BR-11). */
  maxOccupants: number
  className?: string
}

interface RentalRequestFormValues {
  expectedMoveInDate: string
  // Giá trị của `select` luôn là chuỗi; đổi sang số khi gửi.
  expectedOccupants: string
  note: string
}

/**
 * Form gửi yêu cầu thuê (T3, docs/frontend-screens.md mục 5), đặt ở P2 sau nút **Gửi yêu cầu
 * thuê** của Người thuê đã đăng nhập. Gửi xong thì hiện `toast` và mở chi tiết yêu cầu vừa gửi
 * (mục 8). Form chỉ kiểm tra để báo sớm; server vẫn kiểm tra lại: `404` khi phòng vừa bị ẩn hoặc
 * đã có người giữ chỗ, `409` khi đã có yêu cầu chờ duyệt cho phòng này (BR-27), `422` khi ngày
 * hay số người sai — đều hiện `detail` ngay trên nút gửi, giữ nguyên dữ liệu đã nhập.
 */
export default function RentalRequestForm({ roomId, maxOccupants, className }: RentalRequestFormProps) {
  const navigate = useNavigate()
  const submitMutation = useSubmitRentalRequest(roomId)
  const today = getVietnamToday()
  const occupantOptions = Array.from({ length: Math.max(1, maxOccupants) }, (_, index) => index + 1)

  const { control, handleSubmit } = useForm<RentalRequestFormValues>({
    mode: 'onTouched',
    defaultValues: { expectedMoveInDate: '', expectedOccupants: '1', note: '' },
  })

  const onSubmit = handleSubmit((values) => {
    const note = values.note.trim()
    submitMutation.mutate(
      {
        expectedMoveInDate: values.expectedMoveInDate,
        expectedOccupants: Number(values.expectedOccupants),
        note: note === '' ? null : note,
      },
      {
        onSuccess: (rentalRequest) => {
          toast.success('Đã gửi yêu cầu thuê')
          void navigate(`/tenant/rental-requests/${rentalRequest.id}`)
        },
      },
    )
  })

  return (
    <form noValidate onSubmit={onSubmit} className={cn('flex flex-col gap-4', className)}>
      <FieldGroup>
        <Controller
          name="expectedMoveInDate"
          control={control}
          rules={{
            validate: (value) => {
              if (value === '') {
                return 'Vui lòng chọn ngày dự kiến vào ở.'
              }
              // Hai chuỗi `YYYY-MM-DD` so sánh được trực tiếp.
              return value >= getVietnamToday() || 'Ngày dự kiến vào ở không được trước hôm nay.'
            },
          }}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="expectedMoveInDate">
                Ngày dự kiến vào ở <span aria-hidden="true">*</span>
              </FieldLabel>
              <Input {...field} id="expectedMoveInDate" type="date" min={today} aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="expectedOccupants"
          control={control}
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor="expectedOccupants">
                Số người ở <span aria-hidden="true">*</span>
              </FieldLabel>
              <NativeSelect {...field} id="expectedOccupants" className="w-full">
                {occupantOptions.map((count) => (
                  <NativeSelectOption key={count} value={String(count)}>
                    {count} người
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldDescription>Phòng này ở tối đa {maxOccupants} người.</FieldDescription>
            </Field>
          )}
        />

        <Controller
          name="note"
          control={control}
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor="note">Ghi chú cho Chủ trọ</FieldLabel>
              <Textarea
                {...field}
                id="note"
                maxLength={NOTE_MAX_LENGTH}
                placeholder="Ví dụ: đi làm giờ hành chính, xem phòng được buổi tối"
              />
              <FieldDescription>
                Không bắt buộc, tối đa {NOTE_MAX_LENGTH} ký tự ({field.value.length}/{NOTE_MAX_LENGTH}).
              </FieldDescription>
            </Field>
          )}
        />
      </FieldGroup>

      <p className="text-sm text-muted-foreground">
        Chủ trọ có 7 ngày để duyệt. Khi yêu cầu được duyệt, bạn sẽ thấy số điện thoại của Chủ trọ để liên hệ.
      </p>

      <ApiErrorAlert error={submitMutation.error} />

      <Button type="submit" size="page" className="md:self-end" disabled={submitMutation.isPending}>
        {submitMutation.isPending && <Spinner />}
        Gửi yêu cầu thuê
      </Button>
    </form>
  )
}
