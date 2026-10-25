import { CircleCheck } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Link } from 'react-router'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import ImageUploader from '@/components/ImageUploader'
import PageHeader from '@/components/PageHeader'
import StatusBadge from '@/components/StatusBadge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { useCurrentUser } from '@/hooks/useCurrentUser'
import { useLogout } from '@/hooks/useLogout'
import { useMyLandlordApplication } from '@/hooks/useMyLandlordApplication'
import { useSubmitLandlordApplication } from '@/hooks/useSubmitLandlordApplication'
import type { UploadedImage } from '@/types/fileTypes'
import type { LandlordApplication } from '@/types/landlordApplicationTypes'
import { formatDate } from '@/utils/formatDate'
import { ID_CARD_PATTERN } from '@/utils/idCardPattern'

/**
 * T2 — Đăng ký làm Chủ trọ (docs/frontend-screens.md mục 5). Hiện theo hồ sơ mới nhất của tài
 * khoản: chưa nộp (`GET /landlord-applications/me` trả `404`) → form; chờ duyệt → trạng thái; bị
 * từ chối → lý do và nút nộp lại. Hồ sơ đã duyệt chỉ còn thấy ở đây khi người dùng chưa đăng nhập
 * lại, vì token cũ vẫn mang vai trò Tenant (api-design mục 3).
 */
export default function LandlordApplicationPage() {
  const { data: application, isPending, error, refetch } = useMyLandlordApplication()
  const [isResubmitting, setIsResubmitting] = useState(false)
  const [justSubmitted, setJustSubmitted] = useState(false)

  let content
  if (isPending) {
    content = <ApplicationSkeleton />
  } else if (error) {
    content = <ApiErrorAlert error={error} onRetry={() => void refetch()} />
  } else if (application === null || (application.status === 'TuChoi' && isResubmitting)) {
    content = (
      <ApplicationForm
        previousRejectReason={application?.rejectReason ?? null}
        onCancel={application ? () => setIsResubmitting(false) : undefined}
        onSubmitted={() => {
          setIsResubmitting(false)
          setJustSubmitted(true)
        }}
      />
    )
  } else {
    content = (
      <ApplicationStatus
        application={application}
        justSubmitted={justSubmitted}
        onResubmit={() => {
          setJustSubmitted(false)
          setIsResubmitting(true)
        }}
      />
    )
  }

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeader
        title="Đăng ký làm Chủ trọ"
        description="Nộp số CCCD và ảnh giấy tờ để Admin xét cấp quyền Chủ trọ."
      />
      {content}
    </section>
  )
}

function ApplicationSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải hồ sơ" className="flex flex-col gap-4 rounded-xl border p-4 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-5 w-20" />
      </div>
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  )
}

interface ApplicationStatusProps {
  application: LandlordApplication
  justSubmitted: boolean
  onResubmit: () => void
}

function ApplicationStatus({ application, justSubmitted, onResubmit }: ApplicationStatusProps) {
  const logout = useLogout()
  const { status, submittedAt, reviewedAt, rejectReason } = application

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground md:p-6">
      {justSubmitted && status === 'ChoDuyet' && (
        <Alert className="border-success/40 text-success">
          <CircleCheck />
          <AlertTitle>Đã nộp hồ sơ</AlertTitle>
        </Alert>
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-medium">Hồ sơ của bạn</h2>
        <StatusBadge kind="landlordApplication" status={status} />
      </div>

      <dl className="grid gap-3 text-sm sm:grid-cols-2">
        <div className="flex flex-col gap-0.5">
          <dt className="text-muted-foreground">Ngày nộp</dt>
          <dd>{formatDate(submittedAt)}</dd>
        </div>
        {reviewedAt && (
          <div className="flex flex-col gap-0.5">
            <dt className="text-muted-foreground">Ngày xử lý</dt>
            <dd>{formatDate(reviewedAt)}</dd>
          </div>
        )}
        {status === 'TuChoi' && rejectReason && (
          <div className="flex flex-col gap-0.5 sm:col-span-2">
            <dt className="text-muted-foreground">Lý do từ chối</dt>
            <dd className="whitespace-pre-line wrap-anywhere">{rejectReason}</dd>
          </div>
        )}
      </dl>

      {status === 'ChoDuyet' && (
        <p className="text-sm text-muted-foreground">
          Admin sẽ gọi vào số điện thoại của tài khoản để xác minh trước khi duyệt. Kết quả được gửi qua thông báo.
        </p>
      )}

      {status === 'TuChoi' && (
        <>
          <p className="text-sm text-muted-foreground">Bổ sung giấy tờ theo lý do trên rồi nộp lại hồ sơ mới.</p>
          <Button type="button" size="page" className="md:self-start" onClick={onResubmit}>
            Nộp lại hồ sơ
          </Button>
        </>
      )}

      {status === 'DaDuyet' && (
        <>
          <p className="text-sm text-muted-foreground">
            Bạn đã được cấp quyền Chủ trọ. Đăng nhập lại để bắt đầu quản lý khu trọ và đăng tin cho thuê.
          </p>
          <Button type="button" size="page" className="md:self-start" onClick={logout}>
            Đăng nhập lại
          </Button>
        </>
      )}
    </div>
  )
}

type DocumentFieldName = 'idCardFront' | 'idCardBack' | 'ownershipDocument'

interface ApplicationFormValues extends Record<DocumentFieldName, UploadedImage[]> {
  idCardNumber: string
}

// Ba ảnh giấy tờ theo FR-06; mỗi ô nhận một ảnh vì API nhận đúng một `path` cho mỗi loại.
const DOCUMENT_FIELDS: { name: DocumentFieldName; label: string; description?: string; requiredMessage: string }[] = [
  {
    name: 'idCardFront',
    label: 'Ảnh mặt trước CCCD',
    requiredMessage: 'Vui lòng tải ảnh mặt trước CCCD.',
  },
  {
    name: 'idCardBack',
    label: 'Ảnh mặt sau CCCD',
    requiredMessage: 'Vui lòng tải ảnh mặt sau CCCD.',
  },
  {
    name: 'ownershipDocument',
    label: 'Ảnh giấy tờ quyền sở hữu hoặc quản lý nhà trọ',
    description: 'Sổ đỏ, hợp đồng thuê lại hoặc giấy phép kinh doanh nhà trọ.',
    requiredMessage: 'Vui lòng tải ảnh giấy tờ quyền sở hữu hoặc quản lý nhà trọ.',
  },
]

const NOT_UPLOADING: Record<DocumentFieldName, boolean> = {
  idCardFront: false,
  idCardBack: false,
  ownershipDocument: false,
}

// Người dùng hay gõ cách theo nhóm số như in trên thẻ; bỏ khoảng trắng trước khi kiểm tra và gửi.
const normalizeIdCardNumber = (value: string) => value.replace(/\s+/g, '')

interface ApplicationFormProps {
  /** Lý do hồ sơ trước bị từ chối, hiện ở đầu form khi nộp lại. */
  previousRejectReason: string | null
  /** Chỉ có khi nộp lại: quay về xem hồ sơ bị từ chối. */
  onCancel?: () => void
  onSubmitted: () => void
}

/**
 * Ảnh tải lên `POST /files` với `purpose = GiayToNhanThan` ngay khi chọn; response không có URL
 * xem lại (FR-10) nên `ImageUploader` xem trước bằng file trên máy. Nút nộp khóa trong lúc còn ảnh
 * đang tải, để không gửi thiếu `path`. Lỗi `409`, `422` (chưa có số điện thoại, còn hợp đồng hay
 * yêu cầu thuê đang mở, giấy tờ không hợp lệ) hiện `detail` ngay trên nút nộp, giữ nguyên dữ liệu.
 */
function ApplicationForm({ previousRejectReason, onCancel, onSubmitted }: ApplicationFormProps) {
  const { data: user } = useCurrentUser()
  const submitMutation = useSubmitLandlordApplication()
  const [uploading, setUploading] = useState(NOT_UPLOADING)
  const isUploading = Object.values(uploading).some(Boolean)

  const { control, handleSubmit } = useForm<ApplicationFormValues>({
    mode: 'onTouched',
    defaultValues: { idCardNumber: '', idCardFront: [], idCardBack: [], ownershipDocument: [] },
  })

  const onSubmit = handleSubmit((values) => {
    submitMutation.mutate(
      {
        idCardNumber: normalizeIdCardNumber(values.idCardNumber),
        idCardFrontPath: values.idCardFront[0].path,
        idCardBackPath: values.idCardBack[0].path,
        ownershipDocumentPath: values.ownershipDocument[0].path,
      },
      { onSuccess: onSubmitted },
    )
  })

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      className="flex flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground md:p-6"
    >
      {previousRejectReason && (
        <Alert>
          <AlertTitle>Hồ sơ trước bị từ chối</AlertTitle>
          <AlertDescription className="whitespace-pre-line wrap-anywhere">{previousRejectReason}</AlertDescription>
        </Alert>
      )}

      {user && !user.phoneNumber && (
        <Alert>
          <AlertTitle>Tài khoản chưa có số điện thoại</AlertTitle>
          <AlertDescription>
            <p>
              Admin cần gọi số này để xác minh trước khi duyệt. Thêm số ở trang{' '}
              <Link to="/account" className="text-primary underline underline-offset-4">
                Tài khoản
              </Link>{' '}
              rồi quay lại nộp hồ sơ.
            </p>
          </AlertDescription>
        </Alert>
      )}

      <FieldGroup>
        <Controller
          name="idCardNumber"
          control={control}
          rules={{
            validate: (value) => {
              const normalized = normalizeIdCardNumber(value)
              if (normalized === '') {
                return 'Vui lòng nhập số CCCD.'
              }
              return ID_CARD_PATTERN.test(normalized) || 'Số CCCD gồm đúng 12 chữ số.'
            },
          }}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="idCardNumber">
                Số CCCD <span aria-hidden="true">*</span>
              </FieldLabel>
              <Input
                {...field}
                id="idCardNumber"
                inputMode="numeric"
                autoComplete="off"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : (
                <FieldDescription>12 chữ số in trên thẻ căn cước hoặc CCCD gắn chip.</FieldDescription>
              )}
            </Field>
          )}
        />

        {DOCUMENT_FIELDS.map((document) => (
          <Controller
            key={document.name}
            name={document.name}
            control={control}
            rules={{ validate: (images) => images.length > 0 || document.requiredMessage }}
            render={({ field, fieldState }) => (
              <FieldSet className="gap-2">
                <FieldLegend variant="label">
                  {document.label} <span aria-hidden="true">*</span>
                </FieldLegend>
                {document.description && <FieldDescription>{document.description}</FieldDescription>}
                <ImageUploader
                  purpose="GiayToNhanThan"
                  value={field.value}
                  onChange={field.onChange}
                  imageLabel={document.label}
                  disabled={submitMutation.isPending}
                  onUploadingChange={(next) => setUploading((current) => ({ ...current, [document.name]: next }))}
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </FieldSet>
            )}
          />
        ))}
      </FieldGroup>

      <ApiErrorAlert error={submitMutation.error} />

      <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
        {onCancel && (
          <Button type="button" variant="outline" size="page" disabled={submitMutation.isPending} onClick={onCancel}>
            Hủy
          </Button>
        )}
        <Button type="submit" size="page" disabled={submitMutation.isPending || isUploading}>
          {submitMutation.isPending && <Spinner />}
          Nộp hồ sơ
        </Button>
      </div>
    </form>
  )
}
