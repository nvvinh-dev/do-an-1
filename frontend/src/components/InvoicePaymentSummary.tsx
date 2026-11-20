import DetailCard from '@/components/DetailCard'
import { Fact } from '@/components/FactList'
import MoneyText from '@/components/MoneyText'
import type { InvoiceDetail } from '@/types/invoiceTypes'
import { formatDate } from '@/utils/formatDate'
import { formatDateTime } from '@/utils/formatDateTime'

/**
 * Tóm tắt thanh toán của hóa đơn định kỳ ở cột phụ của trang chi tiết (docs/design-system.md mục 5): tổng
 * tiền là số nổi bật nhất trang, kèm số đã thu và các mốc ngày. Trạng thái hóa đơn hiện ở đầu trang, không
 * lặp lại ở đây. Mọi số tiền là số server trả (FR-44, QR-01); hóa đơn thanh lý dùng `SettlementInvoiceSummary`.
 */
export default function InvoicePaymentSummary({ invoice }: { invoice: InvoiceDetail }) {
  return (
    <DetailCard title="Thanh toán" stacked>
      <Fact label="Tổng tiền">
        <MoneyText amount={invoice.totalAmount} className="text-2xl font-bold" />
      </Fact>
      {invoice.issuedAt && (
        <>
          <Fact label="Đã thu">
            <MoneyText amount={invoice.paidAmount} />
          </Fact>
          <Fact label="Ngày phát hành">{formatDate(invoice.issuedAt)}</Fact>
        </>
      )}
      {invoice.dueDate && <Fact label="Hạn thanh toán">{formatDate(invoice.dueDate)}</Fact>}
      {invoice.settledAt && invoice.status === 'DaThanhToan' && (
        <Fact label="Thanh toán đủ lúc">{formatDateTime(invoice.settledAt)}</Fact>
      )}
      {invoice.cancelReason && (
        <Fact label="Lý do hủy">
          <span className="whitespace-pre-line">{invoice.cancelReason}</span>
        </Fact>
      )}
    </DetailCard>
  )
}
