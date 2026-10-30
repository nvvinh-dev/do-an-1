import { TriangleAlert } from 'lucide-react'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import PageHeader from '@/components/PageHeader'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { useBankAccount } from '@/hooks/useBankAccount'
import { useUpdateBankAccount } from '@/hooks/useUpdateBankAccount'
import type { BankAccount } from '@/types/bankAccountTypes'
import { ACCOUNT_NAME_PATTERN, ACCOUNT_NUMBER_PATTERN } from '@/utils/bankAccountPatterns'
import { normalizeAccountName } from '@/utils/normalizeAccountName'
import { normalizeSearchText } from '@/utils/normalizeSearchText'
import { findVietQrBank, VIETQR_BANKS, type VietQrBank } from '@/utils/vietQrBanks'

const EMPTY_VALUES: BankAccount = { bankBin: '', accountNumber: '', accountName: '' }

/**
 * Chữ để tìm ngân hàng: tên ngắn và tên đầy đủ, bỏ dấu và bỏ dấu cách, để gõ "vietin bank" vẫn ra
 * "VietinBank" và gõ "ngoai thuong" ra "Vietcombank".
 */
const BANK_SEARCH_TEXT = new Map(
  VIETQR_BANKS.map((bank) => [bank.bin, toBankSearchText(`${bank.shortName} ${bank.name}`)]),
)

function toBankSearchText(text: string): string {
  return normalizeSearchText(text).replace(/ /g, '')
}

/** Người dùng hay gõ số tài khoản theo nhóm ("0123 456 789"); server chỉ nhận chữ số liền nhau. */
function removeSpaces(text: string): string {
  return text.replace(/\s+/g, '')
}

/**
 * L4 — Tài khoản nhận tiền (`/landlord/bank-account`), docs/frontend-screens.md mục 6. Khai báo
 * hoặc sửa ngân hàng, số tài khoản và tên chủ tài khoản (FR-77); body và mã lỗi theo
 * docs/api-design.md mục 2.1. Mã VietQR người thuê thấy ở tiền cọc và hóa đơn dựng từ tài khoản
 * này; chưa khai báo thì không có mã. Danh sách ngân hàng lấy từ `utils/vietQrBanks.ts`, không gọi API.
 */
export default function BankAccountPage() {
  const bankAccountQuery = useBankAccount()

  return (
    <section className="flex w-full max-w-2xl flex-col gap-6">
      <PageHeader
        title="Tài khoản nhận tiền"
        description="Người thuê chuyển khoản tiền cọc và tiền hóa đơn vào tài khoản này bằng mã VietQR."
      />
      {/* `null` là chưa khai báo, vẫn là dữ liệu. Đã có dữ liệu thì giữ form kể cả khi lần tải lại ngầm bị lỗi,
          để chữ đang gõ không mất. */}
      {bankAccountQuery.data !== undefined ? (
        <>
          {bankAccountQuery.data === null && <MissingAccountNotice />}
          <BankAccountForm bankAccount={bankAccountQuery.data} />
        </>
      ) : bankAccountQuery.isError ? (
        <ApiErrorAlert error={bankAccountQuery.error} onRetry={() => void bankAccountQuery.refetch()} />
      ) : (
        <BankAccountFormSkeleton />
      )}
    </section>
  )
}

/** Lời nhắc khi chưa khai báo (FR-77): việc khai báo không bắt buộc, nhưng thiếu thì không có mã VietQR. */
function MissingAccountNotice() {
  return (
    <Alert className="border-warning/40">
      <TriangleAlert />
      <AlertTitle>Chưa khai báo tài khoản nhận tiền</AlertTitle>
      <AlertDescription>
        <p>
          Người thuê sẽ không thấy mã VietQR khi trả tiền cọc và tiền hóa đơn. Việc khai báo không bắt buộc, nhưng có
          mã thì người thuê quét là có sẵn số tài khoản, số tiền và nội dung chuyển khoản, không phải gõ tay.
        </p>
      </AlertDescription>
    </Alert>
  )
}

function BankAccountFormSkeleton() {
  return (
    <div className="flex flex-col gap-6 rounded-xl border bg-card p-4 md:p-6" aria-busy="true">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <Skeleton className="h-11 w-full md:ml-auto md:w-36" />
    </div>
  )
}

function BankAccountForm({ bankAccount }: { bankAccount: BankAccount | null }) {
  const updateMutation = useUpdateBankAccount()
  const { control, handleSubmit, reset } = useForm<BankAccount>({
    mode: 'onTouched',
    defaultValues: bankAccount ?? EMPTY_VALUES,
  })

  const submit = handleSubmit((values) => {
    // Gửi bằng phím Enter thì ô đang gõ chưa rời, nên chuẩn hóa lại ở đây chứ không chỉ khi rời ô.
    updateMutation.mutate(
      {
        bankBin: values.bankBin,
        accountNumber: removeSpaces(values.accountNumber),
        accountName: normalizeAccountName(values.accountName),
      },
      {
        onSuccess: (saved) => {
          reset(saved)
          toast.success('Đã lưu tài khoản nhận tiền')
        },
      },
    )
  })

  return (
    <form
      noValidate
      onSubmit={submit}
      className="flex flex-col gap-6 rounded-xl border bg-card p-4 text-card-foreground md:p-6"
    >
      <p className="text-sm text-muted-foreground">
        Mỗi lần người thuê mở hợp đồng hoặc hóa đơn, mã VietQR được dựng từ tài khoản đang lưu ở đây, nên sau khi sửa,
        người thuê dùng tài khoản mới từ lần mở tiếp theo.
      </p>

      <FieldGroup>
        <Controller
          name="bankBin"
          control={control}
          rules={{ required: 'Vui lòng chọn ngân hàng.' }}
          render={({ field, fieldState }) => {
            const selectedBank = findVietQrBank(field.value) ?? null
            return (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="bankBin">
                  Ngân hàng <span aria-hidden="true">*</span>
                </FieldLabel>
                <Combobox
                  items={VIETQR_BANKS}
                  value={selectedBank}
                  onValueChange={(bank: VietQrBank | null) => field.onChange(bank?.bin ?? '')}
                  itemToStringLabel={(bank: VietQrBank) => bank.shortName}
                  itemToStringValue={(bank: VietQrBank) => bank.bin}
                  isItemEqualToValue={(item: VietQrBank, value: VietQrBank) => item.bin === value.bin}
                  filter={(bank: VietQrBank, query: string) =>
                    BANK_SEARCH_TEXT.get(bank.bin)?.includes(toBankSearchText(query)) ?? false
                  }
                  autoHighlight
                >
                  <ComboboxInput
                    id="bankBin"
                    ref={field.ref}
                    className="w-full"
                    placeholder="Gõ để tìm ngân hàng"
                    aria-invalid={fieldState.invalid}
                    onBlur={field.onBlur}
                  />
                  <ComboboxContent>
                    <ComboboxEmpty>Không tìm thấy ngân hàng.</ComboboxEmpty>
                    <ComboboxList>
                      {(bank: VietQrBank) => (
                        <ComboboxItem key={bank.bin} value={bank}>
                          <span className="flex min-w-0 flex-col">
                            <span className="font-medium">{bank.shortName}</span>
                            <span className="text-xs text-muted-foreground">{bank.name}</span>
                          </span>
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
                {fieldState.invalid ? (
                  <FieldError errors={[fieldState.error]} />
                ) : (
                  <FieldDescription>
                    {/* Tên đầy đủ phân biệt các mục có tên ngắn gần giống nhau, như hai chi nhánh của một ngân hàng. */}
                    {selectedBank
                      ? selectedBank.name
                      : 'Gõ tên ngắn hoặc tên đầy đủ, ví dụ "vietcom" hoặc "ngoai thuong".'}
                  </FieldDescription>
                )}
              </Field>
            )
          }}
        />

        <Controller
          name="accountNumber"
          control={control}
          rules={{
            validate: (value) => {
              const accountNumber = removeSpaces(value)
              if (accountNumber === '') return 'Vui lòng nhập số tài khoản.'
              return ACCOUNT_NUMBER_PATTERN.test(accountNumber) || 'Số tài khoản chỉ gồm chữ số.'
            },
          }}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="accountNumber">
                Số tài khoản <span aria-hidden="true">*</span>
              </FieldLabel>
              <Input
                {...field}
                id="accountNumber"
                inputMode="numeric"
                autoComplete="off"
                aria-invalid={fieldState.invalid}
                onBlur={() => {
                  field.onChange(removeSpaces(field.value))
                  field.onBlur()
                }}
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : (
                <FieldDescription>Chỉ gồm chữ số; dấu cách giữa các nhóm số được bỏ khi rời ô.</FieldDescription>
              )}
            </Field>
          )}
        />

        <Controller
          name="accountName"
          control={control}
          rules={{
            validate: (value) => {
              const accountName = normalizeAccountName(value)
              if (accountName === '') return 'Vui lòng nhập tên chủ tài khoản.'
              return (
                ACCOUNT_NAME_PATTERN.test(accountName) ||
                'Tên chủ tài khoản chỉ gồm chữ cái và dấu cách, không có chữ số hay dấu câu.'
              )
            },
          }}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="accountName">
                Tên chủ tài khoản <span aria-hidden="true">*</span>
              </FieldLabel>
              <Input
                {...field}
                id="accountName"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                aria-invalid={fieldState.invalid}
                onBlur={() => {
                  // Chuyển khi rời ô chứ không khi đang gõ, để bộ gõ tiếng Việt (Telex, VNI) không bị ngắt giữa chừng.
                  field.onChange(normalizeAccountName(field.value))
                  field.onBlur()
                }}
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : (
                <FieldDescription>
                  Đúng như tên ngân hàng in trên thẻ, viết hoa không dấu, ví dụ NGUYEN VAN A. Gõ có dấu thì tự chuyển khi
                  rời ô.
                </FieldDescription>
              )}
            </Field>
          )}
        />
      </FieldGroup>

      {/* 422 hiện `detail` ngay trên nút vừa bấm, dữ liệu đã nhập giữ nguyên (docs/frontend-screens.md mục 1). */}
      <ApiErrorAlert error={updateMutation.error} />

      <div className="flex flex-col gap-3 md:flex-row md:justify-end">
        <Button type="submit" size="page" disabled={updateMutation.isPending}>
          {updateMutation.isPending && <Spinner />}
          {bankAccount ? 'Lưu thay đổi' : 'Lưu tài khoản'}
        </Button>
      </div>
    </form>
  )
}
