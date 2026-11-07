import { ChevronLeft, Plus, Trash2, TriangleAlert } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Controller, useFieldArray, useForm, type Control, type FieldPathByValue } from 'react-hook-form'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router'
import { toast } from 'sonner'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import PageHeader from '@/components/PageHeader'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { useContract } from '@/hooks/useContract'
import { useLatestRoomMeterReading } from '@/hooks/useLatestRoomMeterReading'
import { useLeaseMutation } from '@/hooks/useLeaseMutation'
import { useRentalRequest } from '@/hooks/useRentalRequest'
import { useRoom } from '@/hooks/useRoom'
import { isNotFoundError } from '@/lib/apiError'
import NotFoundPage from '@/pages/public/NotFoundPage'
import { createContract, updateContract } from '@/services/contractService'
import type { ContractDetail, ContractFormValues, ContractTermsRequest } from '@/types/contractTypes'
import type { RentalRequestDetail } from '@/types/rentalRequestTypes'
import {
  getContractFormValues,
  getMaxCoOccupants,
  getNewContractFormValues,
  normalizeMeterIndex,
  toContractTermsRequest,
  validateEndDate,
  validateMeterIndex,
  validateOccupantPhone,
  validatePaymentDueDays,
  validateStartDate,
} from '@/utils/contractForm'
import { getVietnamToday } from '@/utils/getVietnamToday'
import { isHoldExpired } from '@/utils/isHoldExpired'
import { normalizeRoomMoney, validateRoomMoney } from '@/utils/validateRoomInput'

/**
 * L6 — Lập hợp đồng (`/landlord/contracts/new?rentalRequestId=`) và sửa hợp đồng nháp
 * (`/landlord/contracts/:id/edit`), docs/frontend-screens.md mục 6. Lưu xong thì sang trang chi tiết
 * hợp đồng (mục 8).
 */
export default function ContractFormPage() {
  const { id } = useParams()
  return id === undefined ? <NewContractPage /> : <EditContractPage contractId={Number(id)} />
}

function NewContractPage() {
  const [searchParams] = useSearchParams()
  // Thiếu hoặc sai `rentalRequestId` thì server trả 404 như yêu cầu không thuộc phòng của mình.
  const rentalRequestQuery = useRentalRequest(Number(searchParams.get('rentalRequestId')))

  if (isNotFoundError(rentalRequestQuery.error)) return <NotFoundPage />
  if (rentalRequestQuery.isPending) return <ContractFormSkeleton />
  if (rentalRequestQuery.isLoadingError) {
    return <ApiErrorAlert error={rentalRequestQuery.error} onRetry={() => void rentalRequestQuery.refetch()} />
  }

  const rentalRequest = rentalRequestQuery.data
  const backLink = { to: `/landlord/rental-requests/${rentalRequest.id}`, label: 'Về yêu cầu thuê' }
  // Server cũng chặn (`409`); chặn sớm để Chủ trọ không nhập cả form rồi mới biết.
  if (rentalRequest.status !== 'DaDuyet' || isHoldExpired(rentalRequest.holdExpiresAt, new Date())) {
    return (
      <FormFrame backLink={backLink} title="Lập hợp đồng">
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>Không lập được hợp đồng từ yêu cầu này</AlertTitle>
          <AlertDescription>
            {rentalRequest.status === 'DaLapHopDong'
              ? 'Yêu cầu đã được lập hợp đồng.'
              : 'Chỉ lập hợp đồng từ yêu cầu đã duyệt và còn hạn giữ chỗ 72 giờ.'}
          </AlertDescription>
        </Alert>
      </FormFrame>
    )
  }

  return <NewContractForm rentalRequest={rentalRequest} backLink={backLink} />
}

function NewContractForm({ rentalRequest, backLink }: { rentalRequest: RentalRequestDetail; backLink: BackLink }) {
  const navigate = useNavigate()
  const roomQuery = useRoom(rentalRequest.room.id)
  const meterQuery = useLatestRoomMeterReading(rentalRequest.room.id, true)
  const createMutation = useLeaseMutation(
    (request: ContractTermsRequest) => createContract({ ...request, rentalRequestId: rentalRequest.id }),
    {
      onSuccess: (contract) => {
        toast.success('Đã lập hợp đồng nháp')
        void navigate(`/landlord/contracts/${contract.id}`, { replace: true })
      },
    },
  )

  const loadError = roomQuery.error ?? meterQuery.error
  if (roomQuery.isPending || meterQuery.isPending) return <ContractFormSkeleton />
  if (roomQuery.isError || meterQuery.isError) {
    return (
      <ApiErrorAlert
        error={loadError}
        onRetry={() => {
          if (roomQuery.isError) void roomQuery.refetch()
          if (meterQuery.isError) void meterQuery.refetch()
        }}
      />
    )
  }

  return (
    <FormFrame
      backLink={backLink}
      title={`Lập hợp đồng phòng ${rentalRequest.room.code}`}
      description={`${rentalRequest.room.propertyName} · Người thuê: ${rentalRequest.tenantName}`}
    >
      <ContractForm
        defaultValues={getNewContractFormValues(
          roomQuery.data,
          meterQuery.data,
          rentalRequest.expectedMoveInDate,
          getVietnamToday(),
        )}
        maxOccupants={roomQuery.data.maxOccupants}
        hasLatestReading={meterQuery.data !== null}
        submitLabel="Lưu hợp đồng nháp"
        cancelTo={backLink.to}
        isPending={createMutation.isPending}
        error={createMutation.error}
        onSubmit={(request) => createMutation.mutate(request)}
      />
    </FormFrame>
  )
}

function EditContractPage({ contractId }: { contractId: number }) {
  const contractQuery = useContract(contractId)

  if (isNotFoundError(contractQuery.error)) return <NotFoundPage />
  if (contractQuery.isPending) return <ContractFormSkeleton />
  if (contractQuery.isLoadingError) {
    return <ApiErrorAlert error={contractQuery.error} onRetry={() => void contractQuery.refetch()} />
  }

  const contract = contractQuery.data
  const backLink = { to: `/landlord/contracts/${contract.id}`, label: 'Về hợp đồng' }
  if (contract.status !== 'Nhap' || isHoldExpired(contract.holdExpiresAt, new Date())) {
    return (
      <FormFrame backLink={backLink} title={`Sửa hợp đồng phòng ${contract.room.code}`}>
        <Alert variant="destructive">
          <TriangleAlert />
          <AlertTitle>Không sửa được hợp đồng này</AlertTitle>
          <AlertDescription className="flex flex-col items-start gap-2">
            <p>{getEditBlockedReason(contract)}</p>
            <Button asChild variant="outline">
              <Link to={backLink.to}>Xem hợp đồng</Link>
            </Button>
          </AlertDescription>
        </Alert>
      </FormFrame>
    )
  }

  return <EditContractForm contract={contract} backLink={backLink} />
}

/**
 * Vì sao không sửa được. Trang này cũng hiện ra khi đang sửa thì `PUT` trả `409` và dữ liệu tải lại sang
 * trạng thái mới (người thuê vừa hủy, hợp đồng vừa có hiệu lực), nên chỉ gợi ý thu hồi khi hợp đồng còn
 * thu hồi được.
 */
function getEditBlockedReason(contract: ContractDetail): string {
  switch (contract.status) {
    case 'Nhap':
      return 'Đã quá hạn giữ chỗ 72 giờ, hợp đồng sẽ tự hủy.'
    case 'ChoNguoiThueXacNhan':
    case 'ChoNhanCoc':
      return 'Hợp đồng đã gửi cho người thuê. Thu hồi về nháp ở trang chi tiết rồi mới sửa.'
    case 'DaHuy':
      return 'Hợp đồng đã hủy nên không sửa được nữa.'
    default:
      return 'Hợp đồng không còn ở trạng thái nháp nên không sửa được điều khoản.'
  }
}

function EditContractForm({ contract, backLink }: { contract: ContractDetail; backLink: BackLink }) {
  const navigate = useNavigate()
  const roomQuery = useRoom(contract.room.id)
  const updateMutation = useLeaseMutation((request: ContractTermsRequest) => updateContract(contract.id, request), {
    onSuccess: () => {
      toast.success('Đã lưu hợp đồng')
      void navigate(backLink.to, { replace: true })
    },
  })

  if (roomQuery.isPending) return <ContractFormSkeleton />
  if (roomQuery.isError) return <ApiErrorAlert error={roomQuery.error} onRetry={() => void roomQuery.refetch()} />

  return (
    <FormFrame
      backLink={backLink}
      title={`Sửa hợp đồng phòng ${contract.room.code}`}
      description={`${contract.room.propertyName} · Người thuê: ${contract.tenant.fullName}`}
    >
      <ContractForm
        defaultValues={getContractFormValues(contract)}
        maxOccupants={roomQuery.data.maxOccupants}
        hasLatestReading
        submitLabel="Lưu thay đổi"
        cancelTo={backLink.to}
        isPending={updateMutation.isPending}
        error={updateMutation.error}
        onSubmit={(request) => updateMutation.mutate(request)}
      />
    </FormFrame>
  )
}

interface BackLink {
  to: string
  label: string
}

function FormFrame({
  backLink,
  title,
  description,
  children,
}: {
  backLink: BackLink
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-6">
      <Button asChild variant="ghost" size="sm" className="-ml-3 self-start">
        <Link to={backLink.to}>
          <ChevronLeft />
          {backLink.label}
        </Link>
      </Button>
      <PageHeader title={title} description={description} />
      {children}
    </section>
  )
}

interface ContractFormProps {
  defaultValues: ContractFormValues
  /** Số người tối đa của phòng, tính cả người đứng tên (BR-11). */
  maxOccupants: number
  /** Phòng đã có chỉ số cuối để điền sẵn chỉ số đầu. */
  hasLatestReading: boolean
  submitLabel: string
  cancelTo: string
  isPending: boolean
  error: unknown
  onSubmit: (request: ContractTermsRequest) => void
}

/**
 * Form điều khoản dùng chung cho lập và sửa. Kiểm tra ở đây chỉ để báo sớm; server kiểm tra lại: ràng
 * buộc giá trị trả `400`, ngày và tổng số người trả `422`, trạng thái hoặc hạn giữ chỗ trả `409` — hiện
 * `detail` ngay trên nút lưu, giữ nguyên dữ liệu đã nhập.
 */
function ContractForm({
  defaultValues,
  maxOccupants,
  hasLatestReading,
  submitLabel,
  cancelTo,
  isPending,
  error,
  onSubmit,
}: ContractFormProps) {
  const today = getVietnamToday()
  const maxCoOccupants = getMaxCoOccupants(maxOccupants)
  const { control, handleSubmit, getValues, trigger } = useForm<ContractFormValues>({
    mode: 'onTouched',
    defaultValues,
  })
  const feeArray = useFieldArray({ control, name: 'serviceFees' })
  const occupantArray = useFieldArray({ control, name: 'occupants' })

  return (
    <form
      noValidate
      onSubmit={handleSubmit((values) => onSubmit(toContractTermsRequest(values)))}
      className="flex flex-col gap-6"
    >
      <FormSection title="Giá thuê và tiền cọc">
        <div className="grid gap-4 md:grid-cols-3">
          <NumberField control={control} name="rentPrice" label="Giá thuê / tháng (₫)" kind="money" positive />
          <NumberField control={control} name="depositAmount" label="Tiền cọc (₫)" kind="money" />
          <Controller
            name="paymentDueDays"
            control={control}
            rules={{ validate: validatePaymentDueDays }}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="paymentDueDays">
                  Hạn thanh toán (ngày) <span aria-hidden="true">*</span>
                </FieldLabel>
                <Input {...field} id="paymentDueDays" inputMode="numeric" aria-invalid={fieldState.invalid} />
                <FieldDescription>Từ 1 tới 30 ngày kể từ ngày phát hành hóa đơn.</FieldDescription>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>
        <p className="text-sm text-muted-foreground">
          Giá thuê, đơn giá và phí dịch vụ điền sẵn từ phòng; sửa ở đây chỉ áp dụng cho hợp đồng này. Tiền cọc 0 thì
          hợp đồng có hiệu lực ngay khi người thuê đồng ý.
        </p>
      </FormSection>

      <FormSection title="Điện nước">
        <div className="grid gap-4 md:grid-cols-2">
          <NumberField control={control} name="electricityUnitPrice" label="Giá điện / kWh (₫)" kind="money" />
          <NumberField control={control} name="waterUnitPrice" label="Giá nước / m³ (₫)" kind="money" />
          <NumberField control={control} name="initialElectricityIndex" label="Chỉ số điện đầu (kWh)" kind="meter" />
          <NumberField control={control} name="initialWaterIndex" label="Chỉ số nước đầu (m³)" kind="meter" />
        </div>
        <p className="text-sm text-muted-foreground">
          {hasLatestReading
            ? 'Chỉ số đầu điền sẵn từ chỉ số cuối đã ghi nhận của phòng. Đối chiếu với đồng hồ trước khi lưu; đây là chỉ số cũ của hóa đơn đầu tiên.'
            : 'Phòng chưa từng có hợp đồng: đọc chỉ số trên đồng hồ điện, nước và nhập vào. Đây là chỉ số cũ của hóa đơn đầu tiên.'}
        </p>
      </FormSection>

      <FormSection title="Thời hạn">
        <div className="grid gap-4 md:grid-cols-2">
          <Controller
            name="startDate"
            control={control}
            rules={{
              validate: (value) => validateStartDate(value, today),
              // Đổi ngày bắt đầu thì kiểm tra lại ngày kết thúc nếu đã nhập.
              onChange: () => getValues('endDate') !== '' && void trigger('endDate'),
            }}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="startDate">
                  Ngày bắt đầu <span aria-hidden="true">*</span>
                </FieldLabel>
                <Input {...field} id="startDate" type="date" min={today} aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="endDate"
            control={control}
            rules={{ validate: (value) => validateEndDate(value, getValues('startDate')) }}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="endDate">
                  Ngày kết thúc <span aria-hidden="true">*</span>
                </FieldLabel>
                <Input {...field} id="endDate" type="date" min={today} aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
        </div>
      </FormSection>

      <FormSection title="Phí dịch vụ mỗi tháng">
        {feeArray.fields.length === 0 && <p className="text-sm text-muted-foreground">Không có phí dịch vụ.</p>}
        {feeArray.fields.map((fee, index) => (
          <div key={fee.id} className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1fr_1fr_auto] md:items-start">
            <Controller
              name={`serviceFees.${index}.name`}
              control={control}
              rules={{ validate: (value) => value.trim() !== '' || 'Vui lòng nhập tên phí.' }}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`fee-name-${fee.id}`}>
                    Tên phí {index + 1} <span aria-hidden="true">*</span>
                  </FieldLabel>
                  <Input
                    {...field}
                    id={`fee-name-${fee.id}`}
                    placeholder="Ví dụ: Rác, Wifi"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <NumberField
              control={control}
              name={`serviceFees.${index}.amount`}
              id={`fee-amount-${fee.id}`}
              label="Số tiền / tháng (₫)"
              kind="money"
            />
            <Button
              type="button"
              variant="ghost"
              className="md:mt-6"
              aria-label={`Xóa phí ${index + 1}`}
              onClick={() => feeArray.remove(index)}
            >
              <Trash2 />
              <span className="md:sr-only">Xóa phí</span>
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          className="self-start"
          onClick={() => feeArray.append({ name: '', amount: '' }, { shouldFocus: true })}
        >
          <Plus />
          Thêm phí
        </Button>
      </FormSection>

      <FormSection title="Người ở cùng">
        <p className="text-sm text-muted-foreground">
          Phòng ở tối đa {maxOccupants} người, tính cả người đứng tên hợp đồng, nên thêm được tối đa {maxCoOccupants}{' '}
          người ở cùng.
        </p>
        {occupantArray.fields.map((occupant, index) => (
          <div
            key={occupant.id}
            className="grid gap-3 rounded-lg border p-3 md:grid-cols-[1fr_1fr_auto] md:items-start"
          >
            <Controller
              name={`occupants.${index}.fullName`}
              control={control}
              rules={{ validate: (value) => value.trim() !== '' || 'Vui lòng nhập họ tên.' }}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`occupant-name-${occupant.id}`}>
                    Họ tên người {index + 1} <span aria-hidden="true">*</span>
                  </FieldLabel>
                  <Input {...field} id={`occupant-name-${occupant.id}`} aria-invalid={fieldState.invalid} />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Controller
              name={`occupants.${index}.phoneNumber`}
              control={control}
              rules={{ validate: validateOccupantPhone }}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor={`occupant-phone-${occupant.id}`}>Số điện thoại</FieldLabel>
                  <Input
                    {...field}
                    id={`occupant-phone-${occupant.id}`}
                    type="tel"
                    inputMode="tel"
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
            <Button
              type="button"
              variant="ghost"
              className="md:mt-6"
              aria-label={`Xóa người ở cùng ${index + 1}`}
              onClick={() => occupantArray.remove(index)}
            >
              <Trash2 />
              <span className="md:sr-only">Xóa</span>
            </Button>
          </div>
        ))}
        {/* Hợp đồng nháp cũ có thể đã vượt số người (phòng vừa giảm số người tối đa): vẫn cho xóa bớt. */}
        {occupantArray.fields.length > maxCoOccupants && (
          <p className="text-sm text-destructive">
            Đang có {occupantArray.fields.length + 1} người, vượt số người tối đa {maxOccupants} của phòng. Xóa bớt người
            ở cùng.
          </p>
        )}
        <Button
          type="button"
          variant="outline"
          className="self-start"
          disabled={occupantArray.fields.length >= maxCoOccupants}
          onClick={() => occupantArray.append({ fullName: '', phoneNumber: '' }, { shouldFocus: true })}
        >
          <Plus />
          Thêm người ở cùng
        </Button>
      </FormSection>

      <ApiErrorAlert error={error} />

      <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
        <Button asChild variant="outline" size="page">
          <Link to={cancelTo}>Hủy</Link>
        </Button>
        <Button
          type="submit"
          size="page"
          disabled={isPending || occupantArray.fields.length > maxCoOccupants}
        >
          {isPending && <Spinner />}
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <FieldSet className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm md:p-6">
      <FieldLegend className="text-lg font-medium">{title}</FieldLegend>
      {children}
    </FieldSet>
  )
}

interface NumberFieldProps {
  control: Control<ContractFormValues>
  name: FieldPathByValue<ContractFormValues, string>
  label: string
  /** `money`: số đồng nguyên, hiện dấu chấm hàng nghìn khi rời ô; `meter`: chỉ số, tối đa 2 số lẻ. */
  kind: 'money' | 'meter'
  /** Tiền phải lớn hơn 0 (giá thuê). */
  positive?: boolean
  id?: string
}

/**
 * Ô số của form hợp đồng, như ô số của form phòng: rời ô thì dọn chuỗi ("3.000.000" → "3000000",
 * "1182.5" → "1182,5"); tiền hiện dấu chấm hàng nghìn khi không chọn (design-system mục 8). Chuỗi
 * sai giữ nguyên để người dùng thấy và sửa.
 */
function NumberField({ control, name, label, kind, positive = false, id = `contract-${name}` }: NumberFieldProps) {
  const [focused, setFocused] = useState(false)
  const validate = (value: string) =>
    kind === 'money' ? validateRoomMoney(value, positive) : validateMeterIndex(value)
  const normalize = (value: string) =>
    kind === 'money' ? normalizeRoomMoney(value) : normalizeMeterIndex(value).replace('.', ',')

  return (
    <Controller
      name={name}
      control={control}
      rules={{ validate: (value) => validate(value) }}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={id}>
            {label} <span aria-hidden="true">*</span>
          </FieldLabel>
          <Input
            {...field}
            id={id}
            inputMode={kind === 'money' ? 'numeric' : 'decimal'}
            className="tabular-nums"
            aria-invalid={fieldState.invalid}
            value={
              kind === 'money' && !focused && validate(field.value) === true
                ? Number(normalizeRoomMoney(field.value)).toLocaleString('vi-VN')
                : field.value
            }
            onFocus={() => setFocused(true)}
            onBlur={() => {
              setFocused(false)
              const normalized = normalize(field.value)
              if (normalized !== field.value) field.onChange(normalized)
              field.onBlur()
            }}
          />
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  )
}

function ContractFormSkeleton() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label="Đang tải">
      <Skeleton className="h-8 w-64 max-w-full" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-32 w-full" />
    </div>
  )
}
