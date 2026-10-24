import { Controller, useForm } from 'react-hook-form'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useRegister } from '@/hooks/useRegister'
import type { RegisterRequest } from '@/types/authTypes'
import { EMAIL_PATTERN } from '@/utils/emailPattern'
import { getRoleHomePath } from '@/utils/getRoleHomePath'
import { getSafeRedirectPath } from '@/utils/getSafeRedirectPath'
import { PHONE_PATTERN } from '@/utils/phonePattern'
import { validatePassword } from '@/utils/validatePassword'

interface RegisterFormValues extends RegisterRequest {
  confirmPassword: string
}

/**
 * A2 — Đăng ký (docs/frontend-screens.md mục 3). `POST /auth/register` không trả token
 * (api-design mục 2): tài khoản mới nhận vai trò Tenant nhưng chưa đăng nhập, nên đăng ký xong
 * chuyển về `/login` kèm thông báo thành công và điền sẵn email (mục 8, giống đặt lại mật khẩu),
 * giữ `redirect` nếu có. Email trùng trả `409`, hiện ngay trên form qua `ApiErrorAlert`, giữ
 * nguyên dữ liệu đã nhập (mục 1).
 */
export default function RegisterPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { data: user, isPending } = useCurrentUser()
  const registerMutation = useRegister()

  const { control, handleSubmit, getValues, trigger } = useForm<RegisterFormValues>({
    mode: 'onTouched',
    defaultValues: { email: '', password: '', confirmPassword: '', fullName: '', phoneNumber: '' },
  })

  const safeRedirect = getSafeRedirectPath(searchParams.get('redirect'))
  const loginPath = safeRedirect ? `/login?redirect=${encodeURIComponent(safeRedirect)}` : '/login'

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

  const onSubmit = handleSubmit((values) => {
    const phoneNumber = values.phoneNumber?.trim()

    registerMutation.mutate(
      {
        email: values.email.trim(),
        password: values.password,
        fullName: values.fullName.trim(),
        phoneNumber: phoneNumber ? phoneNumber : undefined,
      },
      {
        onSuccess: (createdUser) =>
          navigate(loginPath, { replace: true, state: { registeredEmail: createdUser.email } }),
      },
    )
  })

  return (
    <section className="mx-auto flex w-full max-w-md flex-col gap-6 py-4 md:py-10">
      <PageHeader title="Đăng ký" description="Đăng ký để quản lý phòng trọ, hợp đồng và hóa đơn." />

      <form
        noValidate
        onSubmit={onSubmit}
        className="flex flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground md:p-6"
      >
        <ApiErrorAlert error={registerMutation.error} />

        <FieldGroup>
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
            name="email"
            control={control}
            rules={{
              required: 'Vui lòng nhập email.',
              pattern: { value: EMAIL_PATTERN, message: 'Email chưa đúng định dạng.' },
              maxLength: { value: 256, message: 'Email tối đa 256 ký tự.' },
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
            name="phoneNumber"
            control={control}
            rules={{
              validate: (value) => {
                const trimmed = value?.trim() ?? ''
                return (
                  trimmed === '' || PHONE_PATTERN.test(trimmed) || 'Số điện thoại gồm 10–11 chữ số, bắt đầu bằng 0.'
                )
              },
            }}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="phoneNumber">Số điện thoại</FieldLabel>
                <Input
                  {...field}
                  id="phoneNumber"
                  type="tel"
                  autoComplete="tel"
                  inputMode="tel"
                  aria-invalid={fieldState.invalid}
                />
                {fieldState.invalid ? (
                  <FieldError errors={[fieldState.error]} />
                ) : (
                  <FieldDescription>Không bắt buộc, dùng để xác thực khi đăng ký làm Chủ trọ.</FieldDescription>
                )}
              </Field>
            )}
          />

          <Controller
            name="password"
            control={control}
            rules={{
              required: 'Vui lòng nhập mật khẩu.',
              maxLength: { value: 128, message: 'Mật khẩu tối đa 128 ký tự.' },
              validate: (value) => validatePassword(value) ?? true,
            }}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="password">
                  Mật khẩu <span aria-hidden="true">*</span>
                </FieldLabel>
                <Input
                  {...field}
                  id="password"
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
              validate: (value) => value === getValues('password') || 'Mật khẩu nhập lại không khớp.',
            }}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="confirmPassword">
                  Nhập lại mật khẩu <span aria-hidden="true">*</span>
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

        <Button type="submit" size="page" className="md:w-full" disabled={registerMutation.isPending}>
          {registerMutation.isPending && <Spinner />}
          Đăng ký
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Đã có tài khoản?{' '}
          <Link to={loginPath} className="text-primary underline-offset-4 hover:underline">
            Đăng nhập
          </Link>
        </p>
      </form>
    </section>
  )
}
