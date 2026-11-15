import { describe, expect, it } from 'vitest'
import {
  countActiveAuditLogFilters,
  fromAuditLogFormValues,
  isDateRangeValid,
  parseAuditLogFilters,
  toAuditLogFormValues,
  toAuditLogListParams,
  toAuditLogQuery,
  validateAuditLogId,
} from '@/utils/auditLogParams'

const parse = (search: string) => parseAuditLogFilters(new URLSearchParams(search))

const emptyFilters = {
  entityType: undefined,
  entityId: undefined,
  actorUserId: undefined,
  action: undefined,
  fromDate: undefined,
  toDate: undefined,
  page: 1,
}

describe('parseAuditLogFilters', () => {
  it('URL trống thì không lọc, trang 1', () => {
    expect(parse('')).toEqual(emptyFilters)
  })

  it('đọc đủ bốn tiêu chí của FR-64 và trang', () => {
    expect(
      parse('entityType=Invoice&entityId=12&actorUserId=7&action=SuaHoaDon&from=2026-11-01&to=2026-11-04&page=3'),
    ).toEqual({
      entityType: 'Invoice',
      entityId: 12,
      actorUserId: 7,
      action: 'SuaHoaDon',
      fromDate: '2026-11-01',
      toDate: '2026-11-04',
      page: 3,
    })
  })

  it('bỏ giá trị lạ, không gửi lên server', () => {
    expect(
      parse('entityType=Abc&entityId=x&actorUserId=-1&action=Abc&from=2026-02-31&to=hom-nay&page=99999999999'),
    ).toEqual(emptyFilters)
  })

  it('bỏ mã vượt số nguyên an toàn', () => {
    expect(parse('entityId=9007199254740993').entityId).toBeUndefined()
  })

  it('khoảng ngày ngược thì bỏ đầu cuối', () => {
    const filters = parse('from=2026-11-04&to=2026-11-01')
    expect(filters.fromDate).toBe('2026-11-04')
    expect(filters.toDate).toBeUndefined()
  })
})

describe('toAuditLogQuery', () => {
  it('bỏ trường trống và trang 1', () => {
    expect(toAuditLogQuery({ action: 'TaoHoaDon', page: 1 }).toString()).toBe('action=TaoHoaDon')
  })

  it('giữ trang từ 2 trở lên và đọc lại ra đúng bộ lọc', () => {
    const filters = parse('entityType=Room&from=2026-11-01&page=2')
    expect(toAuditLogQuery(filters).toString()).toBe('entityType=Room&from=2026-11-01&page=2')
  })
})

describe('toAuditLogListParams', () => {
  it('đổi ngày thành đầu ngày và cuối ngày theo giờ Việt Nam', () => {
    expect(toAuditLogListParams({ fromDate: '2026-11-01', toDate: '2026-11-04', page: 2 })).toEqual({
      from: '2026-11-01T00:00:00+07:00',
      to: '2026-11-04T23:59:59.9999999+07:00',
      page: 2,
    })
  })

  it('không có ngày thì không gửi `from`, `to`', () => {
    const params = toAuditLogListParams({ action: 'HuyHoaDon', page: 1 })
    expect(params.from).toBeUndefined()
    expect(params.to).toBeUndefined()
    expect(params.action).toBe('HuyHoaDon')
  })
})

describe('countActiveAuditLogFilters', () => {
  it('không tính trang', () => {
    expect(countActiveAuditLogFilters({ page: 5 })).toBe(0)
    expect(countActiveAuditLogFilters({ entityId: 3, fromDate: '2026-11-01', page: 5 })).toBe(2)
  })
})

describe('form lọc', () => {
  it('đổi bộ lọc thành giá trị ô nhập và ngược lại, về trang 1', () => {
    const filters = parse('entityType=Contract&entityId=35&actorUserId=14&action=XacNhanNhanCoc&page=4')
    const values = toAuditLogFormValues(filters)
    expect(values).toEqual({
      entityType: 'Contract',
      entityId: '35',
      actorUserId: '14',
      action: 'XacNhanNhanCoc',
      fromDate: '',
      toDate: '',
    })
    expect(fromAuditLogFormValues(values)).toEqual({ ...filters, page: 1 })
  })

  it('ô trống là không lọc, mã có khoảng trắng hai đầu vẫn đọc được', () => {
    const values = { entityType: '', entityId: ' 12 ', actorUserId: '', action: '', fromDate: '', toDate: '' }
    expect(fromAuditLogFormValues(values)).toEqual({ ...emptyFilters, entityId: 12 })
  })
})

describe('validateAuditLogId', () => {
  it('nhận ô trống và số nguyên dương', () => {
    expect(validateAuditLogId('')).toBe(true)
    expect(validateAuditLogId(' 14 ')).toBe(true)
  })

  it('báo lỗi với chữ, số âm, số 0 và số quá lớn', () => {
    for (const input of ['abc', '-1', '0', '1.5', '9007199254740993']) {
      expect(validateAuditLogId(input)).toBe('Nhập mã là số nguyên dương.')
    }
  })
})

describe('isDateRangeValid', () => {
  it('thiếu một đầu hoặc hai ngày bằng nhau là hợp lệ', () => {
    expect(isDateRangeValid(undefined, '2026-11-01')).toBe(true)
    expect(isDateRangeValid('2026-11-01', '')).toBe(true)
    expect(isDateRangeValid('2026-11-01', '2026-11-01')).toBe(true)
  })

  it('ngày cuối trước ngày đầu là không hợp lệ', () => {
    expect(isDateRangeValid('2026-11-02', '2026-11-01')).toBe(false)
  })
})
