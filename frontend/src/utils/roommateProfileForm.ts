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
  /**
   * Sinh viên: mã trường đã chọn trong danh mục, `OTHER_SCHOOL` khi chọn Trường khác, chuỗi rỗng khi
   * chưa chọn. Đi làm thì bỏ qua.
   */
  schoolCode: string
  /** Tên công ty, hoặc tên trường khi chọn Trường khác. */
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
  schoolCode: '',
  organizationName: '',
  moveInFrom: '',
  visibility: 'CongKhai',
}

export const MAX_ORGANIZATION_NAME_LENGTH = 200

/** Giá trị của mục Trường khác ở ô chọn trường; không trùng mã trường nào (mã chỉ gồm chữ thường, số, gạch). */
export const OTHER_SCHOOL = '__truong-khac__'

/** Ô chọn trường đang ở Trường khác hoặc đi làm, nên phải gõ tên. */
export function needsTypedOrganizationName(values: Pick<RoommateProfileFormValues, 'occupationType' | 'schoolCode'>) {
  return values.occupationType !== 'SinhVien' || values.schoolCode === OTHER_SCHOOL
}
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
    // Hồ sơ sinh viên lưu trước khi có danh mục, hoặc chọn Trường khác, không có mã: mở lại ở Trường khác.
    schoolCode: profile.occupationType === 'SinhVien' ? (profile.schoolCode ?? OTHER_SCHOOL) : '',
    organizationName: profile.schoolCode === null ? profile.organizationName : '',
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
 * Form đã qua kiểm tra → body của `PUT /roommate-profiles/me`. Phường để trống gửi `null` (FR-109). Sinh viên
 * chọn trường trong danh mục thì gửi mã, tên là `null`; Trường khác hoặc đi làm thì gửi tên đã gõ, bỏ khoảng
 * trắng hai đầu, mã là `null` (FR-112).
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
    schoolCode: needsTypedOrganizationName(values) ? null : values.schoolCode,
    organizationName: needsTypedOrganizationName(values) ? values.organizationName.trim() : null,
    moveInFrom: values.moveInFrom,
    visibility: values.visibility,
  }
}
