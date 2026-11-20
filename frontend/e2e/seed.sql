-- Dữ liệu mẫu cho kiểm thử đầu-cuối (docs/testing-strategy.md mục 4.3).
-- Chạy một lần trong Supabase SQL Editor, sau khi đã có ba tài khoản e2e-*@smartrent.test.
-- Chạy lại không tạo trùng: mỗi lệnh chỉ thêm khi bản ghi chưa có.
--
-- Phòng mẫu có giá 1.234.000 ₫ và diện tích 12,34 m² để bộ lọc ra đúng một phòng (e2e/support.ts, SAMPLE_ROOM).
-- Đổi giá, diện tích hay tên ở đây thì sửa cả SAMPLE_ROOM.
-- Hợp đồng và hóa đơn mẫu của luồng 3 thêm vào file này khi làm luồng 3.

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

commit;

-- Kiểm tra: phải ra một dòng, occupancy_status = Trong, visibility_status = DangHienThi.
select r.id, r.code, r.occupancy_status, r.visibility_status, p.name, p.status
from rooms r
join properties p on p.id = r.property_id
where p.name = '[E2E] Nhà trọ mẫu';
