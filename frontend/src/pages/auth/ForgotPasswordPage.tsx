import { useState } from 'react'
import { MailCheck } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { Link, Navigate } from 'react-router'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import PageHeader from '@/components/PageHeader'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useForgotPassword } from '@/hooks/useForgotPassword'
import type { ForgotPasswordRequest } from '@/types/authTypes'
import { EMAIL_PATTERN } from '@/utils/emailPattern'
import { getRoleHomePath } from '@/utils/getRoleHomePath'

/**
 * A3 — Quên mật khẩu (docs/frontend-screens.md mục 3). `POST /auth/forgot-password` luôn trả
 * `200` với cùng một thông báo dù email có tồn tại hay không (security-design mục 6, mục 8 quy
 * tắc 18): gửi xong là hiện thông báo thành công, không suy luận email có tồn tại trong hệ thống.
 */
export default function ForgotPasswordPage() {
  const { data: user, isPending } = useCurrentUser()
  const forgotPasswordMutation = useForgotPassword()
  const [submittedEmail, setSubmittedEmail] = useState<string | null>(null)

  const { control, handleSubmit } = useForm<ForgotPasswordRequest>({
    mode: 'onTouched',
    defaultValues: { email: '' },
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

  if (submittedEmail) {
    return (
      <section className="mx-auto flex w-full max-w-md flex-col gap-6 py-4 md:py-10">
        <PageHeader title="Quên mật khẩu" description="Lấy lại quyền truy cập vào tài khoản của bạn." />

        <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground md:p-6">
          <Alert className="border-success/40 text-success">
            <MailCheck />
            <AlertTitle>Đã gửi yêu cầu</AlertTitle>
            <AlertDescription className="text-success/90 wrap-anywhere">
              Nếu email {submittedEmail} tồn tại trong hệ thống, hướng dẫn đặt lại mật khẩu đã được gửi tới email đó.
            </AlertDescription>
          </Alert>

          <Button asChild size="page" className="md:w-full">
            <Link to="/login">Về trang đăng nhập</Link>
          </Button>
        </div>
      </section>
    )
  }

  const onSubmit = handleSubmit((values) => {
    const email = values.email.trim()
    forgotPasswordMutation.mutate({ email }, { onSuccess: () => setSubmittedEmail(email) })
  })

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-6 py-4 md:py-10">
      <PageHeader title="Quên mật khẩu" description="Nhập email đã đăng ký để nhận hướng dẫn đặt lại mật khẩu." />

      <form
        noValidate
        onSubmit={onSubmit}
        className="flex flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground md:p-6"
      >
        <ApiErrorAlert error={forgotPasswordMutation.error} />

        <FieldGroup>
          <Controller
            name="email"
            control={control}
            rules={{
              required: 'Vui lòng nhập email.',
              pattern: { value: EMAIL_PATTERN, message: 'Email chưa đúng định dạng.' },
            }}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="email">
                  Email <span aria-hidden="true">*</span>
                </FieldLabel>
                <Input
                  {...field}
                  id="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </FieldGroup>

        <Button type="submit" size="page" className="md:w-full" disabled={forgotPasswordMutation.isPending}>
          {forgotPasswordMutation.isPending && <Spinner />}
          Gửi yêu cầu
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          <Link to="/login" className="text-primary underline-offset-4 hover:underline">
            Về trang đăng nhập
          </Link>
        </p>
      </form>
    </section>
  )
}
