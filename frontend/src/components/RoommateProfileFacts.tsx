import type { ReactNode } from 'react'
import MoneyText from '@/components/MoneyText'
import type { RoommatePublicProfile } from '@/types/roommateTypes'
import { formatDate } from '@/utils/formatDate'
import {
  COOKING_LABELS,
  GENDER_LABELS,
  NOISE_LEVEL_LABELS,
  OCCUPATION_TYPE_LABELS,
  PREFERRED_ROOMMATE_GENDER_LABELS,
  SLEEP_TIME_LABELS,
  yesNoLabel,
} from '@/utils/roommateLabels'

interface RoommateProfileFactsProps {
  profile: Omit<RoommatePublicProfile, 'id' | 'updatedAt'>
}

/**
 * Phần không định danh của một hồ sơ ở ghép (FR-114): giới tính, yêu cầu giới tính, khu vực, ngân sách,
 * thói quen, trường hoặc nơi làm, thời điểm chuyển vào. Không có họ tên hay số điện thoại — chỉ lộ ở mục
 * Kết nối sau khi hai bên đồng ý (BR-25).
 */
export default function RoommateProfileFacts({ profile }: RoommateProfileFactsProps) {
  const facts: { label: string; value: ReactNode }[] = [
    { label: 'Giới tính', value: GENDER_LABELS[profile.gender] },
    { label: 'Muốn ở với', value: PREFERRED_ROOMMATE_GENDER_LABELS[profile.preferredRoommateGender] },
    { label: 'Khu vực', value: profile.ward ? `${profile.ward}, ${profile.city}` : profile.city },
    {
      label: 'Ngân sách mỗi tháng',
      value:
        profile.budgetMin === profile.budgetMax ? (
          <MoneyText amount={profile.budgetMin} />
        ) : (
          <>
            <MoneyText amount={profile.budgetMin} /> – <MoneyText amount={profile.budgetMax} />
          </>
        ),
    },
    {
      label: OCCUPATION_TYPE_LABELS[profile.occupationType],
      value: profile.organizationName,
    },
    { label: 'Chuyển vào từ', value: formatDate(profile.moveInFrom) },
    { label: 'Giờ ngủ', value: SLEEP_TIME_LABELS[profile.sleepTime] },
    { label: 'Nấu ăn', value: COOKING_LABELS[profile.cooking] },
    { label: 'Độ ồn', value: NOISE_LEVEL_LABELS[profile.noiseLevel] },
    { label: 'Hút thuốc', value: yesNoLabel(profile.smokes) },
    { label: 'Nuôi thú cưng', value: yesNoLabel(profile.hasPet) },
  ]

  return (
    <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
      {facts.map((fact) => (
        <div key={fact.label} className="flex min-w-0 flex-col gap-0.5">
          <dt className="text-muted-foreground">{fact.label}</dt>
          <dd className="wrap-anywhere">{fact.value}</dd>
        </div>
      ))}
    </dl>
  )
}
