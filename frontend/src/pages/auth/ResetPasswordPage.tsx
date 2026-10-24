import { useState } from 'react'
import { CircleCheck } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { Link, Navigate, useSearchParams } from 'react-router'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import PageHeader from '@/components/PageHeader'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useResetPassword } from '@/hooks/useResetPassword'
import { getRoleHomePath } from '@/utils/getRoleHomePath'

interface ResetPasswordFormValues {
  newPassword: string
  confirmPassword: string
}

/**
 * A4 — Đặt lại mật khẩu (docs/frontend-screens.md mục 3). `email` và `token` đọc từ query của
 * đường dẫn trong email (`/reset-password?email=...&token=...`, api-design mục 2); thiếu một
 * trong hai thì đường dẫn không hợp lệ, không hiện form. Token sai hoặc hết hạn trả `400` với
 * câu tiếng Việt cố định (`AuthService.ResetPasswordAsync`) — `ApiErrorAlert` hiện nguyên câu đó
 * qua `trust400Detail` (xem `lib/apiError.ts`).
 */
export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const email = searchParams.get('email')
  const token = searchParams.get('token')

  const { data: user, isPending } = useCurrentUser()
  const resetPasswordMutation = useResetPassword()
  const [resetDone, setResetDone] = useState(false)

  const { control, handleSubmit, getValues } = useForm<ResetPasswordFormValues>({
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

  if (resetDone) {
    return (
      <section className="mx-auto flex w-full max-w-md flex-col gap-6 py-4 md:py-10">
        <PageHeader title="Đặt lại mật khẩu" description="Đặt mật khẩu mới cho tài khoản của bạn." />

        <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground md:p-6">
          <Alert className="border-success/40 text-success">
            <CircleCheck />
            <AlertTitle>Đặt lại mật khẩu thành công</AlertTitle>
            <AlertDescription className="text-success/90">
              Mật khẩu của bạn đã được đổi. Vui lòng đăng nhập lại.
            </AlertDescription>
          </Alert>

          <Button asChild size="page" className="md:w-full">
            <Link to="/login">Đến trang đăng nhập</Link>
          </Button>
        </div>
      </section>
    )
  }

  const onSubmit = handleSubmit((values) => {
    resetPasswordMutation.mutate(
      { email, token, newPassword: values.newPassword },
      { onSuccess: () => setResetDone(true) },
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

        <FieldGroup>
          <Controller
            name="newPassword"
            control={control}
            rules={{
              required: 'Vui lòng nhập mật khẩu mới.',
              minLength: { value: 8, message: 'Mật khẩu tối thiểu 8 ký tự.' },
              maxLength: { value: 128, message: 'Mật khẩu tối đa 128 ký tự.' },
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
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
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
