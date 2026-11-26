import { useQueryClient } from '@tanstack/react-query'
import { CalendarRange, ChevronLeft } from 'lucide-react'
import { Link, useMatch, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import PageHeader from '@/components/PageHeader'
import PeriodicInvoiceForm from '@/components/PeriodicInvoiceForm'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useContract } from '@/hooks/useContract'
import { useContractInvoices } from '@/hooks/useContractInvoices'
import { invoiceQueryKey, useInvoice } from '@/hooks/useInvoice'
import { useInvoiceMutation } from '@/hooks/useInvoiceMutation'
import { useNextInvoicePeriod } from '@/hooks/useNextInvoicePeriod'
import { getApiErrorInfo, isNotFoundError } from '@/lib/apiError'
import NotFoundPage from '@/pages/public/NotFoundPage'
import { createInvoice, updateInvoice } from '@/services/invoiceService'
import type { ContractDetail } from '@/types/contractTypes'
import type { InvoiceDetail, PeriodicInvoiceRequest } from '@/types/invoiceTypes'
import { formatDate } from '@/utils/formatDate'
import { getLandlordContractActions } from '@/utils/getLandlordContractActions'
import { getLandlordInvoiceActions } from '@/utils/getInvoiceActions'
import { getVietnamToday } from '@/utils/getVietnamToday'
import {
  getInvoiceFormValues,
  getLatestPeriodicInvoiceId,
  getNewInvoiceFormValues,
  getRelatedInvoiceOptions,
} from '@/utils/invoiceForm'

/**
 * L7 — Chốt chỉ số, lập và sửa hóa đơn (docs/frontend-screens.md mục 6). Lập mới mở từ L6
 * (`/landlord/contracts/:id/invoices/new`), sửa mở từ L8 (`/landlord/invoices/:id/edit`). Lập mới hiện kỳ sắp lập
 * (`GET …/invoices/next-period`) và tổng tạm tính do server tính (`POST …/invoices/preview`, chốt 26/11); bấm Lưu
 * nháp thì sang L8, từ đó Sửa (quay về đây) hoặc Phát hành. Sửa giữ kỳ của hóa đơn, không có tổng tạm tính.
 */
export default function InvoiceFormPage() {
  const isEdit = useMatch('/landlord/invoices/:id/edit') !== null
  const { id } = useParams()
  // Id không phải số thì server trả 404 như hợp đồng, hóa đơn không thuộc mình.
  return isEdit ? <EditInvoicePage invoiceId={Number(id)} /> : <CreateInvoicePage contractId={Number(id)} />
}

function CreateInvoicePage({ contractId }: { contractId: number }) {
  const contractQuery = useContract(contractId)

  if (isNotFoundError(contractQuery.error)) {
    return <NotFoundPage />
  }

  return (
    <section className="flex flex-col gap-6">
      <BackLink to={`/landlord/contracts/${contractId}`} label="Hợp đồng" />
      {contractQuery.isPending ? (
        <InvoiceFormSkeleton />
      ) : contractQuery.isLoadingError ? (
        <ApiErrorAlert error={contractQuery.error} onRetry={() => void contractQuery.refetch()} />
      ) : (
        <CreateInvoiceContent contract={contractQuery.data} />
      )}
    </section>
  )
}

function CreateInvoiceContent({ contract }: { contract: ContractDetail }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  // `hasActiveInvoice` chỉ ảnh hưởng nút sửa chỉ số đầu, không ảnh hưởng quyền lập hóa đơn.
  const canCreate = getLandlordContractActions(contract, getVietnamToday(), new Date(), true).canCreateInvoice
  const invoicesQuery = useContractInvoices(contract.id, canCreate)
  const draft = invoicesQuery.data?.find((invoice) => invoice.type === 'DinhKy' && invoice.status === 'Nhap')
  // Còn nháp thì đã có lối mở nháp ở dưới, không cần hỏi kỳ (server cũng trả 409 vì còn nháp).
  const periodQuery = useNextInvoicePeriod(contract.id, canCreate && invoicesQuery.isSuccess && !draft)
  const mutation = useInvoiceMutation((request: PeriodicInvoiceRequest) => createInvoice(contract.id, request), {
    // Đặt sẵn chi tiết vừa tạo để L8 hiện ngay tổng tiền, không chờ tải lại.
    onSuccess: (created) => {
      queryClient.setQueryData(invoiceQueryKey(created.id), created)
      toast.success('Đã lưu hóa đơn nháp')
      void navigate(`/landlord/invoices/${created.id}`)
    },
  })

  const header = (
    <PageHeader
      title={`Lập hóa đơn phòng ${contract.room.code}`}
      description={`${contract.room.propertyName} · Người thuê: ${contract.tenant.fullName}`}
    />
  )

  if (!canCreate) {
    return (
      <>
        {header}
        <Alert>
          <AlertTitle>Hợp đồng này chưa lập được hóa đơn</AlertTitle>
          <AlertDescription>
            <p>
              Hóa đơn định kỳ lập cho hợp đồng đang hiệu lực, từ ngày bắt đầu {formatDate(contract.startDate)}, hoặc
              hợp đồng đang thanh lý còn thiếu tháng trọn.
            </p>
          </AlertDescription>
        </Alert>
      </>
    )
  }

  // Chờ danh sách hóa đơn để biết còn nháp không, tránh hiện form rồi đổi sang thông báo.
  if (invoicesQuery.isPending || (!draft && invoicesQuery.isSuccess && periodQuery.isPending)) {
    return (
      <>
        {header}
        <InvoiceFormSkeleton />
      </>
    )
  }

  if (draft) {
    return (
      <>
        {header}
        <Alert>
          <AlertTitle>Hợp đồng còn một hóa đơn nháp</AlertTitle>
          <AlertDescription>
            <p>
              Mỗi hợp đồng chỉ có một hóa đơn định kỳ nháp. Phát hành, sửa hoặc hủy hóa đơn nháp kỳ{' '}
              {formatDate(draft.periodStart)} – {formatDate(draft.periodEnd)} trước khi lập hóa đơn mới.
            </p>
            <Button asChild variant="outline" className="mt-2">
              <Link to={`/landlord/invoices/${draft.id}`}>Mở hóa đơn nháp</Link>
            </Button>
          </AlertDescription>
        </Alert>
      </>
    )
  }

  if (periodQuery.isError) {
    const info = getApiErrorInfo(periodQuery.error)
    return (
      <>
        {header}
        {info.status === 409 ? (
          // Kỳ kế tiếp chưa tới (trước ngày 25), tháng trả phòng, đã có hóa đơn thanh lý: câu do server viết.
          <Alert>
            <AlertTitle>Chưa lập được hóa đơn lúc này</AlertTitle>
            <AlertDescription>
              <p>{info.message}</p>
            </AlertDescription>
          </Alert>
        ) : (
          <ApiErrorAlert error={periodQuery.error} onRetry={() => void periodQuery.refetch()} />
        )}
      </>
    )
  }

  const period = periodQuery.data
  return (
    <>
      {header}
      {period && (
        <Alert>
          <CalendarRange />
          <AlertTitle>
            Kỳ {formatDate(period.periodStart)} – {formatDate(period.periodEnd)}
            {period.daysCharged < period.daysInMonth &&
              ` · tính tiền phòng ${period.daysCharged}/${period.daysInMonth} ngày`}
          </AlertTitle>
          <AlertDescription>
            <p>
              Kỳ do hệ thống xác định theo hợp đồng. Nhập chỉ số mới thì thấy ngay tiền điện, nước và tổng tạm tính;
              người thuê chỉ thấy hóa đơn sau khi bạn lưu nháp rồi bấm Phát hành.
            </p>
          </AlertDescription>
        </Alert>
      )}
      <ApiErrorAlert error={invoicesQuery.error} onRetry={() => void invoicesQuery.refetch()} />
      <PeriodicInvoiceForm
        defaultValues={getNewInvoiceFormValues()}
        previousReading={
          period ? { electricityIndex: period.previousElectricityIndex, waterIndex: period.previousWaterIndex } : null
        }
        unitPrices={{ electricity: contract.electricityUnitPrice, water: contract.waterUnitPrice }}
        relatedInvoices={getRelatedInvoiceOptions(invoicesQuery.data ?? [], null)}
        submitLabel="Lưu nháp"
        backPath={`/landlord/contracts/${contract.id}`}
        isPending={mutation.isPending}
        error={mutation.error}
        onSubmit={(request) => mutation.mutate(request)}
        previewContractId={contract.id}
      />
    </>
  )
}

function EditInvoicePage({ invoiceId }: { invoiceId: number }) {
  const invoiceQuery = useInvoice(invoiceId)

  if (isNotFoundError(invoiceQuery.error)) {
    return <NotFoundPage />
  }

  return (
    <section className="flex flex-col gap-6">
      <BackLink to={`/landlord/invoices/${invoiceId}`} label="Hóa đơn" />
      {invoiceQuery.isPending ? (
        <InvoiceFormSkeleton />
      ) : invoiceQuery.isLoadingError ? (
        <ApiErrorAlert error={invoiceQuery.error} onRetry={() => void invoiceQuery.refetch()} />
      ) : (
        <EditInvoiceContent invoice={invoiceQuery.data} />
      )}
    </section>
  )
}

function EditInvoiceContent({ invoice }: { invoice: InvoiceDetail }) {
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const contractQuery = useContract(invoice.contractId)
  const invoicesQuery = useContractInvoices(invoice.contractId, true)
  const latestPeriodicInvoiceId = invoicesQuery.data ? getLatestPeriodicInvoiceId(invoicesQuery.data) : null
  const actions = getLandlordInvoiceActions(invoice, latestPeriodicInvoiceId)
  const mutation = useInvoiceMutation((request: PeriodicInvoiceRequest) => updateInvoice(invoice.id, request), {
    onSuccess: (updated) => {
      queryClient.setQueryData(invoiceQueryKey(updated.id), updated)
      toast.success('Đã lưu hóa đơn')
      void navigate(`/landlord/invoices/${updated.id}`)
    },
  })

  const contract = contractQuery.data
  const header = (
    <PageHeader
      title={contract ? `Sửa hóa đơn phòng ${contract.room.code}` : 'Sửa hóa đơn'}
      description={`Kỳ ${formatDate(invoice.periodStart)} – ${formatDate(invoice.periodEnd)}`}
    />
  )

  // Hóa đơn đã phát hành cần danh sách hóa đơn của hợp đồng để biết có phải hóa đơn mới nhất không.
  if (invoice.status !== 'Nhap' && invoicesQuery.isPending) {
    return (
      <>
        {header}
        <InvoiceFormSkeleton />
      </>
    )
  }

  if (!actions.canEdit) {
    return (
      <>
        {header}
        <ApiErrorAlert error={invoicesQuery.error} onRetry={() => void invoicesQuery.refetch()} />
        <Alert>
          <AlertTitle>Hóa đơn này không sửa được</AlertTitle>
          <AlertDescription>
            <p>
              Chỉ sửa được hóa đơn định kỳ mới nhất của hợp đồng khi còn nháp, hoặc đã phát hành mà người thuê chưa
              trả đồng nào. Sai sót của hóa đơn khác thì thêm dòng điều chỉnh vào hóa đơn kỳ kế tiếp.
            </p>
          </AlertDescription>
        </Alert>
      </>
    )
  }

  return (
    <>
      {header}
      {invoice.status !== 'Nhap' && (
        <Alert>
          <AlertTitle>Hóa đơn đã phát hành</AlertTitle>
          <AlertDescription>
            <p>
              Lưu xong, hệ thống tính lại tiền, hạn thanh toán tính lại từ hôm nay và người thuê nhận thông báo hóa
              đơn được sửa.
            </p>
          </AlertDescription>
        </Alert>
      )}
      <PeriodicInvoiceForm
        defaultValues={getInvoiceFormValues(invoice)}
        previousReading={{ electricityIndex: invoice.previousElectricityIndex, waterIndex: invoice.previousWaterIndex }}
        unitPrices={{ electricity: invoice.electricityUnitPrice, water: invoice.waterUnitPrice }}
        relatedInvoices={getRelatedInvoiceOptions(invoicesQuery.data ?? [], invoice.id)}
        submitLabel="Lưu thay đổi"
        backPath={`/landlord/invoices/${invoice.id}`}
        isPending={mutation.isPending}
        error={mutation.error}
        onSubmit={(request) => mutation.mutate(request)}
      />
    </>
  )
}

function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Button asChild variant="ghost" size="sm" className="-ml-3 self-start">
      <Link to={to}>
        <ChevronLeft />
        {label}
      </Link>
    </Button>
  )
}

function InvoiceFormSkeleton() {
  return (
    <div className="flex max-w-2xl flex-col gap-6" aria-busy="true">
      <Skeleton className="h-8 w-2/3" />
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  )
}
