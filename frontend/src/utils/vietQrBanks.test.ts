import { describe, expect, it } from 'vitest'
import backendBankBinsSource from '../../../backend/src/SmartRent.Api/Validators/VietQrBankBins.cs?raw'
import { findVietQrBank, VIETQR_BANKS } from '@/utils/vietQrBanks'

/** Mã BIN trong `VietQrBankBins.cs`: mỗi dòng của danh sách là một chuỗi 6 chữ số trong dấu nháy kép. */
function readBackendBins(source: string): string[] {
  return [...source.matchAll(/"(\d{6})"/g)].map((match) => match[1])
}

describe('VIETQR_BANKS', () => {
  it('có đúng các mã BIN mà backend nhận (Validators/VietQrBankBins.cs)', () => {
    const backendBins = readBackendBins(backendBankBinsSource)
    const frontendBins = VIETQR_BANKS.map((bank) => bank.bin)

    // Đọc nhầm file hay sai mẫu thì danh sách backend rỗng, test phải báo chứ không qua.
    expect(backendBins.length).toBeGreaterThan(0)
    expect([...frontendBins].sort()).toEqual([...backendBins].sort())
  })

  it('mỗi mã BIN chỉ xuất hiện một lần', () => {
    const bins = VIETQR_BANKS.map((bank) => bank.bin)
    expect(new Set(bins).size).toBe(bins.length)
  })

  it('ngân hàng nào cũng có tên ngắn và tên đầy đủ', () => {
    for (const bank of VIETQR_BANKS) {
      expect(bank.shortName.trim()).not.toBe('')
      expect(bank.name.trim()).not.toBe('')
    }
  })
})

describe('findVietQrBank', () => {
  it('tra được ngân hàng theo mã BIN', () => {
    expect(findVietQrBank('970436')?.shortName).toBe('Vietcombank')
  })

  it('mã BIN không có trong danh sách thì trả undefined', () => {
    expect(findVietQrBank('123456')).toBeUndefined()
  })
})
