import type {
  CookingFrequency,
  Gender,
  MyRoommateProfile,
  NoiseLevel,
  OccupationType,
  PreferredRoommateGender,
  RoommateProfileRequest,
  RoommateProfileVisibility,
  SleepTime,
} from '@/types/roommateTypes'
import { normalizeRoomMoney } from '@/utils/validateRoomInput'

/** Giá trị của form hồ sơ ở ghép (T7). Ô chọn để trống là chuỗi rỗng, số tiền giữ chuỗi người dùng gõ. */
export interface RoommateProfileFormValues {
  gender: Gender | ''
  preferredRoommateGender: PreferredRoommateGender | ''
  city: string
  ward: string
  budgetMin: string
  budgetMax: string
  sleepTime: SleepTime | ''
  smokes: 'true' | 'false' | ''
  hasPet: 'true' | 'false' | ''
  cooking: CookingFrequency | ''
  noiseLevel: NoiseLevel | ''
  occupationType: OccupationType | ''
  organizationName: string
  moveInFrom: string
  visibility: RoommateProfileVisibility
}

export const EMPTY_ROOMMATE_PROFILE_FORM: RoommateProfileFormValues = {
  gender: '',
  preferredRoommateGender: '',
  city: '',
  ward: '',
  budgetMin: '',
  budgetMax: '',
  sleepTime: '',
  smokes: '',
  hasPet: '',
  cooking: '',
  noiseLevel: '',
  occupationType: '',
  organizationName: '',
  moveInFrom: '',
  visibility: 'CongKhai',
}

export const MAX_ORGANIZATION_NAME_LENGTH = 200
const MAX_BUDGET = 999_999_999_999

/** Hồ sơ đang có → giá trị ban đầu của form sửa. */
export function toRoommateProfileFormValues(profile: MyRoommateProfile): RoommateProfileFormValues {
  return {
    gender: profile.gender,
    preferredRoommateGender: profile.preferredRoommateGender,
    city: profile.city,
    ward: profile.ward ?? '',
    budgetMin: String(profile.budgetMin),
    budgetMax: String(profile.budgetMax),
    sleepTime: profile.sleepTime,
    smokes: profile.smokes ? 'true' : 'false',
    hasPet: profile.hasPet ? 'true' : 'false',
    cooking: profile.cooking,
    noiseLevel: profile.noiseLevel,
    occupationType: profile.occupationType,
    organizationName: profile.organizationName,
    moveInFrom: profile.moveInFrom,
    visibility: profile.visibility,
  }
}

/** Một mức ngân sách: đồng nguyên lớn hơn 0 (FR-110). Nhận cả kiểu gõ "3.000.000". */
export function validateBudget(input: string): true | string {
  const value = normalizeRoomMoney(input)
  if (value === '') return 'Vui lòng nhập số tiền.'
  if (!/^\d+$/.test(value)) return 'Nhập số đồng nguyên, không có phần lẻ.'
  if (Number(value) === 0) return 'Số tiền phải lớn hơn 0.'
  if (Number(value) > MAX_BUDGET) return 'Số tiền tối đa 999.999.999.999 đồng.'
  return true
}

/** Ngân sách tối đa không được nhỏ hơn tối thiểu (FR-110); chỉ so khi cả hai ô đều hợp lệ. */
export function validateBudgetMax(maxInput: string, minInput: string): true | string {
  const maxResult = validateBudget(maxInput)
  if (maxResult !== true) return maxResult
  if (validateBudget(minInput) !== true) return true
  return Number(normalizeRoomMoney(maxInput)) >= Number(normalizeRoomMoney(minInput))
    ? true
    : 'Ngân sách tối đa phải lớn hơn hoặc bằng tối thiểu.'
}

/** Thời điểm chuyển vào không được trước hôm nay theo giờ Việt Nam (FR-105). */
export function validateMoveInFrom(value: string, today: string): true | string {
  if (value === '') return 'Vui lòng chọn thời điểm chuyển vào.'
  return value >= today || 'Thời điểm chuyển vào không được trước hôm nay.'
}

/**
 * Form đã qua kiểm tra → body của `PUT /roommate-profiles/me`. Phường để trống gửi `null` (FR-109); tên
 * trường hoặc công ty bỏ khoảng trắng hai đầu.
 */
export function toRoommateProfileRequest(values: RoommateProfileFormValues): RoommateProfileRequest {
  return {
    gender: values.gender as Gender,
    preferredRoommateGender: values.preferredRoommateGender as PreferredRoommateGender,
    city: values.city,
    ward: values.ward === '' ? null : values.ward,
    budgetMin: Number(normalizeRoomMoney(values.budgetMin)),
    budgetMax: Number(normalizeRoomMoney(values.budgetMax)),
    sleepTime: values.sleepTime as SleepTime,
    smokes: values.smokes === 'true',
    hasPet: values.hasPet === 'true',
    cooking: values.cooking as CookingFrequency,
    noiseLevel: values.noiseLevel as NoiseLevel,
    occupationType: values.occupationType as OccupationType,
    organizationName: values.organizationName.trim(),
    moveInFrom: values.moveInFrom,
    visibility: values.visibility,
  }
}
