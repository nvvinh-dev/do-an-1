import type {
  CookingFrequency,
  Gender,
  NoiseLevel,
  OccupationType,
  PreferredRoommateGender,
  RoommateMatchScores,
  RoommateProfileVisibility,
  SleepTime,
} from '@/types/roommateTypes'

// Nhãn tiếng Việt của các mục trong hồ sơ ở ghép, theo đúng chữ ở FR-106, FR-108, FR-111, FR-112.

export const GENDER_LABELS: Record<Gender, string> = {
  Nam: 'Nam',
  Nu: 'Nữ',
}

export const PREFERRED_ROOMMATE_GENDER_LABELS: Record<PreferredRoommateGender, string> = {
  ChiNam: 'Chỉ nam',
  ChiNu: 'Chỉ nữ',
  KhongYeuCau: 'Không yêu cầu',
}

export const SLEEP_TIME_LABELS: Record<SleepTime, string> = {
  Truoc23Gio: 'Trước 23 giờ',
  Tu23Den1Gio: 'Từ 23 giờ tới 1 giờ',
  Sau1Gio: 'Sau 1 giờ',
}

export const COOKING_LABELS: Record<CookingFrequency, string> = {
  ThuongXuyen: 'Thường xuyên',
  ThinhThoang: 'Thỉnh thoảng',
  Khong: 'Không',
}

export const NOISE_LEVEL_LABELS: Record<NoiseLevel, string> = {
  YenTinh: 'Yên tĩnh',
  BinhThuong: 'Bình thường',
  On: 'Ồn',
}

export const OCCUPATION_TYPE_LABELS: Record<OccupationType, string> = {
  SinhVien: 'Sinh viên',
  DiLam: 'Đi làm',
}

export const VISIBILITY_LABELS: Record<RoommateProfileVisibility, string> = {
  CongKhai: 'Công khai',
  ChiKhiToiKetNoi: 'Chỉ khi tôi kết nối',
}

export const VISIBILITY_DESCRIPTIONS: Record<RoommateProfileVisibility, string> = {
  CongKhai: 'Hồ sơ xuất hiện trong danh sách gợi ý của người thuê khác phù hợp với bạn.',
  ChiKhiToiKetNoi: 'Hồ sơ không xuất hiện trong danh sách nào; chỉ người nhận lời mời của bạn xem được.',
}

export const yesNoLabel = (value: boolean): string => (value ? 'Có' : 'Không')

/** Tiêu chí của điểm phù hợp, theo thứ tự và trọng số ở FR-113. */
export const MATCH_CRITERIA: { key: keyof RoommateMatchScores; label: string; weight: number }[] = [
  { key: 'budget', label: 'Ngân sách', weight: 30 },
  { key: 'habits', label: 'Thói quen', weight: 30 },
  { key: 'area', label: 'Khu vực', weight: 25 },
  { key: 'organization', label: 'Trường hoặc nơi làm', weight: 15 },
]

/** Điểm một tiêu chí (0 tới 1) hiện dạng phần trăm nguyên: 0,5 → "50%". */
export function formatCriterionScore(score: number): string {
  return `${Math.round(Math.min(1, Math.max(0, score)) * 100)}%`
}
