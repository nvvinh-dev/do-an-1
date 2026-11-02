import { describe, expect, it } from 'vitest'
import {
  countActiveRoomSearchFilters,
  fromRoomSearchFormValues,
  getRoomSearchErrorMessages,
  isRangeValid,
  parseRoomSearchParams,
  toRoomSearchFormValues,
  toRoomSearchQuery,
  validateSearchArea,
  validateSearchMoney,
  validateSearchOccupants,
} from '@/utils/roomSearchParams'

const parse = (search: string) => parseRoomSearchParams(new URLSearchParams(search))

describe('parseRoomSearchParams', () => {
  it('URL trống thì không lọc, trang 1', () => {
    expect(parse('')).toEqual({
      city: undefined,
      ward: undefined,
      minPrice: undefined,
      maxPrice: undefined,
      minArea: undefined,
      maxArea: undefined,
      minOccupants: undefined,
      amenityIds: [],
      sortBy: undefined,
      sortDirection: undefined,
      page: 1,
    })
  })

  it('đọc đủ bộ lọc, tiện ích lặp lại và bỏ trùng', () => {
    const params = parse(
      'city=Th%C3%A0nh+ph%E1%BB%91+H%C3%A0+N%E1%BB%99i&ward=Ph%C6%B0%E1%BB%9Dng+Ba+%C4%90%C3%ACnh' +
        '&minPrice=2000000&maxPrice=4500000&minArea=15&maxArea=25.5&minOccupants=2' +
        '&amenityIds=3&amenityIds=7&amenityIds=3&sortBy=price&sortDirection=desc&page=3',
    )
    expect(params).toEqual({
      city: 'Thành phố Hà Nội',
      ward: 'Phường Ba Đình',
      minPrice: 2000000,
      maxPrice: 4500000,
      minArea: 15,
      maxArea: 25.5,
      minOccupants: 2,
      amenityIds: [3, 7],
      sortBy: 'price',
      sortDirection: 'desc',
      page: 3,
    })
  })

  it('bỏ chữ không phải số, tiện ích sai và cách sắp xếp lạ', () => {
    const params = parse('minPrice=abc&maxArea=&minOccupants=1.5&amenityIds=x&amenityIds=0&sortBy=name&page=-2')
    expect(params.minPrice).toBeUndefined()
    expect(params.maxArea).toBeUndefined()
    expect(params.minOccupants).toBeUndefined()
    expect(params.amenityIds).toEqual([])
    expect(params.sortBy).toBeUndefined()
    expect(params.page).toBe(1)
  })

  it('giữ số âm và khoảng ngược để server trả 400 kèm detail', () => {
    const params = parse('minPrice=-1&minArea=30&maxArea=20&minOccupants=0')
    expect(params.minPrice).toBe(-1)
    expect(params.minArea).toBe(30)
    expect(params.maxArea).toBe(20)
    expect(params.minOccupants).toBe(0)
  })

  it('bỏ số vượt giới hạn và số server không đọc được', () => {
    const params = parse('minPrice=1e40&maxPrice=1000000000000&maxArea=1000000&minOccupants=99999999999&minArea=-1e-7')
    expect(params.minPrice).toBeUndefined()
    expect(params.maxPrice).toBeUndefined()
    expect(params.maxArea).toBeUndefined()
    expect(params.minOccupants).toBeUndefined()
    expect(params.minArea).toBeUndefined()
    expect(parse('maxPrice=999999999999&minPrice=1e5').maxPrice).toBe(999999999999)
    expect(toRoomSearchQuery(parse('minPrice=1e5')).toString()).toBe('minPrice=100000')
  })

  it('bỏ chiều sắp xếp khi không có sortBy', () => {
    expect(parse('sortDirection=desc').sortDirection).toBeUndefined()
    expect(parse('sortBy=area&sortDirection=up').sortDirection).toBeUndefined()
  })
})

describe('toRoomSearchQuery', () => {
  it('ghi lại đúng query đã đọc, bỏ trang 1', () => {
    const search = 'city=A&minPrice=1000000&amenityIds=2&amenityIds=5&sortBy=area&sortDirection=asc&page=2'
    expect(toRoomSearchQuery(parse(search)).toString()).toBe(search)
    expect(toRoomSearchQuery(parse('city=A&page=1')).toString()).toBe('city=A')
  })
})

describe('countActiveRoomSearchFilters', () => {
  it('đếm từng ô và từng tiện ích, không đếm sắp xếp và trang', () => {
    expect(countActiveRoomSearchFilters(parse('city=A&ward=B&maxPrice=5&amenityIds=1&amenityIds=2&sortBy=price&page=2'))).toBe(5)
    expect(countActiveRoomSearchFilters(parse(''))).toBe(0)
  })
})

describe('form bộ lọc', () => {
  it('đổi giá trị URL sang chữ trong ô, diện tích dùng dấu phẩy', () => {
    expect(toRoomSearchFormValues(parse('minPrice=2000000&minArea=20.5&minOccupants=2&amenityIds=4'))).toEqual({
      city: '',
      ward: '',
      minPrice: '2000000',
      maxPrice: '',
      minArea: '20,5',
      maxArea: '',
      minOccupants: '2',
      amenityIds: [4],
    })
  })

  it('đổi chữ người dùng gõ sang bộ lọc, giữ sắp xếp và về trang 1', () => {
    const params = fromRoomSearchFormValues(
      {
        city: ' Thành phố Hà Nội ',
        ward: 'Phường Ba Đình',
        minPrice: '2.000.000',
        maxPrice: '',
        minArea: '15,5',
        maxArea: '30',
        minOccupants: ' 2 ',
        amenityIds: [1, 3],
      },
      { sortBy: 'price', sortDirection: 'desc' },
    )
    expect(params).toEqual({
      city: 'Thành phố Hà Nội',
      ward: 'Phường Ba Đình',
      minPrice: 2000000,
      maxPrice: undefined,
      minArea: 15.5,
      maxArea: 30,
      minOccupants: 2,
      amenityIds: [1, 3],
      sortBy: 'price',
      sortDirection: 'desc',
      page: 1,
    })
  })

  it('bỏ phường/xã khi chưa chọn tỉnh/thành', () => {
    const values = toRoomSearchFormValues(parse(''))
    expect(fromRoomSearchFormValues({ ...values, ward: 'Phường Ba Đình' }, {}).ward).toBeUndefined()
  })
})

describe('getRoomSearchErrorMessages', () => {
  it('lấy các câu trong errors của 400, bỏ trùng', () => {
    const data = {
      status: 400,
      errors: {
        MinPrice: ['Giá thấp nhất không được âm.'],
        MaxPrice: ['Giá thấp nhất không được lớn hơn giá cao nhất.', 'Giá thấp nhất không được âm.'],
      },
    }
    expect(getRoomSearchErrorMessages(data)).toEqual([
      'Giá thấp nhất không được âm.',
      'Giá thấp nhất không được lớn hơn giá cao nhất.',
    ])
  })

  it('không có errors thì trả mảng rỗng', () => {
    expect(getRoomSearchErrorMessages({ status: 400, detail: 'x' })).toEqual([])
    expect(getRoomSearchErrorMessages(undefined)).toEqual([])
    expect(getRoomSearchErrorMessages({ errors: { City: 'không phải mảng' } })).toEqual([])
  })
})

describe('kiểm tra ô bộ lọc', () => {
  it('tiền: trống được, nhận dấu chấm hàng nghìn, không nhận số âm hay số lẻ', () => {
    expect(validateSearchMoney('')).toBe(true)
    expect(validateSearchMoney('3.000.000')).toBe(true)
    expect(validateSearchMoney('-1')).not.toBe(true)
    expect(validateSearchMoney('3.5')).not.toBe(true)
  })

  it('diện tích: nhận dấu phẩy thập phân, không nhận số âm', () => {
    expect(validateSearchArea('20,5')).toBe(true)
    expect(validateSearchArea('-3')).not.toBe(true)
  })

  it('số người: số nguyên từ 1', () => {
    expect(validateSearchOccupants('')).toBe(true)
    expect(validateSearchOccupants('1')).toBe(true)
    expect(validateSearchOccupants('0')).not.toBe(true)
    expect(validateSearchOccupants('1,5')).not.toBe(true)
  })

  it('khoảng: chỉ sai khi cả hai đầu có giá trị và từ > đến', () => {
    expect(isRangeValid(undefined, 5)).toBe(true)
    expect(isRangeValid(5, 5)).toBe(true)
    expect(isRangeValid(6, 5)).toBe(false)
  })
})
