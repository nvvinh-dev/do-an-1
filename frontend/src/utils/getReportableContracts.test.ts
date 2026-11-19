import { describe, expect, it } from 'vitest'
import type { ContractListItem, ContractStatus } from '@/types/contractTypes'
import { getReportableContracts } from '@/utils/getReportableContracts'

const TODAY = '2026-11-16'

function contract(id: number, status: ContractStatus, startDate = '2026-10-01'): ContractListItem {
  return {
    id,
    room: { id: 1, code: 'P101', propertyName: 'Nhà trọ Hòa Bình' },
    tenantName: 'Nguyễn Văn A',
    landlordName: 'Trần Thị B',
    rentPrice: 3_000_000,
    startDate,
    endDate: '2027-10-01',
    status,
    holdExpiresAt: null,
  }
}

describe('getReportableContracts', () => {
  it('giữ hợp đồng đang hiệu lực, sắp hết hạn đã tới ngày bắt đầu và hợp đồng đang thanh lý', () => {
    const contracts = [
      contract(1, 'DangHieuLuc'),
      contract(2, 'SapHetHan'),
      contract(3, 'DangThanhLy'),
      contract(4, 'DangHieuLuc', TODAY),
    ]
    expect(getReportableContracts(contracts, TODAY).map((c) => c.id)).toEqual([1, 2, 3, 4])
  })

  it('bỏ hợp đồng đang hiệu lực chưa tới ngày bắt đầu', () => {
    expect(getReportableContracts([contract(1, 'DangHieuLuc', '2026-11-17')], TODAY)).toEqual([])
  })

  it('bỏ hợp đồng chưa hiệu lực hoặc đã kết thúc', () => {
    const statuses: ContractStatus[] = ['Nhap', 'ChoNguoiThueXacNhan', 'ChoNhanCoc', 'DaThanhLy', 'DaHuy']
    expect(getReportableContracts(statuses.map((status, index) => contract(index, status)), TODAY)).toEqual([])
  })
})
