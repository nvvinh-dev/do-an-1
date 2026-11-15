import { describe, expect, it } from 'vitest'
import { searchVietQrBanks } from '@/utils/searchVietQrBanks'
import { VIETQR_BANKS } from '@/utils/vietQrBanks'

function shortNames(query: string): string[] {
  return searchVietQrBanks(query).map((bank) => bank.shortName)
}

describe('searchVietQrBanks', () => {
  it('gõ đúng tên ngắn thì ngân hàng đó đứng đầu, trước các ngân hàng số mang tên nó trong tên đầy đủ', () => {
    // CAKE và Ubank có tên đầy đủ "... by VPBank".
    expect(shortNames('vpbank')).toEqual(['VPBank', 'CAKE', 'Ubank'])
  })

  it('gõ tên hoặc một phần tên Vietcombank thì Vietcombank đứng trước CBBank ("Vietcombank Neo")', () => {
    expect(shortNames('vietcombank')[0]).toBe('Vietcombank')
    expect(shortNames('vietcom')[0]).toBe('Vietcombank')
  })

  it('tìm theo tên đầy đủ thì mục khớp sớm hơn trong tên đứng trước', () => {
    // "Ngân hàng TMCP Ngoại Thương Việt Nam" khớp sớm hơn "... một thành viên Ngoại thương Công nghệ số" của CBBank.
    expect(shortNames('ngoai thuong')).toEqual(['Vietcombank', 'CBBank'])
    expect(shortNames('Ngoại Thương')[0]).toBe('Vietcombank')
    expect(shortNames('ky thuong')).toEqual(['Techcombank'])
  })

  it('không phân biệt dấu cách: "vietin bank" ra VietinBank', () => {
    expect(shortNames('vietin bank')[0]).toBe('VietinBank')
  })

  it('tên ngắn chứa chữ gõ ở giữa xếp sau tên ngắn bắt đầu bằng chữ đó', () => {
    // "MBBank", "MBV" bắt đầu bằng "mb"; "CIMB" chỉ chứa "mb".
    expect(shortNames('mb').slice(0, 3)).toEqual(['MBBank', 'MBV', 'CIMB'])
  })

  it('cùng mức khớp thì giữ thứ tự theo tên ngắn của danh sách', () => {
    expect(shortNames('kookmin')).toEqual(['KookminHCM', 'KookminHN'])
  })

  it('chữ gõ rỗng thì trả đủ danh sách theo thứ tự gốc', () => {
    expect(searchVietQrBanks('')).toEqual(VIETQR_BANKS)
    expect(searchVietQrBanks('   ')).toEqual(VIETQR_BANKS)
  })

  it('không khớp ngân hàng nào thì trả danh sách rỗng', () => {
    expect(searchVietQrBanks('xyz')).toEqual([])
  })
})
