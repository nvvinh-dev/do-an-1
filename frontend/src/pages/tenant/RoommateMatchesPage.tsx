import { CirclePause, UserRoundSearch, UsersRound } from 'lucide-react'
import { Link } from 'react-router'
import ApiErrorAlert from '@/components/ApiErrorAlert'
import PageHeader from '@/components/PageHeader'
import RoommateProfileCard from '@/components/RoommateProfileCard'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from '@/components/ui/empty'
import { Skeleton } from '@/components/ui/skeleton'
import { useMyRoommateProfile } from '@/hooks/useMyRoommateProfile'
import { useRoommateMatches } from '@/hooks/useRoommateMatches'

/**
 * T8 — Tìm bạn ở ghép (docs/frontend-screens.md mục 5). Chưa có hồ sơ thì hướng sang T7. Danh sách tối đa
 * 20 ứng viên do server lọc và xếp theo điểm (FR-113); điểm tính lại mỗi lần tải. `409` (đang có hợp đồng
 * Đang hiệu lực, FR-107) hiện `detail` của server.
 */
export default function RoommateMatchesPage() {
  const profileQuery = useMyRoommateProfile()
  const hasProfile = profileQuery.data != null
  const matchesQuery = useRoommateMatches(hasProfile)

  let content
  if (profileQuery.isPending || (hasProfile && matchesQuery.isPending)) {
    content = <MatchListSkeleton />
  } else if (profileQuery.isLoadingError) {
    content = <ApiErrorAlert error={profileQuery.error} onRetry={() => void profileQuery.refetch()} />
  } else if (!hasProfile) {
    content = <NoProfileEmpty />
  } else if (matchesQuery.isLoadingError) {
    content = <ApiErrorAlert error={matchesQuery.error} onRetry={() => void matchesQuery.refetch()} />
  } else if (matchesQuery.data && matchesQuery.data.length === 0) {
    content = <NoMatchesEmpty />
  } else {
    content = (
      <div className="flex flex-col gap-4">
        {matchesQuery.data?.map((match) => (
          <RoommateProfileCard key={match.profileId} match={match} />
        ))}
      </div>
    )
  }

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <PageHeader
        title="Tìm bạn ở ghép"
        description="Người thuê có hồ sơ phù hợp với bạn, điểm cao xếp trước. Họ tên và số điện thoại chỉ hiện sau khi hai bên đồng ý kết nối."
        action={
          hasProfile ? (
            <Button asChild variant="outline" size="page">
              <Link to="/tenant/roommate/invitations">Lời mời và kết nối</Link>
            </Button>
          ) : undefined
        }
      />

      {profileQuery.data?.isSearching === false && (
        <Alert>
          <CirclePause />
          <AlertTitle>Hồ sơ của bạn đang tạm dừng tìm</AlertTitle>
          <AlertDescription>
            <p>
              Người khác không thấy hồ sơ của bạn trong danh sách gợi ý. Tiếp tục tìm ở trang{' '}
              <Link to="/tenant/roommate/profile" className="text-primary underline underline-offset-4">
                Hồ sơ ở ghép
              </Link>
              .
            </p>
          </AlertDescription>
        </Alert>
      )}

      {matchesQuery.isRefetchError && (
        <ApiErrorAlert error={matchesQuery.error} onRetry={() => void matchesQuery.refetch()} />
      )}
      {content}
    </section>
  )
}

function NoProfileEmpty() {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <UserRoundSearch />
        </EmptyMedia>
        <EmptyTitle>Bạn chưa có hồ sơ ở ghép</EmptyTitle>
        <EmptyDescription>
          Tạo hồ sơ với khu vực, ngân sách và thói quen sinh hoạt để hệ thống gợi ý người ở ghép phù hợp.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild>
          <Link to="/tenant/roommate/profile">Tạo hồ sơ ở ghép</Link>
        </Button>
      </EmptyContent>
    </Empty>
  )
}

function NoMatchesEmpty() {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <UsersRound />
        </EmptyMedia>
        <EmptyTitle>Chưa có ứng viên phù hợp</EmptyTitle>
        <EmptyDescription>
          Chỉ hồ sơ cùng tỉnh/thành và hợp yêu cầu giới tính của hai bên mới được gợi ý. Thử mở rộng khu vực hoặc
          ngân sách trong hồ sơ, hoặc quay lại sau.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button asChild variant="outline">
          <Link to="/tenant/roommate/profile">Sửa hồ sơ ở ghép</Link>
        </Button>
      </EmptyContent>
    </Empty>
  )
}

function MatchListSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Đang tải danh sách ứng viên">
      {Array.from({ length: 3 }, (_, index) => (
        <div key={index} className="flex flex-col gap-3 rounded-xl border bg-card p-4 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-8 w-14" />
          </div>
          <Skeleton className="h-14 w-full" />
          <Skeleton className="h-4 w-2/3" />
        </div>
      ))}
    </div>
  )
}
