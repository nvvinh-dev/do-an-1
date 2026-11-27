import { describe, expect, it } from 'vitest'
import { sumPendingActions } from '@/utils/sumPendingActions'

describe('sumPendingActions', () => {
  it('cộng đủ chín số đếm của Chủ trọ', () => {
    expect(
      sumPendingActions({
        rentalRequests: 1,
        paymentReports: 2,
        contractsAwaitingDeposit: 3,
        approvedRentalRequests: 4,
        invoicesToCreate: 14,
        overdueInvoices: 5,
        newMaintenanceRequests: 6,
        settlementsToPrepare: 7,
        depositsToRefund: 8,
      }),
    ).toBe(50)
  })

  it('cộng đủ năm số đếm của Người thuê', () => {
    expect(
      sumPendingActions({
        contractsToConfirm: 1,
        settlementsToConfirm: 0,
        invoicesToPay: 2,
        depositsToTransfer: 1,
        maintenanceToConfirm: 3,
      }),
    ).toBe(7)
  })

  it('bằng 0 khi không còn việc nào', () => {
    expect(
      sumPendingActions({
        contractsToConfirm: 0,
        settlementsToConfirm: 0,
        invoicesToPay: 0,
        depositsToTransfer: 0,
        maintenanceToConfirm: 0,
      }),
    ).toBe(0)
  })
})
