import { ChevronLeft, FileText } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import ImageUploader from '@/components/ImageUploader'
import PageHeader from '@/components/PageHeader'
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
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
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { useContractList } from '@/hooks/useContractList'
import { useMaintenanceRequestMutation } from '@/hooks/useMaintenanceRequestMutation'
import { reportMaintenanceRequest } from '@/services/maintenanceRequestService'
import type { ContractListItem } from '@/types/contractTypes'
import type { UploadedImage } from '@/types/fileTypes'
import { MAINTENANCE_URGENCIES, type MaintenanceUrgency } from '@/types/maintenanceRequestTypes'
import { getReportableContracts } from '@/utils/getReportableContracts'
import { getVietnamToday } from '@/utils/getVietnamToday'
import { getMaintenanceUrgencyLabel } from '@/utils/maintenanceUrgencyLabels'

// Giới hạn theo FR-136 và docs/api-design.md mục 18; server kiểm tra lại và trả `400`.
const TITLE_MAX_LENGTH = 200
const DESCRIPTION_MAX_LENGTH = 2000
const MAX_IMAGES = 5

// Người thuê thường chỉ có một hợp đồng đang ở; 100 là số dòng tối đa server trả trong một trang.
const CONTRACT_PAGE_SIZE = 100

/**
 * T10 — Báo sự cố (docs/frontend-screens.md mục 5). Chỉ cho chọn hợp đồng báo được sự cố theo
 * FR-137; không có hợp đồng nào thì không hiện form.
 */
export default function ReportMaintenanceRequestPage() {
  const contractsQuery = useContractList({ pageSize: CONTRACT_PAGE_SIZE })

  let content
  if (contractsQuery.isPending) {
    content = <ReportFormSkeleton />
  } else if (contractsQuery.isLoadingError) {
    content = <ApiErrorAlert error={contractsQuery.error} onRetry={() => void contractsQuery.refetch()} />
  } else {
    const contracts = getReportableContracts(contractsQuery.data.items, getVietnamToday())
    content = contracts.length === 0 ? <NoReportableContract /> : <ReportForm contracts={contracts} />
  }

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="-ml-3 self-start">
        <Link to="/tenant/maintenance-requests">
          <ChevronLeft />
          Sự cố
        </Link>
      </Button>
      <PageHeader
        title="Báo sự cố"
        description="Mô tả hỏng hóc trong phòng và chụp ảnh để Chủ trọ biết cần sửa gì."
      />
      {/* Lần tải lại lỗi (quay lại tab sau khi mở camera) thì giữ form và dữ liệu đã nhập. */}
      {contractsQuery.isRefetchError && (
        <ApiErrorAlert error={contractsQuery.error} onRetry={() => void contractsQuery.refetch()} />
      )}
      {content}
    </section>
  )
}

function NoReportableContract() {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <FileText />
        </EmptyMedia>
        <EmptyTitle>Chưa có phòng nào để báo sự cố</EmptyTitle>
        <EmptyDescription>
          Chỉ báo được sự cố cho phòng bạn đang thuê: hợp đồng đang hiệu lực từ ngày bắt đầu, hoặc đang thanh lý mà
          chưa qua ngày trả phòng.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild variant="outline">
          <Link to="/tenant/contracts">Xem hợp đồng</Link>
        </Button>
      </EmptyContent>
    </Empty>
  )
}

interface ReportFormValues {
  /** Chuỗi rỗng khi chưa chọn, vì ô chọn chỉ giữ chuỗi. */
  contractId: string
  title: string
  description: string
  urgency: MaintenanceUrgency
  images: UploadedImage[]
}

/**
 * Ảnh tải lên `POST /files` với `purpose = AnhSuCo` ngay khi chọn hoặc chụp; nút gửi khóa trong lúc
 * còn ảnh đang tải để không gửi thiếu `path`. Lỗi `409` (hợp đồng vừa đổi trạng thái, đã qua ngày
 * trả phòng), `422` (ảnh không hợp lệ) hiện `detail` ngay trên nút gửi, giữ nguyên dữ liệu đã nhập.
 */
function ReportForm({ contracts }: { contracts: ContractListItem[] }) {
  const navigate = useNavigate()
  const [isUploading, setIsUploading] = useState(false)
  const reportMutation = useMaintenanceRequestMutation(reportMaintenanceRequest)

  const { control, register, handleSubmit, formState } = useForm<ReportFormValues>({
    mode: 'onTouched',
    defaultValues: {
      // Có đúng một hợp đồng thì chọn sẵn.
      contractId: contracts.length === 1 ? String(contracts[0].id) : '',
      title: '',
      description: '',
      urgency: 'BinhThuong',
      images: [],
    },
  })
  const { errors } = formState

  const onSubmit = handleSubmit((values) => {
    reportMutation.mutate(
      {
        contractId: Number(values.contractId),
        title: values.title.trim(),
        description: values.description.trim(),
        urgency: values.urgency,
        imagePaths: values.images.map((image) => image.path),
      },
      {
        onSuccess: (created) => {
          toast.success('Đã gửi sự cố cho Chủ trọ')
          navigate(`/tenant/maintenance-requests/${created.id}`, { replace: true })
        },
      },
    )
  })

  const isLocked = reportMutation.isPending

  return (
    <form
      noValidate
      onSubmit={onSubmit}
      className="flex flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground md:p-6"
    >
      <FieldGroup>
        <Field data-invalid={errors.contractId !== undefined}>
          <FieldLabel htmlFor="contractId">
            Phòng <span aria-hidden="true">*</span>
          </FieldLabel>
          <NativeSelect
            id="contractId"
            className="w-full"
            disabled={isLocked}
            aria-invalid={errors.contractId !== undefined}
            {...register('contractId', { required: 'Vui lòng chọn phòng bị sự cố.' })}
          >
            <NativeSelectOption value="">Chọn phòng</NativeSelectOption>
            {contracts.map((contract) => (
              <NativeSelectOption key={contract.id} value={String(contract.id)}>
                Phòng {contract.room.code} · {contract.room.propertyName}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldError errors={[errors.contractId]} />
        </Field>

        <Field data-invalid={errors.title !== undefined}>
          <FieldLabel htmlFor="title">
            Tiêu đề <span aria-hidden="true">*</span>
          </FieldLabel>
          <Input
            id="title"
            maxLength={TITLE_MAX_LENGTH}
            placeholder="Ví dụ: Vòi sen bị rò nước"
            disabled={isLocked}
            aria-invalid={errors.title !== undefined}
            {...register('title', {
              validate: (value) => value.trim() !== '' || 'Vui lòng nhập tiêu đề.',
            })}
          />
          <FieldError errors={[errors.title]} />
        </Field>

        <Field data-invalid={errors.description !== undefined}>
          <FieldLabel htmlFor="description">
            Mô tả <span aria-hidden="true">*</span>
          </FieldLabel>
          <Textarea
            id="description"
            rows={5}
            maxLength={DESCRIPTION_MAX_LENGTH}
            placeholder="Hỏng ở đâu, từ khi nào, đang ảnh hưởng thế nào."
            disabled={isLocked}
            aria-invalid={errors.description !== undefined}
            {...register('description', {
              validate: (value) => value.trim() !== '' || 'Vui lòng mô tả sự cố.',
            })}
          />
          <FieldError errors={[errors.description]} />
        </Field>

        <Field>
          <FieldLabel htmlFor="urgency">
            Mức khẩn cấp <span aria-hidden="true">*</span>
          </FieldLabel>
          <NativeSelect id="urgency" className="w-full" disabled={isLocked} {...register('urgency')}>
            {MAINTENANCE_URGENCIES.map((urgency) => (
              <NativeSelectOption key={urgency} value={urgency}>
                {getMaintenanceUrgencyLabel(urgency)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <FieldDescription>Chỉ giúp Chủ trọ biết việc nào cần làm trước.</FieldDescription>
        </Field>

        <Controller
          name="images"
          control={control}
          render={({ field }) => (
            <FieldSet className="gap-2">
              <FieldLegend variant="label">Ảnh sự cố</FieldLegend>
              <FieldDescription>Không bắt buộc, tối đa {MAX_IMAGES} ảnh. Có thể chụp thẳng bằng điện thoại.</FieldDescription>
              <ImageUploader
                purpose="AnhSuCo"
                value={field.value}
                onChange={field.onChange}
                maxFiles={MAX_IMAGES}
                disabled={isLocked}
                onUploadingChange={setIsUploading}
              />
            </FieldSet>
          )}
        />
      </FieldGroup>

      <ApiErrorAlert error={reportMutation.error} />

      <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
        <Button asChild variant="outline" size="page">
          <Link to="/tenant/maintenance-requests">Hủy</Link>
        </Button>
        <Button type="submit" size="page" disabled={isLocked || isUploading}>
          {isLocked && <Spinner />}
          Gửi sự cố
        </Button>
      </div>
    </form>
  )
}

function ReportFormSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-4 rounded-xl border p-4 md:p-6">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  )
}
