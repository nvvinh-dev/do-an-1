const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh'

// Locale `en-CA` định dạng ngày đúng kiểu `YYYY-MM-DD`, cùng dạng với trường ngày thuần của API.
const vietnamIsoDateFormat = new Intl.DateTimeFormat('en-CA', {
  timeZone: VIETNAM_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/**
 * Ngày hôm nay theo giờ Việt Nam dạng `YYYY-MM-DD` (architecture mục 7.1), dùng làm `min` của ô
 * ngày và để so với ngày người dùng chọn: hai chuỗi cùng dạng này so sánh được trực tiếp. Không
 * dùng `toISOString()` vì đó là ngày theo UTC — từ 0 tới 7 giờ sáng ở Việt Nam vẫn là ngày hôm qua.
 */
export function getVietnamToday(now: Date = new Date()): string {
  return vietnamIsoDateFormat.format(now)
}
