import { ChevronLeft, CircleCheck, CircleX, ExternalLink, FileText, ImageOff, Phone } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Link, useLocation, useParams } from 'react-router'
import { toast } from 'sonner'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import ConfirmDialog from '@/components/ConfirmDialog'
import PageHeader from '@/components/PageHeader'
import StatusBadge from '@/components/StatusBadge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { useApproveLandlordApplication } from '@/hooks/useApproveLandlordApplication'
import { useLandlordApplication } from '@/hooks/useLandlordApplication'
import { useRejectLandlordApplication } from '@/hooks/useRejectLandlordApplication'
import { isNotFoundError } from '@/lib/apiError'
import NotFoundPage from '@/pages/public/NotFoundPage'
import type { LandlordApplicationDetail } from '@/types/landlordApplicationTypes'
import { formatDate } from '@/utils/formatDate'

/** `state` mà liên kết ở trang danh sách gửi kèm: query lọc và trang đang xem, để nút quay lại giữ nguyên. */
interface ReviewLocationState {
  listSearch?: string
}

/**
 * AD2 — Duyệt hồ sơ Chủ trọ (docs/frontend-screens.md mục 7). Hiện thông tin người nộp, số CCCD
 * và ba ảnh giấy tờ (FR-10). Hồ sơ chờ duyệt thì Admin gọi số điện thoại của người nộp rồi nhập lại
 * đúng số đã gọi để duyệt, hoặc từ chối kèm lý do (FR-08). Duyệt, từ chối xong thì ở lại trang,
 * hiện `toast` và tải lại dữ liệu.
 */
export default function LandlordApplicationReviewPage() {
  const { id } = useParams()
  const location = useLocation()
  // Mở thẳng bằng đường dẫn thì không có `state`: quay về danh sách không lọc.
  const listSearch = (location.state as ReviewLocationState | null)?.listSearch ?? ''
  // Id không phải số thì server trả 404 như hồ sơ không tồn tại.
  const applicationId = Number(id)
  const applicationQuery = useLandlordApplication(applicationId)

  if (isNotFoundError(applicationQuery.error)) {
    return <NotFoundPage />
  }

  return (
    <section className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="-ml-3 self-start">
        <Link to={{ pathname: '/admin/landlord-applications', search: listSearch }}>
          <ChevronLeft />
          Hồ sơ Chủ trọ
        </Link>
      </Button>

      {applicationQuery.isPending ? (
        <ReviewSkeleton />
      ) : applicationQuery.isLoadingError ? (
        <ApiErrorAlert error={applicationQuery.error} onRetry={() => void applicationQuery.refetch()} />
      ) : (
        <>
          {/* Lần tải lại lỗi (quay lại tab, tải lại sau `409`) thì giữ nội dung cũ và số đã nhập, chỉ báo lỗi kèm nút thử lại. */}
          {applicationQuery.isRefetchError && (
            <ApiErrorAlert error={applicationQuery.error} onRetry={() => void applicationQuery.refetch()} />
          )}
          <ReviewContent
            application={applicationQuery.data}
            onReloadDocuments={() => void applicationQuery.refetch()}
          />
        </>
      )}
    </section>
  )
}

interface ReviewContentProps {
  application: LandlordApplicationDetail
  /** Lấy lại chi tiết hồ sơ để có URL xem giấy tờ mới khi URL cũ đã hết hạn. */
  onReloadDocuments: () => void
}

function ReviewContent({ application, onReloadDocuments }: ReviewContentProps) {
  const [rejectOpen, setRejectOpen] = useState(false)

  return (
    <>
      <PageHeader title={application.applicantFullName} description={application.applicantEmail} />

      <ReviewStatusNotice application={application} />

      <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground shadow-sm md:p-6">
        <h2 className="text-lg font-medium">Thông tin hồ sơ</h2>
        <dl className="grid gap-4 text-sm md:grid-cols-[12rem_1fr]">
          <dt className="text-muted-foreground">Trạng thái</dt>
          <dd>
            <StatusBadge kind="landlordApplication" status={application.status} />
          </dd>

          <dt className="text-muted-foreground">Họ tên</dt>
          <dd className="wrap-anywhere">{application.applicantFullName}</dd>

          <dt className="text-muted-foreground">Email</dt>
          <dd className="wrap-anywhere">{application.applicantEmail}</dd>

          <dt className="text-muted-foreground">Số điện thoại</dt>
          <dd>
            {application.applicantPhoneNumber ? (
              <a
                href={`tel:${application.applicantPhoneNumber}`}
                className="inline-flex items-center gap-1 text-primary underline-offset-4 hover:underline"
              >
                <Phone className="size-4" />
                {application.applicantPhoneNumber}
              </a>
            ) : (
              <span className="text-muted-foreground">Chưa có số điện thoại</span>
            )}
          </dd>

          <dt className="text-muted-foreground">Số CCCD</dt>
          <dd className="tabular-nums">{application.idCardNumber}</dd>

          <dt className="text-muted-foreground">Ngày nộp</dt>
          <dd>{formatDate(application.submittedAt)}</dd>

          {application.reviewedAt && (
            <>
              <dt className="text-muted-foreground">Ngày xử lý</dt>
              <dd>{formatDate(application.reviewedAt)}</dd>
            </>
          )}
        </dl>
      </div>

      <DocumentsSection application={application} onReloadDocuments={onReloadDocuments} />

      {application.status === 'ChoDuyet' && (
        <ReviewActions application={application} onReject={() => setRejectOpen(true)} />
      )}

      <RejectDialog application={application} open={rejectOpen} onOpenChange={setRejectOpen} />
    </>
  )
}

/** Khối đầu trang nói rõ hồ sơ đã được xử lý ra sao; hồ sơ chờ duyệt thì phần xử lý nằm cuối trang. */
function ReviewStatusNotice({ application }: { application: LandlordApplicationDetail }) {
  switch (application.status) {
    case 'DaDuyet':
      return (
        <Alert className="border-success/40">
          <CircleCheck />
          <AlertTitle>Hồ sơ đã được duyệt</AlertTitle>
          <AlertDescription>
            Tài khoản đã được cấp quyền Chủ trọ. Người nộp cần đăng nhập lại để dùng quyền mới.
          </AlertDescription>
        </Alert>
      )

    case 'TuChoi':
      return (
        <Alert>
          <CircleX />
          <AlertTitle>Hồ sơ bị từ chối</AlertTitle>
          {application.rejectReason && (
            <AlertDescription className="whitespace-pre-line wrap-anywhere">
              Lý do: {application.rejectReason}
            </AlertDescription>
          )}
        </Alert>
      )

    case 'DaThuHoi':
      return (
        <Alert>
          <CircleX />
          <AlertTitle>Quyền Chủ trọ của hồ sơ này đã bị thu hồi</AlertTitle>
        </Alert>
      )

    // `ChoDuyet`: phần xử lý ở cuối trang.
    default:
      return null
  }
}

interface DocumentsSectionProps {
  application: LandlordApplicationDetail
  onReloadDocuments: () => void
}

/**
 * Ba giấy tờ theo FR-06. URL có chữ ký, hết hạn sau 15 phút: chỉ gắn vào thẻ `img` và liên kết,
 * không lưu lại (docs/frontend-screens.md mục 1). Quay lại tab thì TanStack Query tự lấy URL mới.
 */
function DocumentsSection({ application, onReloadDocuments }: DocumentsSectionProps) {
  const documents = [
    { label: 'Mặt trước CCCD', url: application.idCardFrontUrl },
    { label: 'Mặt sau CCCD', url: application.idCardBackUrl },
    { label: 'Giấy tờ quyền sở hữu hoặc quản lý nhà trọ', url: application.ownershipDocumentUrl },
  ]

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground shadow-sm md:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-medium">Giấy tờ</h2>
        <p className="text-sm text-muted-foreground">
          Đối chiếu số CCCD và họ tên trên giấy tờ với thông tin hồ sơ. Bấm vào ảnh để xem cỡ lớn.
        </p>
      </div>
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {/* Tên giấy tờ đặt dưới ảnh: tên dài xuống dòng thì ba ảnh vẫn thẳng hàng. */}
        {documents.map((documentItem) => (
          <li key={documentItem.label} className="flex min-w-0 flex-col gap-2">
            {/* `key` theo URL: lấy được URL mới thì xóa trạng thái lỗi của URL cũ. */}
            <DocumentPreview
              key={documentItem.url}
              url={documentItem.url}
              alt={`${documentItem.label} của ${application.applicantFullName}`}
              onReload={onReloadDocuments}
            />
            <span className="text-sm font-medium">{documentItem.label}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

interface DocumentPreviewProps {
  url: string
  alt: string
  onReload: () => void
}

/**
 * Ảnh giấy tờ, bấm để mở cỡ gốc ở tab mới. API nhận cả PDF cho loại file riêng tư (API mục 14) nên
 * file PDF hiện thành liên kết mở file. Không gửi `Referer` kèm URL có chữ ký.
 */
function DocumentPreview({ url, alt, onReload }: DocumentPreviewProps) {
  const [failed, setFailed] = useState(false)
  const frameClass = 'flex aspect-[4/3] w-full flex-col items-center justify-center gap-2 rounded-lg border bg-muted p-4'

  if (isPdfUrl(url)) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className={`${frameClass} text-sm text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50`}
      >
        <FileText className="size-8" />
        <span>Mở file PDF</span>
      </a>
    )
  }

  if (failed) {
    return (
      <div className={`${frameClass} text-center text-sm text-muted-foreground`}>
        <ImageOff className="size-6" />
        <p>Không hiện được ảnh. Đường dẫn xem ảnh chỉ dùng được 15 phút, có thể đã hết hạn.</p>
        <Button type="button" variant="outline" size="sm" onClick={onReload}>
          Tải lại ảnh
        </Button>
      </div>
    )
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <img
        src={url}
        alt={alt}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className="aspect-[4/3] w-full rounded-lg border bg-muted object-contain"
      />
      <span className="absolute top-2 right-2 rounded-md bg-background/90 p-1 text-foreground shadow-sm">
        <ExternalLink className="size-4" aria-hidden="true" />
      </span>
    </a>
  )
}

// URL có chữ ký giữ nguyên đường dẫn file (phần mở rộng do server đặt theo định dạng thật), token nằm ở query.
function isPdfUrl(url: string): boolean {
  try {
    return new URL(url).pathname.toLowerCase().endsWith('.pdf')
  } catch {
    return false
  }
}

interface ReviewActionsProps {
  application: LandlordApplicationDetail
  onReject: () => void
}

/** Duyệt và từ chối, chỉ hiện khi hồ sơ đang chờ duyệt. */
function ReviewActions({ application, onReject }: ReviewActionsProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground shadow-sm md:p-6">
      <h2 className="text-lg font-medium">Xử lý hồ sơ</h2>

      {application.applicantPhoneNumber ? (
        <ApproveForm application={application} phoneNumber={application.applicantPhoneNumber} />
      ) : (
        <Alert>
          <AlertTitle>Người nộp chưa có số điện thoại</AlertTitle>
          <AlertDescription>
            Chưa duyệt được vì không có số để gọi xác minh. Từ chối hồ sơ nếu cần người nộp bổ sung.
          </AlertDescription>
        </Alert>
      )}

      <Separator />

      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <p className="text-sm text-muted-foreground">
          Giấy tờ không khớp hoặc không xác minh được thì từ chối, người nộp được nộp lại hồ sơ mới.
        </p>
        <Button type="button" variant="destructive" size="page" onClick={onReject}>
          <CircleX />
          Từ chối hồ sơ
        </Button>
      </div>
    </div>
  )
}

interface ApproveFormValues {
  verifiedPhoneNumber: string
}

// Người dùng hay gõ cách theo nhóm số; bỏ khoảng trắng trước khi so và gửi.
const normalizePhoneNumber = (value: string) => value.replace(/\s+/g, '')

interface ApproveFormProps {
  application: LandlordApplicationDetail
  /** Số hiện tại của người nộp, theo lần tải gần nhất. */
  phoneNumber: string
}

/**
 * Admin gọi số của người nộp rồi nhập lại đúng số đã gọi (BR-01). Số nhập khác số đang hiện thì
 * báo ngay dưới ô, không gửi. Người nộp đổi số sau khi trang tải thì server trả `409`: hiện `detail`
 * trên nút, trang tải lại số mới, số đã nhập vẫn giữ để Admin gọi xác minh lại.
 */
function ApproveForm({ application, phoneNumber }: ApproveFormProps) {
  const approveMutation = useApproveLandlordApplication(application.id)
  const { control, handleSubmit } = useForm<ApproveFormValues>({
    mode: 'onTouched',
    defaultValues: { verifiedPhoneNumber: '' },
  })

  const onSubmit = handleSubmit((values) => {
    approveMutation.mutate(
      { verifiedPhoneNumber: normalizePhoneNumber(values.verifiedPhoneNumber) },
      { onSuccess: () => toast.success('Đã duyệt hồ sơ') },
    )
  })

  return (
    <form noValidate onSubmit={onSubmit} className="flex flex-col gap-4">
      <Controller
        name="verifiedPhoneNumber"
        control={control}
        rules={{
          validate: (value) => {
            const normalized = normalizePhoneNumber(value)
            if (normalized === '') {
              return 'Vui lòng nhập số điện thoại đã gọi xác minh.'
            }
            return (
              normalized === normalizePhoneNumber(phoneNumber) ||
              'Số vừa nhập khác số điện thoại hiện tại của người nộp. Kiểm tra lại số đã gọi.'
            )
          },
        }}
        render={({ field, fieldState }) => (
          <Field data-invalid={fieldState.invalid} className="md:max-w-sm">
            <FieldLabel htmlFor="verifiedPhoneNumber">
              Số điện thoại đã gọi xác minh <span aria-hidden="true">*</span>
            </FieldLabel>
            <Input
              {...field}
              id="verifiedPhoneNumber"
              type="tel"
              inputMode="tel"
              autoComplete="off"
              disabled={approveMutation.isPending}
              aria-invalid={fieldState.invalid}
            />
            {fieldState.invalid ? (
              <FieldError errors={[fieldState.error]} />
            ) : (
              <FieldDescription>
                Gọi số {phoneNumber} để xác minh người nộp, rồi nhập lại đúng số đã gọi. Duyệt xong, tài khoản
                được cấp quyền Chủ trọ.
              </FieldDescription>
            )}
          </Field>
        )}
      />

      <ApiErrorAlert error={approveMutation.error} />

      <Button type="submit" size="page" className="md:self-start" disabled={approveMutation.isPending}>
        {approveMutation.isPending ? <Spinner /> : <CircleCheck />}
        Duyệt hồ sơ
      </Button>
    </form>
  )
}

interface RejectDialogProps {
  application: LandlordApplicationDetail
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * Từ chối bắt buộc lý do; người nộp đọc được lý do trong thông báo và ở T2. Hồ sơ vừa được xử lý ở
 * tab khác thì server trả `409`, dữ liệu tải lại: hộp thoại nằm ngoài khối **Xử lý hồ sơ** nên không
 * bị gỡ theo khối khi hồ sơ không còn chờ duyệt, vẫn mở để hiện `detail`.
 */
function RejectDialog({ application, open, onOpenChange }: RejectDialogProps) {
  const rejectMutation = useRejectLandlordApplication(application.id)

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Từ chối hồ sơ Chủ trọ"
      description={`${application.applicantFullName} nhận thông báo kèm lý do và có thể nộp lại hồ sơ mới. Hồ sơ đã từ chối không duyệt lại được.`}
      confirmLabel="Từ chối hồ sơ"
      destructive
      reason={{
        label: 'Lý do từ chối',
        required: true,
        placeholder: 'Ví dụ: Ảnh mặt sau CCCD bị mờ, không đọc được số.',
      }}
      isPending={rejectMutation.isPending}
      error={rejectMutation.error}
      onConfirm={(reason) =>
        rejectMutation.mutate(
          { reason },
          {
            onSuccess: () => {
              onOpenChange(false)
              toast.success('Đã từ chối hồ sơ')
            },
          },
        )
      }
    />
  )
}

function ReviewSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-64 max-w-full" />
        <Skeleton className="h-4 w-48 max-w-full" />
      </div>
      <Skeleton className="h-64 w-full" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }, (_, index) => (
          <Skeleton key={index} className="aspect-[4/3] w-full" />
        ))}
      </div>
    </div>
  )
}
