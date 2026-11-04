import type { AuditAction, AuditEntityType } from '@/types/auditLogTypes'

const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  DuyetHoSoChuTro: 'Duyệt hồ sơ Chủ trọ',
  TuChoiHoSoChuTro: 'Từ chối hồ sơ Chủ trọ',
  KhoaTaiKhoan: 'Khóa tài khoản',
  MoKhoaTaiKhoan: 'Mở khóa tài khoản',
  KhaiBaoTaiKhoanNhanTien: 'Khai báo tài khoản nhận tiền',
  SuaTaiKhoanNhanTien: 'Sửa tài khoản nhận tiền',
  SuaGiaPhong: 'Sửa giá phòng',
  SuaChiSoDau: 'Sửa chỉ số đầu',
  XacNhanNhanCoc: 'Xác nhận nhận cọc',
  GhiNhanHoanCoc: 'Ghi nhận hoàn cọc',
  TaoHoaDon: 'Tạo hóa đơn',
  SuaHoaDon: 'Sửa hóa đơn',
  HuyHoaDon: 'Hủy hóa đơn',
  XacNhanThanhToan: 'Xác nhận thanh toán',
  TuChoiThanhToan: 'Từ chối xác nhận thanh toán',
  TuChotBangThanhLy: 'Tự chốt bảng thanh lý',
  HoanTatThanhLy: 'Hoàn tất thanh lý',
}

const AUDIT_ENTITY_TYPE_LABELS: Record<AuditEntityType, string> = {
  LandlordApplication: 'Hồ sơ Chủ trọ',
  AppUser: 'Tài khoản',
  Room: 'Phòng',
  Contract: 'Hợp đồng',
  Invoice: 'Hóa đơn',
}

/** Nhãn của mã thao tác; mã lạ (mã Phase 2, frontend chưa cập nhật) hiện nguyên mã. */
export function getAuditActionLabel(action: string): string {
  const labels: Record<string, string> = AUDIT_ACTION_LABELS
  return Object.hasOwn(labels, action) ? labels[action] : action
}

/** Nhãn của loại đối tượng; mã lạ hiện nguyên mã. */
export function getAuditEntityTypeLabel(entityType: string): string {
  const labels: Record<string, string> = AUDIT_ENTITY_TYPE_LABELS
  return Object.hasOwn(labels, entityType) ? labels[entityType] : entityType
}
