import { Archive } from 'lucide-react'
import { useMemo, type ReactNode } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { Link, useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import PageHeader from '@/components/PageHeader'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from '@/components/ui/combobox'
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
import { useAmenities } from '@/hooks/useAmenities'
import { useCreateProperty } from '@/hooks/useCreateProperty'
import { useLocations } from '@/hooks/useLocations'
import { useProperty } from '@/hooks/useProperty'
import { useUpdateProperty } from '@/hooks/useUpdateProperty'
import { isNotFoundError } from '@/lib/apiError'
import NotFoundPage from '@/pages/public/NotFoundPage'
import type { Amenity } from '@/types/amenityTypes'
import type { Location } from '@/types/locationTypes'
import type { PropertyDetail, PropertyRequest } from '@/types/propertyTypes'
import { normalizeSearchText } from '@/utils/normalizeSearchText'

interface PropertyFormValues {
  name: string
  address: string
  city: string
  ward: string
  description: string
  amenityIds: number[]
}

const EMPTY_VALUES: PropertyFormValues = {
  name: '',
  address: '',
  city: '',
  ward: '',
  description: '',
  amenityIds: [],
}

/**
 * L2 — Thêm khu trọ (`/landlord/properties/new`) và sửa khu trọ (`/landlord/properties/:id/edit`),
 * docs/frontend-screens.md mục 6. Body và mã lỗi theo docs/api-design.md mục 5.1. Lưu xong thì
 * sang trang chi tiết của khu trọ (mục 8).
 */
export default function PropertyFormPage() {
  const { id } = useParams()
  return id === undefined ? <CreatePropertyForm /> : <EditPropertyForm propertyId={Number(id)} />
}

function CreatePropertyForm() {
  const createMutation = useCreateProperty()
  const navigate = useNavigate()

  return (
    <PropertyFormLayout title="Thêm khu trọ" description="Khai báo địa chỉ và tiện ích chung của khu trọ.">
      <CatalogGate>
        {(catalogs) => (
          <PropertyForm
            {...catalogs}
            defaultValues={EMPTY_VALUES}
            // Form chưa có phần ảnh: khu trọ mới chưa có ảnh nào.
            imagePaths={[]}
            submitLabel="Thêm khu trọ"
            cancelTo="/landlord/properties"
            isPending={createMutation.isPending}
            error={createMutation.error}
            onSubmit={(request) =>
              createMutation.mutate(request, {
                onSuccess: (property) => {
                  toast.success('Đã thêm khu trọ')
                  navigate(`/landlord/properties/${property.id}`, { replace: true })
                },
              })
            }
          />
        )}
      </CatalogGate>
    </PropertyFormLayout>
  )
}

function EditPropertyForm({ propertyId }: { propertyId: number }) {
  // Id không phải số (`/properties/abc/edit`) thì server trả 404 như khu không thuộc mình.
  const propertyQuery = useProperty(propertyId)
  const updateMutation = useUpdateProperty(propertyId)
  const navigate = useNavigate()
  const detailPath = `/landlord/properties/${propertyId}`

  if (isNotFoundError(propertyQuery.error)) {
    return <NotFoundPage />
  }

  const property = propertyQuery.data

  return (
    <PropertyFormLayout title="Sửa khu trọ" description={property?.name}>
      {propertyQuery.isPending ? (
        <PropertyFormSkeleton />
      ) : propertyQuery.isError ? (
        <ApiErrorAlert error={propertyQuery.error} onRetry={() => void propertyQuery.refetch()} />
      ) : property?.status === 'LuuTru' ? (
        <ArchivedNotice detailPath={detailPath} />
      ) : (
        property && (
          <CatalogGate>
            {(catalogs) => (
              <PropertyForm
                {...catalogs}
                defaultValues={toFormValues(property)}
                // Form chưa sửa ảnh, nhưng `PUT` thay toàn bộ danh sách ảnh: gửi lại nguyên các ảnh
                // đang có, đúng thứ tự, để ảnh không bị mất.
                imagePaths={property.images.map((image) => image.path)}
                submitLabel="Lưu thay đổi"
                cancelTo={detailPath}
                isPending={updateMutation.isPending}
                error={updateMutation.error}
                onSubmit={(request) =>
                  updateMutation.mutate(request, {
                    onSuccess: () => {
                      toast.success('Đã lưu thay đổi')
                      navigate(detailPath, { replace: true })
                    },
                  })
                }
              />
            )}
          </CatalogGate>
        )
      )}
    </PropertyFormLayout>
  )
}

function toFormValues(property: PropertyDetail): PropertyFormValues {
  return {
    name: property.name,
    address: property.address,
    city: property.city,
    ward: property.ward,
    description: property.description ?? '',
    amenityIds: property.amenities.map((amenity) => amenity.id),
  }
}

function PropertyFormLayout({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: ReactNode
}) {
  return (
    <section className="flex w-full max-w-2xl flex-col gap-6">
      <PageHeader title={title} description={description} />
      {children}
    </section>
  )
}

/** Khu trọ đã lưu trữ chỉ còn xem được: `PUT` trả 409 (docs/api-design.md mục 5.1), nên không hiện form. */
function ArchivedNotice({ detailPath }: { detailPath: string }) {
  return (
    <Alert>
      <Archive />
      <AlertTitle>Khu trọ đã lưu trữ</AlertTitle>
      <AlertDescription className="flex flex-col items-start gap-3">
        <p>Khu trọ đã lưu trữ chỉ còn xem được, không sửa được thông tin.</p>
        <Button asChild variant="outline" size="sm">
          <Link to={detailPath}>Xem khu trọ</Link>
        </Button>
      </AlertDescription>
    </Alert>
  )
}

interface Catalogs {
  locations: Location[]
  /** Chỉ tiện ích phạm vi khu trọ; tiện ích của phòng chọn ở form phòng. */
  propertyAmenities: Amenity[]
}

/** Chờ danh mục tỉnh/thành và tiện ích tải xong rồi mới dựng form, để giá trị mặc định khớp lựa chọn. */
function CatalogGate({ children }: { children: (catalogs: Catalogs) => ReactNode }) {
  const locationsQuery = useLocations()
  const amenitiesQuery = useAmenities()

  const propertyAmenities = useMemo(
    () => amenitiesQuery.data?.filter((amenity) => amenity.scope === 'KhuTro') ?? [],
    [amenitiesQuery.data],
  )

  if (locationsQuery.isError || amenitiesQuery.isError) {
    return (
      <ApiErrorAlert
        error={locationsQuery.error ?? amenitiesQuery.error}
        onRetry={() => {
          if (locationsQuery.isError) void locationsQuery.refetch()
          if (amenitiesQuery.isError) void amenitiesQuery.refetch()
        }}
      />
    )
  }

  if (!locationsQuery.data || !amenitiesQuery.data) {
    return <PropertyFormSkeleton />
  }

  return children({ locations: locationsQuery.data, propertyAmenities })
}

function PropertyFormSkeleton() {
  return (
    <div className="flex flex-col gap-6 rounded-xl border bg-card p-4 md:p-6" aria-busy="true">
      {Array.from({ length: 4 }, (_, index) => (
        <div key={index} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <Skeleton className="h-24 w-full" />
    </div>
  )
}

interface PropertyFormProps extends Catalogs {
  defaultValues: PropertyFormValues
  imagePaths: string[]
  submitLabel: string
  cancelTo: string
  isPending: boolean
  error: unknown
  onSubmit: (request: PropertyRequest) => void
}

function PropertyForm({
  locations,
  propertyAmenities,
  defaultValues,
  imagePaths,
  submitLabel,
  cancelTo,
  isPending,
  error,
  onSubmit,
}: PropertyFormProps) {
  const { control, handleSubmit, setValue } = useForm<PropertyFormValues>({
    mode: 'onTouched',
    defaultValues,
  })

  const city = useWatch({ control, name: 'city' })
  const wards = useMemo(() => locations.find((location) => location.city === city)?.wards ?? [], [locations, city])

  const submit = handleSubmit((values) => {
    onSubmit({
      name: values.name.trim(),
      address: values.address.trim(),
      city: values.city,
      ward: values.ward,
      description: values.description.trim() === '' ? null : values.description.trim(),
      amenityIds: values.amenityIds,
      imagePaths,
    })
  })

  return (
    <form
      noValidate
      onSubmit={submit}
      className="flex flex-col gap-6 rounded-xl border bg-card p-4 text-card-foreground md:p-6"
    >
      <FieldGroup>
        <Controller
          name="name"
          control={control}
          rules={{
            validate: (value) => value.trim() !== '' || 'Vui lòng nhập tên khu trọ.',
            maxLength: { value: 200, message: 'Tên khu trọ tối đa 200 ký tự.' },
          }}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="name">
                Tên khu trọ <span aria-hidden="true">*</span>
              </FieldLabel>
              <Input {...field} id="name" placeholder="Ví dụ: Nhà trọ Hoa Mai" aria-invalid={fieldState.invalid} />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

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
          rules={{ required: 'Vui lòng chọn phường/xã.' }}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="ward">
                Phường/xã <span aria-hidden="true">*</span>
              </FieldLabel>
              <Combobox
                items={wards}
                value={field.value === '' ? null : field.value}
                onValueChange={(value: string | null) => field.onChange(value ?? '')}
                filter={(ward: string, query: string) => normalizeSearchText(ward).includes(normalizeSearchText(query))}
                disabled={city === ''}
                autoHighlight
              >
                <ComboboxInput
                  id="ward"
                  ref={field.ref}
                  className="w-full"
                  placeholder={city === '' ? 'Chọn tỉnh/thành trước' : 'Gõ để tìm phường/xã'}
                  disabled={city === ''}
                  aria-invalid={fieldState.invalid}
                  onBlur={field.onBlur}
                />
                <ComboboxContent>
                  <ComboboxEmpty>Không tìm thấy phường/xã.</ComboboxEmpty>
                  <ComboboxList>
                    {(ward: string) => (
                      <ComboboxItem key={ward} value={ward}>
                        {ward}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        <Controller
          name="address"
          control={control}
          rules={{
            validate: (value) => value.trim() !== '' || 'Vui lòng nhập địa chỉ.',
            maxLength: { value: 500, message: 'Địa chỉ tối đa 500 ký tự.' },
          }}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="address">
                Số nhà, đường <span aria-hidden="true">*</span>
              </FieldLabel>
              <Input
                {...field}
                id="address"
                placeholder="Ví dụ: 12 đường số 5"
                autoComplete="street-address"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid ? (
                <FieldError errors={[fieldState.error]} />
              ) : (
                <FieldDescription>Muốn người thuê dễ nhận biết thì ghi thêm tên quận cũ hoặc mốc gần đó.</FieldDescription>
              )}
            </Field>
          )}
        />

        <Controller
          name="description"
          control={control}
          rules={{ maxLength: { value: 2000, message: 'Mô tả tối đa 2.000 ký tự.' } }}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="description">Mô tả</FieldLabel>
              <Textarea
                {...field}
                id="description"
                rows={4}
                placeholder="Ví dụ: khu yên tĩnh, có bảo vệ, giờ giấc tự do"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {propertyAmenities.length > 0 && (
          <Controller
            name="amenityIds"
            control={control}
            render={({ field }) => (
              <FieldSet>
                <FieldLegend variant="label">Tiện ích chung của khu trọ</FieldLegend>
                <div className="grid gap-3 md:grid-cols-2">
                  {propertyAmenities.map((amenity) => {
                    const checkboxId = `amenity-${amenity.id}`
                    return (
                      <Field key={amenity.id} orientation="horizontal">
                        <Checkbox
                          id={checkboxId}
                          checked={field.value.includes(amenity.id)}
                          onCheckedChange={(checked) =>
                            field.onChange(
                              checked === true
                                ? [...field.value, amenity.id]
                                : field.value.filter((amenityId) => amenityId !== amenity.id),
                            )
                          }
                        />
                        <FieldLabel htmlFor={checkboxId} className="font-normal">
                          {amenity.name}
                        </FieldLabel>
                      </Field>
                    )
                  })}
                </div>
              </FieldSet>
            )}
          />
        )}
      </FieldGroup>

      {/* 409, 422 hiện `detail` ngay trên nút vừa bấm, dữ liệu đã nhập giữ nguyên (docs/frontend-screens.md mục 1). */}
      <ApiErrorAlert error={error} />

      <div className="flex flex-col-reverse gap-3 md:flex-row md:justify-end">
        <Button asChild variant="outline" size="page">
          <Link to={cancelTo}>Hủy</Link>
        </Button>
        <Button type="submit" size="page" disabled={isPending}>
          {isPending && <Spinner />}
          {submitLabel}
        </Button>
      </div>
    </form>
  )
}
