import { Controller, useForm } from 'react-hook-form'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import PageHeader from '@/components/PageHeader'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useResetPassword } from '@/hooks/useResetPassword'
import { getApiErrorInfo } from '@/lib/apiError'
import { getRoleHomePath } from '@/utils/getRoleHomePath'
import { validatePassword } from '@/utils/validatePassword'

interface ResetPasswordFormValues {
  newPassword: string
  confirmPassword: string
}

/**
 * A4 — Đặt lại mật khẩu (docs/frontend-screens.md mục 3). `email` và `token` đọc từ query của
 * đường dẫn trong email (`/reset-password?email=...&token=...`, api-design mục 2); thiếu một
 * trong hai thì đường dẫn không hợp lệ, không hiện form. Mật khẩu mới kiểm đủ quy tắc trước khi
 * gửi (api-design mục 2), vì mỗi lần gửi đều tính vào ngưỡng 3 lần mỗi giờ và server gộp mọi lần
 * thất bại thành một câu "không hợp lệ hoặc đã hết hạn" (`AuthService.ResetPasswordAsync`) —
 * `ApiErrorAlert` hiện nguyên câu đó qua `trust400Detail` (xem `lib/apiError.ts`). Đặt lại xong
 * chuyển về `/login` kèm thông báo thành công và điền sẵn email (mục 8); `replace` để đường dẫn
 * chứa token không còn trong lịch sử trình duyệt.
 */
export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const email = searchParams.get('email')
  const token = searchParams.get('token')

  const { data: user, isPending } = useCurrentUser()
  const resetPasswordMutation = useResetPassword()

  const { control, handleSubmit, getValues, trigger } = useForm<ResetPasswordFormValues>({
    mode: 'onTouched',
    defaultValues: { newPassword: '', confirmPassword: '' },
  })

  if (isPending) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    )
  }

  if (user) {
    return <Navigate to={getRoleHomePath(user.roles)} replace />
  }

  if (!email || !token) {
    return (
      <section className="mx-auto flex w-full max-w-md flex-col gap-6 py-4 md:py-10">
        <PageHeader title="Đặt lại mật khẩu" description="Đặt mật khẩu mới cho tài khoản của bạn." />

        <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground md:p-6">
          <Alert variant="destructive" className="border-destructive/40">
            <AlertTitle>Đường dẫn không hợp lệ</AlertTitle>
            <AlertDescription>
              Đường dẫn đặt lại mật khẩu thiếu thông tin cần thiết. Vui lòng yêu cầu gửi lại hướng dẫn.
            </AlertDescription>
          </Alert>

          <Button asChild size="page" className="md:w-full">
            <Link to="/forgot-password">Gửi lại yêu cầu</Link>
          </Button>
        </div>
      </section>
    )
  }

  // Mật khẩu đã kiểm đủ quy tắc trước khi gửi, nên `400` ở đây gần như chỉ còn là token sai
  // hoặc hết hạn — cách duy nhất là xin đường dẫn mới ở A3.
  const isInvalidLinkError = getApiErrorInfo(resetPasswordMutation.error).status === 400

  const onSubmit = handleSubmit((values) => {
    resetPasswordMutation.mutate(
      { email, token, newPassword: values.newPassword },
      { onSuccess: () => navigate('/login', { replace: true, state: { passwordResetEmail: email } }) },
    )
  })

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-6 py-4 md:py-10">
      <PageHeader title="Đặt lại mật khẩu" description={`Đặt mật khẩu mới cho ${email}.`} />

      <form
        noValidate
        onSubmit={onSubmit}
        className="flex flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground md:p-6"
      >
        <ApiErrorAlert error={resetPasswordMutation.error} trust400Detail />

        {isInvalidLinkError && (
          <p className="text-sm text-muted-foreground">
            Cần đường dẫn mới?{' '}
            <Link to="/forgot-password" className="text-primary underline-offset-4 hover:underline">
              Gửi lại yêu cầu
            </Link>
          </p>
        )}

        <FieldGroup>
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
                    // Mật khẩu đổi thì kiểm lại ô nhập lại, nếu ô đó đã có chữ — tránh báo lỗi
                    // "không khớp" bị kẹt lại sau khi đã sửa đúng, và báo lại khi đổi thành sai.
                    if (getValues('confirmPassword')) {
                      void trigger('confirmPassword')
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
            name="confirmPassword"
            control={control}
            rules={{
              required: 'Vui lòng nhập lại mật khẩu.',
              validate: (value) => value === getValues('newPassword') || 'Mật khẩu nhập lại không khớp.',
            }}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="confirmPassword">
                  Nhập lại mật khẩu mới <span aria-hidden="true">*</span>
                </FieldLabel>
                <Input
                  {...field}
                  id="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </FieldGroup>

        <Button type="submit" size="page" className="md:w-full" disabled={resetPasswordMutation.isPending}>
          {resetPasswordMutation.isPending && <Spinner />}
          Đặt lại mật khẩu
        </Button>
      </form>
    </section>
  )
}
