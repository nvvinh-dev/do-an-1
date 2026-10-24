import { CircleCheck } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { Link, Navigate, useLocation, useSearchParams } from 'react-router'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import PageHeader from '@/components/PageHeader'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useLogin } from '@/hooks/useLogin'
import type { LoginRequest } from '@/types/authTypes'
import { EMAIL_PATTERN } from '@/utils/emailPattern'
import { getRoleHomePath } from '@/utils/getRoleHomePath'
import { getSafeRedirectPath } from '@/utils/getSafeRedirectPath'

interface LoginLocationState {
  /** A2 chuyển sang đây sau khi đăng ký thành công (docs/frontend-screens.md mục 8). */
  registeredEmail?: string
}

/**
 * A1 — Đăng nhập (docs/frontend-screens.md mục 3). 401, 403, 429 của `POST /auth/login` hiện
 * ngay trên form, không chuyển trang (mục 1). Đăng nhập xong, hoặc mở /login khi đã đăng nhập,
 * thì về `redirect` nếu có, không thì về trang chủ của vai trò. Đăng ký (A2) xong cũng về đây
 * (mục 8): hiện thông báo thành công và điền sẵn email vừa đăng ký.
 */
export default function LoginPage() {
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const registeredEmail = (location.state as LoginLocationState | null)?.registeredEmail ?? null
  const { data: user, isPending } = useCurrentUser()
  const loginMutation = useLogin()
  const { control, handleSubmit } = useForm<LoginRequest>({
    mode: 'onTouched',
    defaultValues: { email: registeredEmail ?? '', password: '' },
  })

  const safeRedirect = getSafeRedirectPath(searchParams.get('redirect'))
  const registerPath = safeRedirect ? `/register?redirect=${encodeURIComponent(safeRedirect)}` : '/register'

  // Có token thì chờ `GET /auth/me` để chuyển trang ngay, không hiện form rồi mới đi.
  if (isPending) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Spinner className="size-6 text-muted-foreground" />
      </div>
    )
  }

  if (user) {
    return <Navigate to={safeRedirect ?? getRoleHomePath(user.roles)} replace />
  }

  const onSubmit = handleSubmit((values) => {
    loginMutation.mutate({ email: values.email.trim(), password: values.password })
  })

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-6 py-4 md:py-10">
      <PageHeader title="Đăng nhập" description="Đăng nhập để quản lý phòng trọ, hợp đồng và hóa đơn." />

      <form
        noValidate
        onSubmit={onSubmit}
        className="flex flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground md:p-6"
      >
        {registeredEmail && (
          <Alert className="border-success/40 text-success">
            <CircleCheck />
            <AlertTitle>Đăng ký thành công</AlertTitle>
            <AlertDescription className="text-success/90">Vui lòng đăng nhập để tiếp tục.</AlertDescription>
          </Alert>
        )}

        <ApiErrorAlert error={loginMutation.error} />

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

          <Controller
            name="password"
            control={control}
            rules={{ required: 'Vui lòng nhập mật khẩu.' }}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="password">
                  Mật khẩu <span aria-hidden="true">*</span>
                </FieldLabel>
                <Input
                  {...field}
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </FieldGroup>

        <Button type="submit" size="page" className="md:w-full" disabled={loginMutation.isPending}>
          {loginMutation.isPending && <Spinner />}
          Đăng nhập
        </Button>

        <div className="flex flex-col items-center gap-1 text-sm">
          <Link to="/forgot-password" className="text-primary underline-offset-4 hover:underline">
            Quên mật khẩu?
          </Link>
          <p className="text-muted-foreground">
            Chưa có tài khoản?{' '}
            <Link to={registerPath} className="text-primary underline-offset-4 hover:underline">
              Đăng ký
            </Link>
          </p>
        </div>
      </form>
    </section>
  )
}
