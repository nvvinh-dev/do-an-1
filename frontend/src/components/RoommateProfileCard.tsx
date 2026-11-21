import { Send, ShieldBan } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import ConfirmDialog from '@/components/ConfirmDialog'
import RoommateActionError from '@/components/RoommateActionError'
import RoommateMatchExplanation from '@/components/RoommateMatchExplanation'
import RoommateProfileFacts from '@/components/RoommateProfileFacts'
import { Button } from '@/components/ui/button'
import { Spinner } from '@/components/ui/spinner'
import { useRoommateMutation } from '@/hooks/useRoommateMutation'
import { blockRoommateProfile, sendRoommateInvitation } from '@/services/roommateService'
import type { RoommateMatch } from '@/types/roommateTypes'
import { formatCriterionScore, MATCH_CRITERIA } from '@/utils/roommateLabels'

interface RoommateProfileCardProps {
  match: RoommateMatch
}

/**
 * Một ứng viên ở T8: điểm phù hợp, điểm từng tiêu chí và phần không định danh của hồ sơ (FR-113, FR-114).
 * Gửi lời mời xong, hoặc chặn xong, thì danh sách tải lại và ứng viên rời khỏi danh sách (FR-116, FR-118).
 */
export default function RoommateProfileCard({ match }: RoommateProfileCardProps) {
  const { profileId, score, scores, profile } = match
  const [blockOpen, setBlockOpen] = useState(false)
  const inviteMutation = useRoommateMutation(() => sendRoommateInvitation(profileId))
  const blockMutation = useRoommateMutation(() => blockRoommateProfile(profileId))
  const isBusy = inviteMutation.isPending || blockMutation.isPending

  return (
    <article className="flex flex-col gap-4 rounded-xl border bg-card p-4 text-card-foreground shadow-sm md:p-6">
      <header className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-lg font-bold wrap-anywhere">{profile.organizationName}</h2>
          <p className="text-sm text-muted-foreground wrap-anywhere">
            {profile.ward ? `${profile.ward}, ${profile.city}` : profile.city}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end">
          <span className="text-2xl font-bold text-primary tabular-nums">{score}%</span>
          <span className="text-xs text-muted-foreground">phù hợp</span>
        </div>
      </header>

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {MATCH_CRITERIA.map((criterion) => (
          <div key={criterion.key} className="flex flex-col gap-1 rounded-lg bg-muted px-3 py-2">
            <dt className="text-xs text-muted-foreground">
              {criterion.label} ({criterion.weight}%)
            </dt>
            <dd className="font-semibold tabular-nums">{formatCriterionScore(scores[criterion.key])}</dd>
          </div>
        ))}
      </dl>

      <RoommateProfileFacts profile={profile} />

      <RoommateMatchExplanation profileId={profileId} />

      <RoommateActionError error={inviteMutation.error} />

      <div className="flex flex-col-reverse gap-2 md:flex-row md:justify-end">
        <Button type="button" variant="outline" size="page" disabled={isBusy} onClick={() => setBlockOpen(true)}>
          <ShieldBan />
          Chặn
        </Button>
        <Button
          type="button"
          size="page"
          disabled={isBusy}
          onClick={() => inviteMutation.mutate(undefined, { onSuccess: () => toast.success('Đã gửi lời mời kết nối') })}
        >
          {inviteMutation.isPending ? <Spinner /> : <Send />}
          Gửi lời mời
        </Button>
      </div>

      <ConfirmDialog
        open={blockOpen}
        onOpenChange={setBlockOpen}
        title="Chặn hồ sơ này?"
        description="Hai bên sẽ không thấy hồ sơ của nhau và không gửi lời mời cho nhau được; lời mời đang chờ giữa hai bên bị rút. Bạn có thể bỏ chặn ở trang Hồ sơ ở ghép."
        confirmLabel="Chặn"
        destructive
        isPending={blockMutation.isPending}
        error={blockMutation.error}
        onConfirm={() =>
          blockMutation.mutate(undefined, {
            onSuccess: () => {
              setBlockOpen(false)
              toast.success('Đã chặn hồ sơ')
            },
          })
        }
      />
    </article>
  )
}
