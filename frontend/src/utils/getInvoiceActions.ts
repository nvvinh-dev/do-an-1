import type { InvoiceDetail, PaymentReport } from '@/types/invoiceTypes'

type InvoiceForActions = Pick<InvoiceDetail, 'id' | 'type' | 'status' | 'paidAmount' | 'paymentReports'>

export interface LandlordInvoiceActions {
  /** **Sửa** (→ L7, `PUT /invoices/{id}`). */
  canEdit: boolean
  /** **Phát hành** (`/issue`). */
  canIssue: boolean
  /** **Hủy** (`/cancel`). */
  canCancel: boolean
  /** Lượt báo đang chờ: **Xác nhận** (số tiền thực thu), **Từ chối** (bắt buộc lý do). */
  pendingReport: PaymentReport | null
  /** Hóa đơn thanh lý: không sửa, phát hành, hủy ở đây; nút **Mở bảng thanh lý** (→ L9). */
  isSettlement: boolean
}

/** Lượt báo thanh toán đang chờ Chủ trọ; hóa đơn chỉ có tối đa một lượt như vậy, khi ở `ChoXacNhan`. */
function findPendingReport(invoice: InvoiceForActions): PaymentReport | null {
  if (invoice.status !== 'ChoXacNhan') return null
  return invoice.paymentReports.find((report) => report.status === 'ChoXacNhan') ?? null
}

/**
 * Nút Chủ trọ thấy trên hóa đơn, theo bảng "L8 — thao tác theo trạng thái" (docs/frontend-screens.md mục 6).
 * Nháp luôn là hóa đơn mới nhất của hợp đồng (mỗi hợp đồng chỉ một nháp), nên sửa, phát hành, hủy được ngay;
 * đã phát hành mà chưa thu đồng nào thì chỉ hóa đơn định kỳ mới nhất mới sửa, hủy được (FR-49, FR-52). Chỉ để
 * ẩn nút: server vẫn kiểm tra lại và trả `409`.
 *
 * @param latestPeriodicInvoiceId Hóa đơn định kỳ mới nhất chưa hủy của hợp đồng (`getLatestPeriodicInvoiceId`);
 *   `null` khi danh sách hóa đơn của hợp đồng chưa tải thì ẩn Sửa, Hủy của hóa đơn đã phát hành.
 */
export function getLandlordInvoiceActions(
  invoice: InvoiceForActions,
  latestPeriodicInvoiceId: number | null,
): LandlordInvoiceActions {
  const isPeriodic = invoice.type === 'DinhKy'
  const isDraft = isPeriodic && invoice.status === 'Nhap'
  const isUnpaidLatest =
    isPeriodic &&
    (invoice.status === 'ChuaThanhToan' || invoice.status === 'QuaHan') &&
    invoice.paidAmount === 0 &&
    invoice.id === latestPeriodicInvoiceId

  return {
    canEdit: isDraft || isUnpaidLatest,
    canIssue: isDraft,
    canCancel: isDraft || isUnpaidLatest,
    pendingReport: findPendingReport(invoice),
    isSettlement: !isPeriodic,
  }
}

export interface TenantInvoiceActions {
  /** **Báo đã thanh toán** (số tiền, ảnh minh chứng). */
  canReportPayment: boolean
  /** Lượt báo đang chờ Chủ trọ xác nhận. */
  pendingReport: PaymentReport | null
}

/**
 * Nút Người thuê thấy ở T5 (docs/frontend-screens.md mục 5): còn phải trả thì báo đã thanh toán — áp cho cả
 * hóa đơn thanh lý có số dư dương sau khi bảng khóa (api-design mục 9.1); đang chờ thì hiện lượt báo đó.
 */
export function getTenantInvoiceActions(invoice: InvoiceForActions): TenantInvoiceActions {
  return {
    canReportPayment:
      invoice.status === 'ChuaThanhToan' || invoice.status === 'ThanhToanMotPhan' || invoice.status === 'QuaHan',
    pendingReport: findPendingReport(invoice),
  }
}
