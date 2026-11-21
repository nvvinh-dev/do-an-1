import { Sparkles } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useRoommateMatchExplanation } from '@/hooks/useRoommateMatchExplanation'

/**
 * Bật khi backend có `GET /roommate-profiles/{id}/match-explanation` (FR-120). Phần AI giữ hay cắt theo
 * mốc 26/11 ở docs/ke-hoach.md mục 4; tới lúc đó nút "Vì sao phù hợp?" chưa hiện, điểm vẫn hiện đủ.
 */
export const ROOMMATE_MATCH_EXPLANATION_ENABLED = false

interface RoommateMatchExplanationProps {
  profileId: number
}

/**
 * Nút "Vì sao phù hợp?" và đoạn giải thích của một ứng viên (T8). Giải thích chỉ để tham khảo, không đổi
 * điểm. Lỗi bất kỳ (`503` khi AI lỗi hoặc hết hạn mức) thì ẩn cả phần này, điểm vẫn hiện (FR-120).
 */
export default function RoommateMatchExplanation({ profileId }: RoommateMatchExplanationProps) {
  const [requested, setRequested] = useState(false)
  const query = useRoommateMatchExplanation(profileId, requested)

  if (!ROOMMATE_MATCH_EXPLANATION_ENABLED || query.isError) {
    return null
  }

  if (!requested) {
    return (
      <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => setRequested(true)}>
        <Sparkles />
        Vì sao phù hợp?
      </Button>
    )
  }

  if (query.isPending) {
    return (
      <div aria-busy="true" aria-label="Đang tải giải thích" className="flex flex-col gap-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1 rounded-lg bg-muted p-3 text-sm">
      <p className="whitespace-pre-line wrap-anywhere">{query.data.explanation}</p>
      <p className="text-xs text-muted-foreground">Giải thích mang tính tham khảo; điểm do hệ thống tính theo công thức cố định.</p>
    </div>
  )
}
