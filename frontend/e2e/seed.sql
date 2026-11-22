-- Dữ liệu mẫu cho kiểm thử đầu-cuối (docs/testing-strategy.md mục 4.3).
-- Chạy một lần trong Supabase SQL Editor, sau khi đã có ba tài khoản e2e-*@smartrent.test.
-- Chạy lại không tạo trùng: mỗi lệnh chỉ thêm khi bản ghi chưa có.
--
-- Phòng mẫu có giá 1.234.000 ₫ và diện tích 12,34 m² để bộ lọc ra đúng một phòng (e2e/support.ts, SAMPLE_ROOM).
-- Đổi giá, diện tích hay tên ở đây thì sửa cả SAMPLE_ROOM.
--
-- Luồng 3 dùng phòng thứ hai `[E2E] P02` đang cho e2e-nguoithue thuê, để phòng P01 của luồng 2 vẫn Trống. Hợp đồng
-- Đang hiệu lực từ 01/11/2026, kèm hóa đơn định kỳ tháng 11/2026 đã phát hành với tổng 3.450.000 ₫
-- (tiền phòng 3.000.000 + điện 100 kWh × 3.500 + nước 5 m³ × 20.000). Mỗi lần chạy luồng 3 thu thêm 1.000 ₫, nên
-- hóa đơn vẫn còn nợ sau rất nhiều lần chạy. Đổi tên phòng ở đây thì sửa cả SAMPLE_INVOICE (e2e/support.ts).

begin;

insert into properties (landlord_user_id, name, address, city, ward, description, status)
select u.id,
       '[E2E] Nhà trọ mẫu',
       '1 Đường Kiểm Thử',
       'Thành phố Hà Nội',
       'Phường Ba Đình',
       'Khu trọ dành cho kiểm thử đầu-cuối, không phải tin thật.',
       'DangKhaiThac'
from users u
where u.email = 'e2e-chutro@smartrent.test'
  and not exists (
    select 1 from properties p where p.landlord_user_id = u.id and p.name = '[E2E] Nhà trọ mẫu'
  );

insert into rooms (property_id, code, area, rent_price, max_occupants, electricity_unit_price, water_unit_price,
                   description, occupancy_status, visibility_status)
select p.id, '[E2E] P01', 12.34, 1234000, 2, 3500, 20000,
       'Phòng dành cho kiểm thử đầu-cuối, không phải tin thật.', 'Trong', 'DangHienThi'
from properties p
join users u on u.id = p.landlord_user_id
where u.email = 'e2e-chutro@smartrent.test'
  and p.name = '[E2E] Nhà trọ mẫu'
  and not exists (select 1 from rooms r where r.property_id = p.id and r.code = '[E2E] P01');

-- Luồng 3: phòng P02 đang thuê. Giá khác P01 nên không lọt vào bộ lọc của luồng 2.
insert into rooms (property_id, code, area, rent_price, max_occupants, electricity_unit_price, water_unit_price,
                   description, occupancy_status, visibility_status)
select p.id, '[E2E] P02', 20, 3000000, 2, 3500, 20000,
       'Phòng dành cho kiểm thử đầu-cuối, không phải tin thật.', 'DangThue', 'DangHienThi'
from properties p
join users u on u.id = p.landlord_user_id
where u.email = 'e2e-chutro@smartrent.test'
  and p.name = '[E2E] Nhà trọ mẫu'
  and not exists (select 1 from rooms r where r.property_id = p.id and r.code = '[E2E] P02');

-- Hợp đồng Đang hiệu lực của e2e-nguoithue trên P02: đã xác nhận, đã nhận cọc, hiệu lực từ 01/11/2026.
insert into contracts (room_id, tenant_user_id, rent_price, electricity_unit_price, water_unit_price, deposit_amount,
                       initial_electricity_index, initial_water_index, start_date, end_date, payment_due_days, status,
                       tenant_confirmed_at, deposit_received_at, deposit_received_method, activated_at)
select r.id, t.id, 3000000, 3500, 20000, 3000000,
       100, 10, date '2026-11-01', date '2027-10-31', 5, 'DangHieuLuc',
       timestamptz '2026-10-30 10:00:00+07', timestamptz '2026-10-31 10:00:00+07', 'TienMat',
       timestamptz '2026-11-01 00:00:00+07'
from rooms r
join properties p on p.id = r.property_id
join users l on l.id = p.landlord_user_id
cross join users t
where l.email = 'e2e-chutro@smartrent.test'
  and p.name = '[E2E] Nhà trọ mẫu'
  and r.code = '[E2E] P02'
  and t.email = 'e2e-nguoithue@smartrent.test'
  and not exists (select 1 from contracts c where c.room_id = r.id and c.tenant_user_id = t.id);

-- Hóa đơn định kỳ tháng 11/2026 đã phát hành, chưa thu đồng nào. Hạn 26/11/2026 = ngày phát hành 21/11 cộng
-- payment_due_days 5 ngày, như /issue tính. Qua hạn thì tác vụ định kỳ gắn Quá hạn, luồng 3 vẫn chạy được (FR-45
-- cho báo thanh toán khi Quá hạn).
insert into invoices (contract_id, type, period_start, period_end,
                      previous_electricity_index, current_electricity_index, electricity_unit_price, electricity_amount,
                      previous_water_index, current_water_index, water_unit_price, water_amount,
                      rent_amount, service_fee_amount, total_amount, paid_amount, status, issued_at, due_date)
select c.id, 'DinhKy', date '2026-11-01', date '2026-11-30',
       100, 200, 3500, 350000,
       10, 15, 20000, 100000,
       3000000, 0, 3450000, 0, 'ChuaThanhToan', timestamptz '2026-11-21 09:00:00+07', date '2026-11-26'
from contracts c
join rooms r on r.id = c.room_id
join properties p on p.id = r.property_id
join users t on t.id = c.tenant_user_id
where p.name = '[E2E] Nhà trọ mẫu'
  and r.code = '[E2E] P02'
  and t.email = 'e2e-nguoithue@smartrent.test'
  and c.status = 'DangHieuLuc'
  and not exists (select 1 from invoices i where i.contract_id = c.id and i.type = 'DinhKy');

commit;

-- Kiểm tra: phải ra hai dòng — P01 Trong, P02 DangThue, cả hai DangHienThi.
select r.id, r.code, r.occupancy_status, r.visibility_status, p.name, p.status
from rooms r
join properties p on p.id = r.property_id
where p.name = '[E2E] Nhà trọ mẫu'
order by r.code;

-- Kiểm tra: phải ra một dòng — hợp đồng DangHieuLuc, hóa đơn DinhKy tổng 3.450.000, chưa trả hết.
select c.id as contract_id, c.status as contract_status, i.id as invoice_id, i.status as invoice_status,
       i.total_amount, i.paid_amount, i.due_date
from contracts c
join rooms r on r.id = c.room_id
join properties p on p.id = r.property_id
join invoices i on i.contract_id = c.id
where p.name = '[E2E] Nhà trọ mẫu' and r.code = '[E2E] P02';
