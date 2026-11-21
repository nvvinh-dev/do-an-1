import { useQuery } from '@tanstack/react-query'
import { roommateQueryKey } from '@/hooks/useMyRoommateProfile'
import { getRoommateInvitations } from '@/services/roommateService'
import type { RoommateInvitationListParams } from '@/types/roommateTypes'

/** Lời mời đã gửi hoặc đã nhận (T9), mới nhất trước. */
export function useRoommateInvitationList(params: RoommateInvitationListParams, enabled: boolean) {
  return useQuery({
    queryKey: [...roommateQueryKey, 'invitations', params],
    queryFn: () => getRoommateInvitations(params),
    enabled,
  })
}
