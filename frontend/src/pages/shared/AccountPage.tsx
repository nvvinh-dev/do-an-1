import { CircleCheck } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import ConfirmDialog from '@/components/ConfirmDialog'
import PageHeader from '@/components/PageHeader'
import { Alert, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { useChangePassword } from '@/hooks/useChangePassword'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useUpdateProfile } from '@/hooks/useUpdateProfile'
import type { UpdateProfileRequest } from '@/types/authTypes'
import { PHONE_PATTERN } from '@/utils/phonePattern'
import { validatePassword } from '@/utils/validatePassword'

interface ChangePasswordFormValues {
  currentPassword: string
  newPassword: string
  confirmNewPassword: string
}

/**
 * S1 — Tài khoản (docs/frontend-screens.md mục 4). Hai form độc lập: sửa họ tên, số điện thoại
 * (FR-83) và đổi mật khẩu (FR-05). Đổi số điện thoại thì số bị bỏ trạng thái đã xác thực (BR-01)
 * — hỏi xác nhận trước khi lưu, vì frontend không biết số hiện tại đã xác thực hay chưa
 * (`CurrentUser` không có trường này) nên hỏi mỗi khi số nhập khác số đang lưu.
 */
export default function AccountPage() {
  const { data: user } = useCurrentUser()

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-6 py-4 md:py-10">
      <PageHeader title="Tài khoản" description="Xem và cập nhật thông tin cá nhân, đổi mật khẩu." />
      {user && <ProfileForm email={user.email} fullName={user.fullName} phoneNumber={user.phoneNumber} />}
      <ChangePasswordForm />
    </section>
  )
}

interface ProfileFormProps {
  email: string
  fullName: string
  phoneNumber: string | null
}

function ProfileForm({ email, fullName, phoneNumber }: ProfileFormProps) {
  const updateProfileMutation = useUpdateProfile()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [pendingValues, setPendingValues] = useState<UpdateProfileRequest | null>(null)
  const [saved, setSaved] = useState(false)

  const { control, handleSubmit } = useForm<{ fullName: string; phoneNumber: string }>({
    mode: 'onTouched',
    defaultValues: { fullName, phoneNumber: phoneNumber ?? '' },
  })

  const save = (values: UpdateProfileRequest) => {
    setSaved(false)
    updateProfileMutation.mutate(values, {
      onSuccess: () => {
        setConfirmOpen(false)
        setSaved(true)
      },
    })
  }

  const onSubmit = handleSubmit((values) => {
    const trimmedPhone = values.phoneNumber.trim()
    const normalizedPhone = trimmedPhone === '' ? null : trimmedPhone
    const request: UpdateProfileRequest = {
      fullName: values.fullName.trim(),
      phoneNumber: trimmedPhone === '' ? undefined : trimmedPhone,
    }

    if (normalizedPhone !== phoneNumber) {
      setPendingValues(request)
      setConfirmOpen(true)
      return
    }

    save(request)
  })

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      className="flex flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground md:p-6"
    >
      <h2 className="text-lg font-medium">Thông tin cá nhân</h2>

      {saved && (
        <Alert className="border-success/40 text-success">
          <CircleCheck />
          <AlertTitle>Đã lưu thông tin</AlertTitle>
        </Alert>
      )}

      <ApiErrorAlert error={confirmOpen ? null : updateProfileMutation.error} />

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">Email</FieldLabel>
          <Input id="email" value={email} disabled readOnly autoComplete="email" />
        </Field>

        <Controller
          name="fullName"
          control={control}
          rules={{
            required: 'Vui lòng nhập họ tên.',
            maxLength: { value: 100, message: 'Họ tên tối đa 100 ký tự.' },
          }}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="fullName">
                Họ tên <span aria-hidden="true">*</span>
              </FieldLabel>
              <Input {...field} id="fullName" autoComplete="name" aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="phoneNumber"
          control={control}
          rules={{
            validate: (value) => {
              const trimmed = value.trim()
              return trimmed === '' || PHONE_PATTERN.test(trimmed) || 'Số điện thoại gồm 10–11 chữ số, bắt đầu bằng 0.'
            },
          }}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="phoneNumber">Số điện thoại</FieldLabel>
              <Input {...field} id="phoneNumber" type="tel" autoComplete="tel" aria-invalid={fieldState.invalid} />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : (
                <FieldDescription>Đổi số điện thoại thì số mới cần xác thực lại.</FieldDescription>
              )}
            </Field>
          )}
        />
      </FieldGroup>

      <Button type="submit" size="page" className="md:w-full" disabled={updateProfileMutation.isPending}>
        {updateProfileMutation.isPending && <Spinner />}
        Lưu thông tin
      </Button>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Đổi số điện thoại"
        description="Số điện thoại mới sẽ mất trạng thái đã xác thực và cần xác thực lại, ví dụ khi dùng để nộp hồ sơ đăng ký làm Chủ trọ. Bạn có muốn lưu thay đổi này không?"
        confirmLabel="Lưu thay đổi"
        isPending={updateProfileMutation.isPending}
        error={updateProfileMutation.error}
        onConfirm={() => pendingValues && save(pendingValues)}
      />
    </form>
  )
}

function ChangePasswordForm() {
  const changePasswordMutation = useChangePassword()
  const [saved, setSaved] = useState(false)

  const { control, handleSubmit, getValues, trigger, reset } = useForm<ChangePasswordFormValues>({
    mode: 'onTouched',
    defaultValues: { currentPassword: '', newPassword: '', confirmNewPassword: '' },
  })

  const onSubmit = handleSubmit((values) => {
    setSaved(false)
    changePasswordMutation.mutate(
      { currentPassword: values.currentPassword, newPassword: values.newPassword },
      {
        onSuccess: () => {
          reset()
          setSaved(true)
        },
      },
    )
  })

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      className="flex flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground md:p-6"
    >
      <h2 className="text-lg font-medium">Đổi mật khẩu</h2>

      {saved && (
        <Alert className="border-success/40 text-success">
          <CircleCheck />
          <AlertTitle>Đã đổi mật khẩu</AlertTitle>
        </Alert>
      )}

      <ApiErrorAlert error={changePasswordMutation.error} />

      <FieldGroup>
        <Controller
          name="currentPassword"
          control={control}
          rules={{ required: 'Vui lòng nhập mật khẩu hiện tại.' }}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="currentPassword">
                Mật khẩu hiện tại <span aria-hidden="true">*</span>
              </FieldLabel>
              <Input
                {...field}
                id="currentPassword"
                type="password"
                autoComplete="current-password"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="newPassword"
          control={control}
          rules={{
            required: 'Vui lòng nhập mật khẩu mới.',
            maxLength: { value: 128, message: 'Mật khẩu tối đa 128 ký tự.' },
            validate: (value) => validatePassword(value) ?? true,
          }}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="newPassword">
                Mật khẩu mới <span aria-hidden="true">*</span>
              </FieldLabel>
              <Input
                {...field}
                id="newPassword"
                type="password"
                autoComplete="new-password"
                aria-invalid={fieldState.invalid}
                onChange={(event) => {
                  field.onChange(event)
                  // Mật khẩu mới đổi thì kiểm lại ô nhập lại, nếu ô đó đã có chữ (giống A2).
                  if (getValues('confirmNewPassword')) {
                    void trigger('confirmNewPassword')
                  }
                }}
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : (
                <FieldDescription>
                  Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt.
                </FieldDescription>
              )}
            </Field>
          )}
        />

        <Controller
          name="confirmNewPassword"
          control={control}
          rules={{
            required: 'Vui lòng nhập lại mật khẩu mới.',
            validate: (value) => value === getValues('newPassword') || 'Mật khẩu nhập lại không khớp.',
          }}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="confirmNewPassword">
                Nhập lại mật khẩu mới <span aria-hidden="true">*</span>
              </FieldLabel>
              <Input
                {...field}
                id="confirmNewPassword"
                type="password"
                autoComplete="new-password"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />
      </FieldGroup>

      <Button type="submit" size="page" className="md:w-full" disabled={changePasswordMutation.isPending}>
        {changePasswordMutation.isPending && <Spinner />}
        Đổi mật khẩu
      </Button>
    </form>
  )
}
