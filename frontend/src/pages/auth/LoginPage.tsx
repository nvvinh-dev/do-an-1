import { useForm } from 'react-hook-form'
import { Link, Navigate, useSearchParams } from 'react-router'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useLogin } from '@/hooks/useLogin'
import type { LoginRequest } from '@/types/authTypes'
import { getRoleHomePath } from '@/utils/getRoleHomePath'
import { getSafeRedirectPath } from '@/utils/getSafeRedirectPath'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * A1 — Đăng nhập (docs/frontend-screens.md mục 3). 401, 403, 429 của `POST /auth/login` hiện
 * ngay trên form, không chuyển trang (mục 1). Đăng nhập xong, hoặc mở /login khi đã đăng nhập,
 * thì về `redirect` nếu có, không thì về trang chủ của vai trò.
 */
export default function LoginPage() {
  const [searchParams] = useSearchParams()
  const { data: user } = useCurrentUser()
  const loginMutation = useLogin()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginRequest>({ mode: 'onTouched', defaultValues: { email: '', password: '' } })

  if (user) {
    const destination = getSafeRedirectPath(searchParams.get('redirect')) ?? getRoleHomePath(user.roles)
    return <Navigate to={destination} replace />
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
        <ApiErrorAlert error={loginMutation.error} />

        <div className="flex flex-col gap-2">
          <Label htmlFor="email">
            Email <span aria-hidden="true">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            aria-invalid={errors.email ? true : undefined}
            aria-describedby={errors.email ? 'email-error' : undefined}
            {...register('email', {
              required: 'Vui lòng nhập email.',
              pattern: { value: EMAIL_PATTERN, message: 'Email chưa đúng định dạng.' },
            })}
          />
          {errors.email && (
            <p id="email-error" className="text-sm text-destructive">
              {errors.email.message}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="password">
            Mật khẩu <span aria-hidden="true">*</span>
          </Label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? 'password-error' : undefined}
            {...register('password', { required: 'Vui lòng nhập mật khẩu.' })}
          />
          {errors.password && (
            <p id="password-error" className="text-sm text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>

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
            <Link to="/register" className="text-primary underline-offset-4 hover:underline">
              Đăng ký
            </Link>
          </p>
        </div>
      </form>
    </section>
  )
}
