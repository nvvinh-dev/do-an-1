import type { ContractParty } from '@/types/contractTypes'

/** Số điện thoại bấm gọi được. */
export function PhoneLink({ phoneNumber }: { phoneNumber: string }) {
  return (
    <a href={`tel:${phoneNumber}`} className="tabular-nums underline underline-offset-4">
      {phoneNumber}
    </a>
  )
}

/** Họ tên kèm số điện thoại khi server cho phép hiện (FR-74). */
export default function PartyText({ party }: { party: ContractParty }) {
  return (
    <span className="flex flex-col gap-1">
      <span className="wrap-anywhere">{party.fullName}</span>
      {party.phoneNumber && <PhoneLink phoneNumber={party.phoneNumber} />}
    </span>
  )
}
