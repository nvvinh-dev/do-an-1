import { CirclePause, CirclePlay, ShieldBan, Trash2 } from 'lucide-react'
import { useCallback, useMemo, useState, type Ref } from 'react'
import { Controller, useForm, useWatch, type Control, type FieldPath } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import ConfirmDialog from '@/components/ConfirmDialog'
import FormSection from '@/components/FormSection'
import PageHeader from '@/components/PageHeader'
import SearchCombobox from '@/components/SearchCombobox'
import UnitInput from '@/components/UnitInput'
import { Button } from '@/components/ui/button'
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Skeleton } from '@/components/ui/skeleton'
import { Spinner } from '@/components/ui/spinner'
import { useLocations } from '@/hooks/useLocations'
import { useMyRoommateProfile } from '@/hooks/useMyRoommateProfile'
import { useRoommateBlocks } from '@/hooks/useRoommateBlocks'
import { useRoommateMutation } from '@/hooks/useRoommateMutation'
import { useSchools } from '@/hooks/useSchools'
import { getApiErrorInfo } from '@/lib/apiError'
import {
  deleteMyRoommateProfile,
  saveMyRoommateProfile,
  setRoommateSearching,
  unblockRoommate,
} from '@/services/roommateService'
import type { Location } from '@/types/locationTypes'
import type { School } from '@/types/schoolTypes'
import {
  COOKING_FREQUENCIES,
  GENDERS,
  NOISE_LEVELS,
  OCCUPATION_TYPES,
  PREFERRED_ROOMMATE_GENDERS,
  ROOMMATE_PROFILE_VISIBILITIES,
  SLEEP_TIMES,
  type MyRoommateProfile,
  type RoommateBlock,
} from '@/types/roommateTypes'
import { formatDate } from '@/utils/formatDate'
import { getVietnamToday } from '@/utils/getVietnamToday'
import {
  COOKING_LABELS,
  GENDER_LABELS,
  NOISE_LEVEL_LABELS,
  OCCUPATION_TYPE_LABELS,
  PREFERRED_ROOMMATE_GENDER_LABELS,
  SLEEP_TIME_LABELS,
  VISIBILITY_DESCRIPTIONS,
  VISIBILITY_LABELS,
} from '@/utils/roommateLabels'
import {
  EMPTY_ROOMMATE_PROFILE_FORM,
  MAX_ORGANIZATION_NAME_LENGTH,
  OTHER_SCHOOL,
  needsTypedOrganizationName,
  toRoommateProfileFormValues,
  toRoommateProfileRequest,
  validateBudget,
  validateBudgetMax,
  validateMoveInFrom,
  type RoommateProfileFormValues,
} from '@/utils/roommateProfileForm'
import { searchSchools } from '@/utils/searchSchools'
import { searchWards } from '@/utils/searchWards'

/**
 * T7 — Hồ sơ ở ghép (docs/frontend-screens.md mục 5). Chưa có hồ sơ thì hiện form tạo; tạo lần đầu xong
 * thì sang T8 (mục 8). Đã có thì hiện trạng thái tìm, nút tạm dừng / tiếp tục, xóa hồ sơ và form sửa.
 * Mục Đã chặn luôn hiện, vì lượt chặn vẫn còn sau khi xóa hồ sơ.
 */
export default function RoommateProfilePage() {
  const profileQuery = useMyRoommateProfile()
  const locationsQuery = useLocations()
  const schoolsQuery = useSchools()

  let content
  if (profileQuery.isPending || locationsQuery.isPending || schoolsQuery.isPending) {
    content = <ProfileSkeleton />
  } else if (profileQuery.isLoadingError) {
    content = <ApiErrorAlert error={profileQuery.error} onRetry={() => void profileQuery.refetch()} />
  } else if (locationsQuery.isError) {
    content = <ApiErrorAlert error={locationsQuery.error} onRetry={() => void locationsQuery.refetch()} />
  } else if (schoolsQuery.isError) {
    content = <ApiErrorAlert error={schoolsQuery.error} onRetry={() => void schoolsQuery.refetch()} />
  } else {
    const profile = profileQuery.data ?? null
    content = (
      <>
        {profile && <ProfileStatus profile={profile} />}
        {/* Đổi key khi hồ sơ được tạo hoặc bị xóa để form lấy lại giá trị ban đầu. */}
        <ProfileForm
          key={profile?.id ?? 'new'}
          profile={profile}
          locations={locationsQuery.data}
          schools={schoolsQuery.data}
        />
      </>
    )
  }

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader
        title="Hồ sơ ở ghép"
        description="Khu vực, ngân sách và thói quen sinh hoạt dùng để gợi ý người ở ghép phù hợp. Họ tên và số điện thoại của bạn không hiện trên hồ sơ."
      />
      {profileQuery.isRefetchError && (
        <ApiErrorAlert error={profileQuery.error} onRetry={() => void profileQuery.refetch()} />
      )}
      {content}
      <BlockList />
    </section>
  )
}

function ProfileSkeleton() {
  return (
    <div aria-busy="true" aria-label="Đang tải hồ sơ" className="flex flex-col gap-4 rounded-xl border p-4 md:p-6">
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-2/3" />
    </div>
  )
}

/** Mức hiển thị, trạng thái tìm, tạm dừng / tiếp tục và xóa hồ sơ (FR-106). */
function ProfileStatus({ profile }: { profile: MyRoommateProfile }) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const searchingMutation = useRoommateMutation((isSearching: boolean) => setRoommateSearching(isSearching))
  const deleteMutation = useRoommateMutation(deleteMyRoommateProfile)

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground shadow-sm md:p-6">
      <dl className="grid gap-3 text-sm sm:grid-cols-3">
        <div className="flex flex-col gap-0.5">
          <dt className="text-muted-foreground">Trạng thái</dt>
          <dd className="font-semibold">{profile.isSearching ? 'Đang tìm' : 'Tạm dừng tìm'}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-muted-foreground">Mức hiển thị</dt>
          <dd>{VISIBILITY_LABELS[profile.visibility]}</dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-muted-foreground">Cập nhật</dt>
          <dd>{formatDate(profile.updatedAt)}</dd>
        </div>
      </dl>
      {!profile.isSearching && (
        <p className="text-sm text-muted-foreground">
          Hồ sơ đang tạm dừng nên không xuất hiện trong danh sách gợi ý của ai; lời mời đã gửi và kết nối vẫn giữ.
        </p>
      )}

      <ApiErrorAlert error={searchingMutation.error} />

      <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
        <Button
          type="button"
          variant="outline"
          size="page"
          className="text-destructive hover:text-destructive"
          disabled={searchingMutation.isPending}
          onClick={() => setDeleteOpen(true)}
        >
          <Trash2 />
          Xóa hồ sơ
        </Button>
        <Button
          type="button"
          variant="outline"
          size="page"
          disabled={searchingMutation.isPending}
          onClick={() =>
            searchingMutation.mutate(!profile.isSearching, {
              onSuccess: () => toast.success(profile.isSearching ? 'Đã tạm dừng tìm' : 'Đã tiếp tục tìm'),
            })
          }
        >
          {searchingMutation.isPending ? <Spinner /> : profile.isSearching ? <CirclePause /> : <CirclePlay />}
          {profile.isSearching ? 'Tạm dừng tìm' : 'Tiếp tục tìm'}
        </Button>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Xóa hồ sơ ở ghép?"
        description="Hồ sơ bị xóa hẳn, mọi lời mời đang chờ bạn gửi đi hoặc nhận được sẽ bị rút. Các kết nối đã chấp nhận vẫn giữ."
        confirmLabel="Xóa hồ sơ"
        destructive
        isPending={deleteMutation.isPending}
        error={deleteMutation.error}
        onConfirm={() =>
          deleteMutation.mutate(undefined, {
            onSuccess: () => {
              setDeleteOpen(false)
              toast.success('Đã xóa hồ sơ ở ghép')
            },
          })
        }
      />
    </div>
  )
}

interface ProfileFormProps {
  profile: MyRoommateProfile | null
  locations: Location[]
  schools: School[]
}

/**
 * Form tạo hoặc sửa (`PUT /roommate-profiles/me`). `409` chỉ xảy ra khi đang có hợp đồng Đang hiệu lực
 * (FR-107): thay form bằng `detail` của server. Lỗi khác hiện ngay trên nút lưu, giữ nguyên dữ liệu đã nhập.
 */
function ProfileForm({ profile, locations, schools }: ProfileFormProps) {
  const navigate = useNavigate()
  const today = getVietnamToday()
  const saveMutation = useRoommateMutation(saveMyRoommateProfile)
  const { control, handleSubmit, setValue, getValues, trigger } = useForm<RoommateProfileFormValues>({
    mode: 'onTouched',
    defaultValues: profile ? toRoommateProfileFormValues(profile) : EMPTY_ROOMMATE_PROFILE_FORM,
  })

  const city = useWatch({ control, name: 'city' })
  const visibility = useWatch({ control, name: 'visibility' })
  const occupationType = useWatch({ control, name: 'occupationType' })
  const schoolCode = useWatch({ control, name: 'schoolCode' })
  const typesName = needsTypedOrganizationName({ occupationType, schoolCode })
  const wards = useMemo(() => locations.find((location) => location.city === city)?.wards ?? [], [locations, city])
  const searchWardsOfCity = useCallback((query: string) => searchWards(wards, query), [wards])

  if (getApiErrorInfo(saveMutation.error).status === 409) {
    return <ApiErrorAlert error={saveMutation.error} />
  }

  const submit = handleSubmit((values) => {
    saveMutation.mutate(toRoommateProfileRequest(values), {
      onSuccess: () => {
        if (profile) {
          toast.success('Đã lưu hồ sơ ở ghép')
        } else {
          toast.success('Đã tạo hồ sơ ở ghép')
          void navigate('/tenant/roommate')
        }
      },
    })
  })

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-6">
      <FormSection title="Bạn và bạn ở ghép" description="Hai hồ sơ chỉ được gợi ý cho nhau khi hợp yêu cầu giới tính của cả hai bên.">
        <FieldGroup className="grid gap-4 sm:grid-cols-2">
          <SelectField control={control} name="gender" label="Giới tính của bạn" options={GENDERS} labels={GENDER_LABELS} />
          <SelectField
            control={control}
            name="preferredRoommateGender"
            label="Muốn ở với"
            requiredMessage="Vui lòng chọn yêu cầu giới tính của bạn ở ghép."
            options={PREFERRED_ROOMMATE_GENDERS}
            labels={PREFERRED_ROOMMATE_GENDER_LABELS}
          />
        </FieldGroup>
      </FormSection>

      <FormSection title="Khu vực và ngân sách" description="Chỉ gợi ý người cùng tỉnh/thành. Ngân sách là số tiền mỗi người tự trả mỗi tháng.">
        <FieldGroup>
          <Controller
            name="city"
            control={control}
            rules={{ required: 'Vui lòng chọn tỉnh/thành.' }}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="city">
                  Tỉnh/thành <span aria-hidden="true">*</span>
                </FieldLabel>
                <NativeSelect
                  {...field}
                  id="city"
                  className="w-full"
                  aria-invalid={fieldState.invalid}
                  onChange={(event) => {
                    field.onChange(event)
                    // Tên phường/xã trùng nhau giữa các tỉnh, nên đổi tỉnh thì chọn lại phường/xã.
                    setValue('ward', '')
                  }}
                >
                  <NativeSelectOption value="">Chọn tỉnh/thành</NativeSelectOption>
                  {locations.map((location) => (
                    <NativeSelectOption key={location.city} value={location.city}>
                      {location.city}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name="ward"
            control={control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="ward">Phường/xã</FieldLabel>
                <SearchCombobox
                  id="ward"
                  items={wards}
                  search={searchWardsOfCity}
                  selectedItem={field.value === '' ? null : field.value}
                  onSelect={(ward) => field.onChange(ward ?? '')}
                  onBlur={field.onBlur}
                  inputRef={field.ref}
                  placeholder={city === '' ? 'Chọn tỉnh/thành trước' : 'Gõ để tìm phường/xã'}
                  emptyText="Không tìm thấy phường/xã."
                  disabled={city === ''}
                  invalid={fieldState.invalid}
                />
                <FieldDescription>Bỏ trống nếu ở đâu trong tỉnh/thành cũng được.</FieldDescription>
              </Field>
            )}
          />

          <div className="grid gap-4 sm:grid-cols-2">
            <BudgetField
              control={control}
              name="budgetMin"
              label="Ngân sách tối thiểu"
              validate={validateBudget}
              onCommitted={() => {
                // Ô tối đa đã được kiểm tra theo số tối thiểu cũ.
                if (getValues('budgetMax') !== '') void trigger('budgetMax')
              }}
            />
            <BudgetField
              control={control}
              name="budgetMax"
              label="Ngân sách tối đa"
              validate={(value) => validateBudgetMax(value, getValues('budgetMin'))}
            />
          </div>
        </FieldGroup>
      </FormSection>

      <FormSection title="Thói quen sinh hoạt" description="Mục giống nhau được tính điểm cao hơn.">
        <FieldGroup className="grid gap-4 sm:grid-cols-2">
          <SelectField control={control} name="sleepTime" label="Giờ ngủ" options={SLEEP_TIMES} labels={SLEEP_TIME_LABELS} />
          <SelectField control={control} name="cooking" label="Nấu ăn" options={COOKING_FREQUENCIES} labels={COOKING_LABELS} />
          <SelectField control={control} name="noiseLevel" label="Độ ồn" options={NOISE_LEVELS} labels={NOISE_LEVEL_LABELS} />
          <SelectField control={control} name="smokes" label="Hút thuốc" options={YES_NO} labels={YES_NO_LABELS} />
          <SelectField control={control} name="hasPet" label="Nuôi thú cưng" options={YES_NO} labels={YES_NO_LABELS} />
        </FieldGroup>
      </FormSection>

      <FormSection title="Trường học hoặc nơi làm việc">
        <FieldGroup className="grid gap-4 sm:grid-cols-2">
          <SelectField
            control={control}
            name="occupationType"
            label="Bạn đang"
            requiredMessage="Vui lòng chọn đang đi học hay đi làm."
            options={OCCUPATION_TYPES}
            labels={OCCUPATION_TYPE_LABELS}
          />
          {occupationType === 'SinhVien' && (
            <Controller
              name="schoolCode"
              control={control}
              rules={{
                // Đổi sang Đi làm thì ô này ẩn đi: không bắt chọn trường nữa.
                validate: (value) => getValues('occupationType') !== 'SinhVien' || value !== '' || 'Vui lòng chọn trường.',
              }}
              render={({ field, fieldState }) => (
                <Field data-invalid={fieldState.invalid}>
                  <FieldLabel htmlFor="schoolCode">
                    Trường <span aria-hidden="true">*</span>
                  </FieldLabel>
                  <SchoolCombobox
                    schools={schools}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    inputRef={field.ref}
                    invalid={fieldState.invalid}
                  />
                  <FieldDescription>Không thấy trường của bạn thì chọn Trường khác ở cuối danh sách.</FieldDescription>
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          )}
          {typesName && (
            <Controller
              name="organizationName"
              control={control}
              rules={{
                validate: (value) => {
                  // Ô ẩn (đã chọn trường trong danh mục) thì không kiểm tra.
                  if (!needsTypedOrganizationName(getValues())) return true
                  if (value.trim() === '') {
                    return getValues('occupationType') === 'SinhVien'
                      ? 'Vui lòng nhập tên trường.'
                      : 'Vui lòng nhập tên công ty hoặc nơi làm việc.'
                  }
                  return (
                    value.trim().length <= MAX_ORGANIZATION_NAME_LENGTH ||
                    `Tên tối đa ${MAX_ORGANIZATION_NAME_LENGTH} ký tự.`
                  )
                },
              }}
              render={({ field, fieldState }) => (
                <Field
                  data-invalid={fieldState.invalid}
                  className={occupationType === 'SinhVien' ? 'sm:col-span-2' : undefined}
                >
                  <FieldLabel htmlFor="organizationName">
                    {ORGANIZATION_NAME_LABELS[occupationType]} <span aria-hidden="true">*</span>
                  </FieldLabel>
                  <Input
                    {...field}
                    id="organizationName"
                    placeholder={ORGANIZATION_NAME_PLACEHOLDERS[occupationType]}
                    disabled={occupationType === ''}
                    aria-invalid={fieldState.invalid}
                  />
                  {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                </Field>
              )}
            />
          )}
        </FieldGroup>
      </FormSection>

      <FormSection title="Chuyển vào và hiển thị">
        <FieldGroup className="grid gap-4 sm:grid-cols-2">
          <Controller
            name="moveInFrom"
            control={control}
            rules={{ validate: (value) => validateMoveInFrom(value, today) }}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor="moveInFrom">
                  Chuyển vào từ ngày <span aria-hidden="true">*</span>
                </FieldLabel>
                <Input {...field} id="moveInFrom" type="date" min={today} aria-invalid={fieldState.invalid} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />
          <Controller
            name="visibility"
            control={control}
            render={({ field }) => (
              <Field>
                <FieldLabel htmlFor="visibility">
                  Mức hiển thị <span aria-hidden="true">*</span>
                </FieldLabel>
                <NativeSelect {...field} id="visibility" className="w-full">
                  {ROOMMATE_PROFILE_VISIBILITIES.map((value) => (
                    <NativeSelectOption key={value} value={value}>
                      {VISIBILITY_LABELS[value]}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldDescription>{VISIBILITY_DESCRIPTIONS[visibility]}</FieldDescription>
              </Field>
            )}
          />
        </FieldGroup>
      </FormSection>

      <ApiErrorAlert error={saveMutation.error} />

      <div className="flex flex-col gap-2 md:flex-row md:justify-end">
        <Button type="submit" size="page" disabled={saveMutation.isPending}>
          {saveMutation.isPending && <Spinner />}
          {profile ? 'Lưu hồ sơ' : 'Tạo hồ sơ'}
        </Button>
      </div>
    </form>
  )
}

const YES_NO = ['false', 'true'] as const
const YES_NO_LABELS: Record<(typeof YES_NO)[number], string> = { false: 'Không', true: 'Có' }

type SelectFieldName = Extract<
  FieldPath<RoommateProfileFormValues>,
  | 'gender'
  | 'preferredRoommateGender'
  | 'sleepTime'
  | 'smokes'
  | 'hasPet'
  | 'cooking'
  | 'noiseLevel'
  | 'occupationType'
>

interface SelectFieldProps<Option extends string> {
  control: Control<RoommateProfileFormValues>
  name: SelectFieldName
  label: string
  /** Câu lỗi khi chưa chọn; mặc định ghép từ nhãn. */
  requiredMessage?: string
  options: readonly Option[]
  labels: Record<Option, string>
}

/** Một mục chọn từ danh sách cố định, bắt buộc chọn. */
function SelectField<Option extends string>({
  control,
  name,
  label,
  requiredMessage,
  options,
  labels,
}: SelectFieldProps<Option>) {
  return (
    <Controller
      name={name}
      control={control}
      rules={{ required: requiredMessage ?? `Vui lòng chọn ${label.toLowerCase()}.` }}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid}>
          <FieldLabel htmlFor={name}>
            {label} <span aria-hidden="true">*</span>
          </FieldLabel>
          <NativeSelect {...field} id={name} className="w-full" aria-invalid={fieldState.invalid}>
            <NativeSelectOption value="">Chọn</NativeSelectOption>
            {options.map((option) => (
              <NativeSelectOption key={option} value={option}>
                {labels[option]}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  )
}

// Ô tên đổi nhãn theo loại: Trường khác của sinh viên, hoặc công ty của người đi làm; chưa chọn loại thì khóa ô.
const ORGANIZATION_NAME_LABELS: Record<RoommateProfileFormValues['occupationType'], string> = {
  '': 'Tên trường hoặc công ty',
  SinhVien: 'Tên trường',
  DiLam: 'Tên công ty hoặc nơi làm việc',
}
const ORGANIZATION_NAME_PLACEHOLDERS: Record<RoommateProfileFormValues['occupationType'], string> = {
  '': 'Chọn đang đi học hay đi làm trước',
  SinhVien: 'Gõ đầy đủ tên trường',
  DiLam: 'Ví dụ: FPT Software',
}

const SCHOOL_TYPE_LABELS: Record<School['type'], string> = { DaiHoc: 'Đại học', CaoDang: 'Cao đẳng' }

/** Số trường khớp nhất hiện trong ô chọn trường; muốn thấy trường khác thì gõ thêm chữ. */
const MAX_SCHOOL_RESULTS = 8

/** Mục cuối của ô chọn trường: trường không có trong danh mục thì gõ tên (FR-112). */
const OTHER_SCHOOL_OPTION: School = { code: OTHER_SCHOOL, name: 'Trường khác', type: 'DaiHoc', city: null, aliases: [] }

interface SchoolComboboxProps {
  schools: School[]
  /** Mã trường đã chọn, `OTHER_SCHOOL` hoặc chuỗi rỗng. */
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  inputRef: Ref<HTMLInputElement>
  invalid: boolean
}

/**
 * Ô chọn trường trong danh mục (`GET /schools`), tìm theo tên bỏ dấu, tên viết tắt hoặc thành phố. Danh mục
 * gần 700 trường nên chưa gõ gì thì chỉ hiện trường đang chọn (nếu có), gõ rồi thì chỉ hiện
 * `MAX_SCHOOL_RESULTS` trường khớp nhất. Trường khác luôn là mục cuối, kể cả khi không trường nào khớp chữ gõ.
 */
function SchoolCombobox({ schools, value, onChange, onBlur, inputRef, invalid }: SchoolComboboxProps) {
  const selected = useMemo(
    () => (value === OTHER_SCHOOL ? OTHER_SCHOOL_OPTION : (schools.find((school) => school.code === value) ?? null)),
    [schools, value],
  )
  // Mở ô đã chọn mà chưa gõ gì thì chỉ hiện trường đang chọn và Trường khác: ô tô sẵn mục đầu, nên nhấn
  // Enter chọn lại đúng trường đó. Base UI lấy các mục này từ đầu `items` (xem `limit` của SearchCombobox).
  const pinned = useMemo(
    () => (selected && selected !== OTHER_SCHOOL_OPTION ? [selected, OTHER_SCHOOL_OPTION] : [OTHER_SCHOOL_OPTION]),
    [selected],
  )
  const items = useMemo(
    () => [...pinned, ...schools.filter((school) => !pinned.includes(school))],
    [pinned, schools],
  )
  const search = useCallback(
    (query: string) =>
      query.trim() === ''
        ? pinned
        : [...searchSchools(schools, query).slice(0, MAX_SCHOOL_RESULTS), OTHER_SCHOOL_OPTION],
    [schools, pinned],
  )

  return (
    <SearchCombobox
      id="schoolCode"
      items={items}
      search={search}
      selectedItem={selected}
      onSelect={(item) => onChange(item?.code ?? '')}
      onBlur={onBlur}
      inputRef={inputRef}
      itemToLabel={(item) => item.name}
      itemToKey={(item) => item.code}
      renderItem={(item) =>
        item.code === OTHER_SCHOOL ? (
          <span className="flex flex-col">
            <span className="font-medium">Trường khác</span>
            <span className="text-xs text-muted-foreground">Trường không có trong danh sách, gõ tên ở ô bên dưới</span>
          </span>
        ) : (
          <span className="flex flex-col">
            <span className="wrap-anywhere">{item.name}</span>
            <span className="text-xs text-muted-foreground">
              {SCHOOL_TYPE_LABELS[item.type]}
              {item.city ? ` · ${item.city}` : ''}
            </span>
          </span>
        )
      }
      placeholder="Gõ tên trường hoặc tên viết tắt, ví dụ UIT"
      emptyText="Không tìm thấy trường."
      invalid={invalid}
      limit={pinned.length}
    />
  )
}

interface BudgetFieldProps {
  control: Control<RoommateProfileFormValues>
  name: 'budgetMin' | 'budgetMax'
  label: string
  validate: (value: string) => true | string
  onCommitted?: () => void
}

/** Ô số tiền đồng; hiện dấu chấm hàng nghìn khi rời ô (docs/design-system.md mục 8). */
function BudgetField({ control, name, label, validate, onCommitted }: BudgetFieldProps) {
  const [focused, setFocused] = useState(false)

  return (
    <Controller
      name={name}
      control={control}
      rules={{ validate }}
      render={({ field, fieldState }) => {
        const display =
          !focused && validateBudget(field.value) === true
            ? Number(field.value.replace(/\./g, '')).toLocaleString('vi-VN')
            : field.value
        return (
          <Field data-invalid={fieldState.invalid}>
            <FieldLabel htmlFor={name}>
              {label} <span aria-hidden="true">*</span>
            </FieldLabel>
            <UnitInput
              unit="đ/tháng"
              id={name}
              ref={field.ref}
              value={display}
              inputMode="numeric"
              className="tabular-nums"
              aria-invalid={fieldState.invalid}
              onFocus={() => setFocused(true)}
              onBlur={() => {
                setFocused(false)
                field.onBlur()
                onCommitted?.()
              }}
              onChange={(event) => field.onChange(event.target.value)}
            />
            {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
          </Field>
        )
      }}
    />
  )
}

/** Mục Đã chặn: các lượt mình đã chặn, mỗi dòng có nút Bỏ chặn (FR-118). */
function BlockList() {
  const blocksQuery = useRoommateBlocks()

  return (
    <FormSection
      title="Đã chặn"
      description="Người bị chặn và bạn không thấy hồ sơ của nhau, không gửi lời mời cho nhau được. Bỏ chặn không khôi phục lời mời đã rút."
    >
      {blocksQuery.isPending ? (
        <Skeleton className="h-12 w-full" />
      ) : blocksQuery.isError ? (
        <ApiErrorAlert error={blocksQuery.error} onRetry={() => void blocksQuery.refetch()} />
      ) : blocksQuery.data.length === 0 ? (
        <Empty className="p-4">
          <EmptyHeader>
            <EmptyTitle className="text-sm">Bạn chưa chặn ai</EmptyTitle>
            <EmptyDescription>Chặn một hồ sơ ở trang Tìm bạn ở ghép hoặc Lời mời ở ghép.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="flex flex-col divide-y">
          {blocksQuery.data.map((block) => (
            <BlockRow key={block.id} block={block} />
          ))}
        </ul>
      )}
    </FormSection>
  )
}

function BlockRow({ block }: { block: RoommateBlock }) {
  const unblockMutation = useRoommateMutation(() => unblockRoommate(block.id))

  return (
    <li className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <ShieldBan className="size-5 shrink-0 text-muted-foreground" />
          <div className="flex min-w-0 flex-col">
            <span className="text-sm font-medium">Đã chặn ngày {formatDate(block.blockedAt)}</span>
            {block.profileId === null && (
              <span className="text-xs text-muted-foreground">Người này không còn hồ sơ ở ghép</span>
            )}
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={unblockMutation.isPending}
          onClick={() => unblockMutation.mutate(undefined, { onSuccess: () => toast.success('Đã bỏ chặn') })}
        >
          {unblockMutation.isPending && <Spinner />}
          Bỏ chặn
        </Button>
      </div>
      <ApiErrorAlert error={unblockMutation.error} />
    </li>
  )
}
