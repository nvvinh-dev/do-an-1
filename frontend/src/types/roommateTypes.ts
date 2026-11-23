// Ở ghép — BP-11 (docs/api-design.md mục 15). Tên trường đúng như API trả về.

export const GENDERS = ['Nam', 'Nu'] as const
export type Gender = (typeof GENDERS)[number]

export const PREFERRED_ROOMMATE_GENDERS = ['ChiNam', 'ChiNu', 'KhongYeuCau'] as const
export type PreferredRoommateGender = (typeof PREFERRED_ROOMMATE_GENDERS)[number]

export const SLEEP_TIMES = ['Truoc23Gio', 'Tu23Den1Gio', 'Sau1Gio'] as const
export type SleepTime = (typeof SLEEP_TIMES)[number]

export const COOKING_FREQUENCIES = ['ThuongXuyen', 'ThinhThoang', 'Khong'] as const
export type CookingFrequency = (typeof COOKING_FREQUENCIES)[number]

export const NOISE_LEVELS = ['YenTinh', 'BinhThuong', 'On'] as const
export type NoiseLevel = (typeof NOISE_LEVELS)[number]

export const OCCUPATION_TYPES = ['SinhVien', 'DiLam'] as const
export type OccupationType = (typeof OCCUPATION_TYPES)[number]

export const ROOMMATE_PROFILE_VISIBILITIES = ['CongKhai', 'ChiKhiToiKetNoi'] as const
export type RoommateProfileVisibility = (typeof ROOMMATE_PROFILE_VISIBILITIES)[number]

export const ROOMMATE_INVITATION_STATUSES = ['ChoPhanHoi', 'DaChapNhan', 'TuChoi', 'DaRut'] as const
export type RoommateInvitationStatus = (typeof ROOMMATE_INVITATION_STATUSES)[number]

/** Các tiêu chí của hồ sơ, chung cho hồ sơ của mình, phần không định danh và body của `PUT`. */
interface RoommateCriteria {
  gender: Gender
  preferredRoommateGender: PreferredRoommateGender
  city: string
  ward: string | null
  budgetMin: number
  budgetMax: number
  sleepTime: SleepTime
  smokes: boolean
  hasPet: boolean
  cooking: CookingFrequency
  noiseLevel: NoiseLevel
  occupationType: OccupationType
  /** Mã trường trong `GET /schools`; `null` là Trường khác hoặc đi làm (FR-112). */
  schoolCode: string | null
  /** Tên trường hoặc công ty; có `schoolCode` thì là tên trường theo danh mục. */
  organizationName: string
  /** Ngày thuần `YYYY-MM-DD`. */
  moveInFrom: string
}

/** `GET /roommate-profiles/me` — hồ sơ đầy đủ, chỉ chủ hồ sơ thấy. */
export interface MyRoommateProfile extends RoommateCriteria {
  id: number
  visibility: RoommateProfileVisibility
  isSearching: boolean
  updatedAt: string
}

/** `GET /roommate-profiles/{id}` — phần không định danh của hồ sơ người khác (FR-114). */
export interface RoommatePublicProfile extends RoommateCriteria {
  id: number
  updatedAt: string
}

/**
 * Body của `PUT /roommate-profiles/me`. Có `schoolCode` thì gửi `organizationName` là `null`: server lấy tên
 * trường theo danh mục (FR-112).
 */
export interface RoommateProfileRequest extends Omit<RoommateCriteria, 'organizationName'> {
  organizationName: string | null
  visibility: RoommateProfileVisibility
}

/** Điểm từng tiêu chí, từ 0 tới 1. */
export interface RoommateMatchScores {
  budget: number
  habits: number
  area: number
  organization: number
}

/** Một ứng viên của `GET /roommate-profiles/matches`; `score` là số nguyên phần trăm. */
export interface RoommateMatch {
  profileId: number
  score: number
  scores: RoommateMatchScores
  profile: RoommatePublicProfile
}

export type RoommateInvitationDirection = 'sent' | 'received'

export interface RoommateInvitationListParams {
  direction: RoommateInvitationDirection
  status?: RoommateInvitationStatus
  page?: number
  pageSize?: number
}

/** Một lời mời; `profileId` là hồ sơ của bên kia, `null` khi bên kia đã xóa hồ sơ. */
export interface RoommateInvitation {
  id: number
  status: RoommateInvitationStatus
  sentAt: string
  respondedAt: string | null
  profileId: number | null
}

/** Một kết nối đã chấp nhận; `phoneNumber` là `null` khi bên kia đã xóa số. */
export interface RoommateConnection {
  invitationId: number
  connectedAt: string
  fullName: string
  phoneNumber: string | null
}

/** Một lượt chặn của chính người gọi; `profileId` là `null` khi người bị chặn không còn hồ sơ. */
export interface RoommateBlock {
  id: number
  blockedAt: string
  profileId: number | null
}

/** `GET /roommate-profiles/{id}/match-explanation`. */
export interface RoommateMatchExplanation {
  explanation: string
}
