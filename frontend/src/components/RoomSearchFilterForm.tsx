import { useCallback, useMemo, useState } from 'react'
import { Controller, useForm, useWatch, type Control, type FieldPathByValue } from 'react-hook-form'
import SearchCombobox from '@/components/SearchCombobox'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Field, FieldError, FieldGroup, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import type { Amenity } from '@/types/amenityTypes'
import type { Location } from '@/types/locationTypes'
import type { RoomSearchFormValues, RoomSearchParams } from '@/types/roomSearchTypes'
import {
  fromRoomSearchFormValues,
  isRangeValid,
  parseSearchArea,
  parseSearchMoney,
  toRoomSearchFormValues,
  validateSearchArea,
  validateSearchMoney,
  validateSearchOccupants,
} from '@/utils/roomSearchParams'
import { searchWards } from '@/utils/searchWards'
import { normalizeRoomMoney, toRoomAreaInput } from '@/utils/validateRoomInput'

interface RoomSearchFilterFormProps {
  /** Bộ lọc đang áp dụng (đọc từ URL); form chỉ đọc lúc dựng, trang dựng lại form khi URL đổi. */
  params: RoomSearchParams
  locations: Location[]
  amenities: Amenity[]
  onApply: (params: RoomSearchParams) => void
  onClear: () => void
}

/**
 * Bộ lọc của P1 (docs/frontend-screens.md mục 2): tỉnh/thành → phường/xã, khoảng giá, khoảng diện
 * tích, số người, tiện ích. Bấm "Tìm phòng" mới ghi lên URL, để gõ giá không gọi API theo từng phím.
 * Kiểm tra trước các trường hợp `400` của docs/api-design.md mục 6.
 */
export default function RoomSearchFilterForm({
  params,
  locations,
  amenities,
  onApply,
  onClear,
}: RoomSearchFilterFormProps) {
  const form = useForm<RoomSearchFormValues>({
    defaultValues: toRoomSearchFormValues(params),
    mode: 'onTouched',
  })
  const { control, handleSubmit, setValue } = form

  const city = useWatch({ control, name: 'city' })
  const wards = useMemo(() => locations.find((location) => location.city === city)?.wards ?? [], [locations, city])
  const searchWardsOfCity = useCallback((query: string) => searchWards(wards, query), [wards])
  // Tỉnh/thành trên URL không có trong danh mục (đường dẫn cũ, gõ tay) vẫn hiện trong ô để người dùng
  // thấy bộ lọc đang áp dụng và bỏ được.
  const cityOptions = useMemo(() => {
    const names = locations.map((location) => location.city)
    return params.city && !names.includes(params.city) ? [params.city, ...names] : names
  }, [locations, params.city])

  const submit = handleSubmit((values) =>
    onApply(fromRoomSearchFormValues(values, { sortBy: params.sortBy, sortDirection: params.sortDirection })),
  )

  return (
    <form noValidate onSubmit={submit} className="flex flex-col gap-6 rounded-xl border bg-card p-4">
      <FieldGroup className="gap-5">
        <Controller
          name="city"
          control={control}
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor="search-city">Tỉnh/thành</FieldLabel>
              <NativeSelect
                {...field}
                id="search-city"
                className="w-full"
                onChange={(event) => {
                  field.onChange(event)
                  // Tên phường/xã trùng nhau giữa các tỉnh, nên đổi tỉnh thì chọn lại phường/xã.
                  setValue('ward', '')
                }}
              >
                <NativeSelectOption value="">Tất cả tỉnh/thành</NativeSelectOption>
                {cityOptions.map((name) => (
                  <NativeSelectOption key={name} value={name}>
                    {name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            </Field>
          )}
        />

        <Controller
          name="ward"
          control={control}
          render={({ field }) => (
            <Field>
              <FieldLabel htmlFor="search-ward">Phường/xã</FieldLabel>
              <SearchCombobox
                id="search-ward"
                items={wards}
                search={searchWardsOfCity}
                selectedItem={field.value === '' ? null : field.value}
                onSelect={(ward) => field.onChange(ward ?? '')}
                onBlur={field.onBlur}
                inputRef={field.ref}
                placeholder={city === '' ? 'Chọn tỉnh/thành trước' : 'Tất cả phường/xã'}
                emptyText="Không tìm thấy phường/xã."
                disabled={city === ''}
                invalid={false}
              />
            </Field>
          )}
        />

        <RangeFields
          control={control}
          legend="Giá thuê (đồng/tháng)"
          minName="minPrice"
          maxName="maxPrice"
          kind="money"
          rangeMessage="Giá đến phải lớn hơn hoặc bằng giá từ."
        />

        <RangeFields
          control={control}
          legend="Diện tích (m²)"
          minName="minArea"
          maxName="maxArea"
          kind="area"
          rangeMessage="Diện tích đến phải lớn hơn hoặc bằng diện tích từ."
        />

        <Controller
          name="minOccupants"
          control={control}
          rules={{ validate: validateSearchOccupants }}
          render={({ field, fieldState }) => (
            <Field data-invalid={fieldState.invalid}>
              <FieldLabel htmlFor="search-minOccupants">Số người ở</FieldLabel>
              <Input
                {...field}
                id="search-minOccupants"
                inputMode="numeric"
                placeholder="Ví dụ: 2"
                className="tabular-nums"
                aria-invalid={fieldState.invalid}
              />
              {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
            </Field>
          )}
        />

        {amenities.length > 0 && (
          <Controller
            name="amenityIds"
            control={control}
            render={({ field }) => (
              <FieldSet>
                <FieldLegend variant="label">Tiện ích</FieldLegend>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-1">
                  {amenities.map((amenity) => (
                    <Field key={amenity.id} orientation="horizontal">
                      <Checkbox
                        id={`search-amenity-${amenity.id}`}
                        checked={field.value.includes(amenity.id)}
                        onBlur={field.onBlur}
                        onCheckedChange={(checked) =>
                          field.onChange(
                            checked === true
                              ? [...field.value, amenity.id]
                              : field.value.filter((id) => id !== amenity.id),
                          )
                        }
                      />
                      <FieldLabel htmlFor={`search-amenity-${amenity.id}`} className="font-normal">
                        {amenity.name}
                      </FieldLabel>
                    </Field>
                  ))}
                </div>
              </FieldSet>
            )}
          />
        )}
      </FieldGroup>

      <div className="flex flex-col gap-2">
        <Button type="submit">Tìm phòng</Button>
        <Button type="button" variant="ghost" onClick={onClear}>
          Xóa bộ lọc
        </Button>
      </div>
    </form>
  )
}

type RangeFieldName = FieldPathByValue<RoomSearchFormValues, string>

interface RangeFieldsProps {
  control: Control<RoomSearchFormValues>
  legend: string
  minName: RangeFieldName
  maxName: RangeFieldName
  kind: 'money' | 'area'
  rangeMessage: string
}

/** Hai ô "Từ", "Đến" của một khoảng; ô "Đến" báo lỗi khi nhỏ hơn ô "Từ". */
function RangeFields({ control, legend, minName, maxName, kind, rangeMessage }: RangeFieldsProps) {
  const validate = kind === 'money' ? validateSearchMoney : validateSearchArea
  const parse = kind === 'money' ? parseSearchMoney : parseSearchArea

  return (
    <FieldSet>
      <FieldLegend variant="label">{legend}</FieldLegend>
      <div className="grid grid-cols-2 gap-3">
        <RangeInput
          control={control}
          name={minName}
          label="Từ"
          kind={kind}
          // Sửa ô "Từ" thì kiểm lại ô "Đến" đã nhập.
          rules={{ validate, deps: [maxName] }}
        />
        <RangeInput
          control={control}
          name={maxName}
          label="Đến"
          kind={kind}
          rules={{
            validate: (value, values) => {
              const result = validate(value)
              if (result !== true) return result
              return isRangeValid(parse(values[minName]), parse(value)) || rangeMessage
            },
          }}
        />
      </div>
    </FieldSet>
  )
}

interface RangeInputProps {
  control: Control<RoomSearchFormValues>
  name: RangeFieldName
  label: string
  kind: 'money' | 'area'
  rules: { validate: (value: string, values: RoomSearchFormValues) => true | string; deps?: RangeFieldName[] }
}

/**
 * Ô số của khoảng. Rời ô thì dọn chuỗi như form phòng: tiền chỉ còn chữ số và hiện dấu chấm hàng nghìn
 * khi không chọn (docs/design-system.md mục 8), diện tích dùng dấu phẩy thập phân.
 */
function RangeInput({ control, name, label, kind, rules }: RangeInputProps) {
  const [focused, setFocused] = useState(false)
  const id = `search-${name}`
  const normalize = kind === 'money' ? normalizeRoomMoney : toRoomAreaInput

  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field, fieldState }) => (
        <Field data-invalid={fieldState.invalid} className="min-w-0">
          <FieldLabel htmlFor={id} className="font-normal text-muted-foreground">
            {label}
          </FieldLabel>
          <Input
            {...field}
            id={id}
            inputMode={kind === 'money' ? 'numeric' : 'decimal'}
            className="tabular-nums"
            aria-invalid={fieldState.invalid}
            value={
              kind === 'money' && !focused && field.value !== '' && validateSearchMoney(field.value) === true
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
