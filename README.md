# SmartRent System

Hệ thống Quản lý và Cho thuê Phòng trọ — nền tảng web kết nối Chủ trọ và Người thuê, số hóa toàn bộ vòng đời thuê trọ từ tìm phòng đến trả phòng và tất toán tiền cọc.

| | |
|---|---|
| **Môn học** | Đồ án 1 |
| **Thành viên** | Giang, Vinh (02 thành viên) |
| **Thời gian** | Tối đa 2.5 tháng |
| **Nền tảng** | Ứng dụng Web (cả ba vai trò dùng chung một web app, giao diện phân hóa theo vai trò) |

---

## 1. Bài toán

Hoạt động cho thuê phòng trọ quy mô nhỏ và vừa hiện vận hành gần như thủ công: đăng tin rời rạc trên mạng xã hội, hợp đồng giấy hoặc thỏa thuận miệng, chốt điện nước bằng sổ tay, tính hóa đơn bằng tay hoặc Excel, thu tiền không có chứng từ tập trung.

Ba nỗi đau lớn nhất mà hệ thống nhắm tới:

1. **Tranh chấp tiền bạc** — không có dữ liệu đối chứng về chỉ số điện nước, tiền cọc và lịch sử thanh toán.
2. **Rủi ro lừa đảo** — không có cơ chế xác minh chủ trọ và tin đăng.
3. **Mất thời gian** — các thao tác lặp lại hàng tháng: chốt số, tính tiền, nhắc nợ.

---

## 2. Mục tiêu nghiệp vụ

| ID | Mục tiêu | Tiêu chí thành công |
|---|---|---|
| **G-01** | Loại bỏ tranh chấp về chỉ số điện nước và hóa đơn | 100% hóa đơn lưu đủ chỉ số cũ/mới, đơn giá áp dụng và thời điểm chốt; người thuê xem được toàn bộ lịch sử |
| **G-02** | Loại bỏ tranh chấp về tiền cọc | 100% hợp đồng ghi nhận số tiền cọc; mọi khấu trừ khi thanh lý đều có dòng chi tiết kèm lý do |
| **G-03** | Giảm thời gian lập hóa đơn hàng tháng | Từ ~2–3 phút/phòng xuống dưới 30 giây/phòng |
| **G-04** | Giảm rủi ro tin đăng giả mạo | 100% tài khoản Chủ trọ được Admin duyệt hồ sơ trước khi đăng tin |
| **G-05** | Tăng khả năng truy vết khi có khiếu nại | Mọi thao tác ảnh hưởng tới tiền đều có nhật ký không thể sửa xóa |
| **G-06** | Rút ngắn thời gian tìm phòng phù hợp | Tìm được danh sách phù hợp trong ≤ 3 thao tác hoặc 1 câu hỏi ngôn ngữ tự nhiên |

---

## 3. Vai trò người dùng

| Vai trò | Phạm vi hoạt động |
|---|---|
| **Admin** | Duyệt hồ sơ đăng ký Chủ trọ; quản lý tài khoản (khóa/mở khóa/cảnh cáo); ẩn tin vi phạm; xử lý khiếu nại; xem dashboard tổng quan; tra cứu nhật ký hệ thống |
| **Chủ trọ** | Quản lý khu trọ và phòng trọ; đăng/ẩn tin; xử lý yêu cầu thuê; lập hợp đồng và ghi nhận cọc; chốt chỉ số điện nước, phát hành hóa đơn, xác nhận thanh toán; xử lý sự cố; gia hạn, chấm dứt hợp đồng và tất toán cọc; xem dashboard doanh thu |
| **Người thuê** | Tìm và xem phòng; đặt lịch xem phòng; gửi yêu cầu thuê; nộp cọc và xác nhận hợp đồng; xem hóa đơn, báo đã thanh toán kèm minh chứng; báo sự cố; tạo hồ sơ ở ghép; gửi khiếu nại |
| **Trợ lý AI** | Tìm kiếm bằng ngôn ngữ tự nhiên, tra cứu, giải thích điểm phù hợp ở ghép, hướng dẫn sử dụng |

**Ranh giới quyền hạn của AI:** AI là **read-only** trong mọi luồng nghiệp vụ lõi. AI không duyệt tài khoản, không đổi giá, không tạo/xóa hợp đồng, không xác nhận thanh toán, và chỉ trả về dữ liệu có thật trong hệ thống.

**Giới hạn quyền của Admin:** Admin không có quyền tạo/sửa/xóa hợp đồng, hóa đơn hay xác nhận thanh toán thay Chủ trọ. Quyền đọc dữ liệu tài chính của người dùng chỉ mở với các bản ghi được liên kết trong một khiếu nại đang mở, và mỗi lần truy cập đều bị ghi nhật ký.

---

## 4. Quy trình nghiệp vụ

| Mã | Quy trình |
|---|---|
| **BP-01** | Đăng ký, xác thực và phê duyệt Chủ trọ |
| **BP-02** | Quản lý Khu trọ và Phòng trọ |
| **BP-03** | Đăng tin cho thuê và kiểm duyệt |
| **BP-04** | Tìm kiếm phòng (bộ lọc và AI) |
| **BP-05** | Đặt lịch xem phòng |
| **BP-06** | Yêu cầu thuê, đặt cọc và lập Hợp đồng |
| **BP-07** | Quản lý Hóa đơn và Thanh toán |
| **BP-08** | Báo cáo Sự cố và Sửa chữa |
| **BP-09** | Gia hạn Hợp đồng |
| **BP-10** | Chấm dứt Hợp đồng, Trả phòng và Tất toán tiền cọc |
| **BP-11** | Tìm người ở ghép |
| **BP-12** | Tương tác với Trợ lý AI |
| **BP-13** | Báo cáo, Khiếu nại và Xử lý vi phạm |

---

## 5. Quy tắc nghiệp vụ cốt lõi

Các quy tắc chi phối thiết kế dữ liệu và luồng xử lý:

- **Chốt cứng giá theo hợp đồng.** Giá thuê, đơn giá điện/nước và phí dịch vụ được chốt vào Hợp đồng tại thời điểm tạo. Chủ trọ đổi giá ở mức Phòng sau đó không ảnh hưởng tới hợp đồng đang hiệu lực và hóa đơn đã phát hành.
- **Một phòng, một hợp đồng.** Tại một thời điểm, một Phòng chỉ có tối đa một Hợp đồng ở trạng thái *Đang hiệu lực* hoặc *Đang thanh lý*.
- **Một hợp đồng, một người đứng tên.** Những người khác ở trong phòng được ghi nhận là *Người ở cùng* — có thông tin nhưng không có nghĩa vụ trên hệ thống.
- **Tiền cọc là điều kiện hiệu lực.** Mọi hợp đồng bắt buộc ghi nhận số tiền cọc. Hợp đồng chỉ *Đang hiệu lực* khi Chủ trọ đã xác nhận nhận đủ cọc **và** Người thuê đã đồng ý điều khoản. Cọc chỉ được khấu trừ qua Hóa đơn thanh lý, mỗi khoản khấu trừ là một dòng riêng có lý do.
- **Chỉ số điện nước liên tục.** Tiền điện/nước = (chỉ số mới − chỉ số cũ) × đơn giá đã chốt. Chỉ số cũ của một kỳ bắt buộc bằng chỉ số mới của kỳ liền trước; hệ thống từ chối lưu khi chỉ số mới nhỏ hơn chỉ số cũ.
- **Hóa đơn đã thanh toán là bất biến.** Mọi điều chỉnh sau đó phải thực hiện bằng một hóa đơn điều chỉnh riêng có tham chiếu tới hóa đơn gốc. Mỗi hợp đồng chỉ có một hóa đơn cho mỗi kỳ.
- **Không xóa cứng dữ liệu tài chính.** Phòng hoặc Khu trọ đã từng phát sinh Hợp đồng hoặc Hóa đơn chỉ được chuyển sang trạng thái *Lưu trữ*, không được xóa vĩnh viễn.
- **Nhật ký không thể sửa xóa.** Mọi thao tác ảnh hưởng tới tiền hoặc quyền đều ghi nhật ký gồm người thực hiện, thời điểm, giá trị trước và sau — kể cả Admin cũng không sửa được.
- **Phân quyền theo sở hữu.** Chủ trọ chỉ thao tác trên dữ liệu thuộc khu trọ của mình; Người thuê chỉ xem được hợp đồng, hóa đơn và sự cố của chính mình.
- **Hệ thống hoạt động độc lập với AI.** Khi dịch vụ AI không khả dụng, hệ thống chỉ mất tính năng hỗ trợ, không mất chức năng nghiệp vụ.

---

## 6. Ranh giới hệ thống

### Trong phạm vi

Đăng ký/đăng nhập và phân quyền theo vai trò · Admin duyệt hồ sơ Chủ trọ và quản lý người dùng · Quản lý khu trọ, phòng trọ, trạng thái khai thác và hiển thị · Tìm kiếm bằng bộ lọc và bằng ngôn ngữ tự nhiên · Đặt lịch xem phòng · Yêu cầu thuê, tiền cọc, hợp đồng · Gia hạn hợp đồng · Chốt chỉ số, hóa đơn, ghi nhận và xác nhận thanh toán · Hiển thị mã VietQR của Chủ trọ để người thuê chuyển khoản · Chấm dứt hợp đồng, hóa đơn thanh lý, tất toán cọc · Sự cố và sửa chữa có xác nhận hai chiều · Hồ sơ ở ghép, điểm phù hợp và giải thích bằng AI · Trợ lý AI tra cứu · Thông báo trong ứng dụng · Nhật ký hệ thống · Dashboard cho cả ba vai trò · Báo cáo, khiếu nại và xử lý vi phạm.

### Ngoài phạm vi

| # | Nội dung loại trừ | Lý do |
|---|---|---|
| 1 | Tích hợp cổng thanh toán trực tuyến và đối soát tự động với ngân hàng | Hệ thống chỉ hiển thị mã VietQR của chủ trọ để hỗ trợ chuyển khoản; việc ghi nhận vẫn là: người thuê báo đã trả kèm minh chứng → chủ trọ xác nhận |
| 2 | Đồng thuê (nhiều người cùng đứng tên) và chia hóa đơn giữa bạn cùng phòng | Làm phình mô hình dữ liệu và luồng thanh toán |
| 3 | Chữ ký số và giá trị pháp lý của hợp đồng | Cần hạ tầng pháp lý và chứng thư số |
| 4 | Khai báo tạm trú tạm vắng với cơ quan công an | Cần tích hợp hệ thống cơ quan nhà nước |
| 5 | AI tự động ra quyết định nghiệp vụ | Rủi ro nghiệp vụ không chấp nhận được |
| 6 | Ứng dụng di động native (Android/iOS) | Nền tảng chốt là Web |
| 7 | Nhắn tin trực tiếp giữa Chủ trọ và Người thuê | Là một hệ thống con riêng, vượt quỹ thời gian |
| 8 | Đánh giá, xếp hạng chủ trọ/người thuê | Cần khối lượng người dùng thật mới có ý nghĩa |
| 9 | Tách "Tin đăng" thành thực thể riêng | Phòng đang hiển thị chính là tin đăng |
| 10 | Quản lý tài sản/nội thất chi tiết trong phòng | Hư hỏng xử lý ở mức mô tả tự do trong hóa đơn thanh lý |

---

## 7. Phân kỳ triển khai

Với 02 thành viên và 2.5 tháng, phạm vi in-scope là rất lớn. Thứ tự triển khai bám sát phân kỳ dưới đây.

**Phase 1 — Core (~60% quỹ thời gian).** Mục tiêu: một vòng đời thuê phòng chạy được trọn vẹn từ đầu đến cuối.

> BP-01 · BP-02 · BP-03 · BP-04 (chỉ bộ lọc truyền thống, chưa có AI) · BP-06 · BP-07 · BP-10 · thông báo cho sự kiện mức Cao · nhật ký hệ thống · dashboard cơ bản cho 3 vai trò.
>
> Phase 1 **phải** bao gồm tiền cọc và thanh lý — đây là nỗi đau chính của người dùng.

**Phase 2 — Value-added (~30%).** BP-04 A1 (tìm kiếm NLP) · BP-08 · BP-11 · BP-12 · BP-13 · dashboard nâng cao.

**Phase 3 — Nếu còn thời gian (~10%).** BP-05 · BP-09 · thanh toán một phần và theo dõi công nợ · tách Tin đăng thành thực thể riêng.

**Nguyên tắc dừng:** Không bắt đầu Phase 2 khi Phase 1 chưa chạy được end-to-end trên dữ liệu thật. Nếu buộc phải cắt, cắt từ Phase 3 lên.

---

## 8. Yêu cầu chất lượng

| ID | Yêu cầu |
|---|---|
| **QR-01** | Mọi con số tiền hiển thị cho Người thuê phải kèm cách tính (chỉ số cũ, chỉ số mới, đơn giá) |
| **QR-02** | Dữ liệu tài chính không được xóa cứng trong bất kỳ hoàn cảnh nào |
| **QR-03** | Nhật ký hệ thống không sửa xóa được, kể cả bởi Admin |
| **QR-04** | Ảnh giấy tờ nhân thân chỉ hiển thị cho Admin trong quá trình duyệt hồ sơ |
| **QR-05** | Giao diện dùng được trên màn hình rộng từ 360px |
| **QR-06** | Mọi thao tác không thể hoàn tác phải có bước xác nhận rõ ràng |
| **QR-07** | Thông tin liên hệ cá nhân chỉ tiết lộ khi có cơ sở nghiệp vụ |

---

## 9. Công nghệ định hướng

| Lớp | Công nghệ |
|---|---|
| **Backend** | ASP.NET Core Web API, Entity Framework Core, ASP.NET Identity, FluentValidation, Serilog, Swagger/OpenAPI |
| **Database** | Supabase (PostgreSQL hosting), EFCore.NamingConventions |
| **Lưu trữ file** | Supabase Storage, gọi qua `HttpClient` |
| **Gửi email** | SMTP Gmail, MailKit |
| **Trợ lý AI** | Google Gemini API, gọi qua `HttpClient` |
| **Authentication** | JWT Authentication |
| **Frontend** | React + TypeScript, Tailwind CSS, React Router, React Hook Form, TanStack Query, Axios, qrcode (vẽ mã VietQR) |
| **Kiến trúc** | Web không truy cập database trực tiếp, giao tiếp hoàn toàn qua Backend API |
| **Công cụ** | Trello (tiến độ), GitHub (mã nguồn), Postman (kiểm thử), PlantUML (thiết kế CSDL/UML) |

**Nguyên tắc kiểm soát phạm vi:** Không tự ý thêm chức năng nằm ngoài nghiệp vụ. Mọi chức năng mới phải có cơ sở từ nghiệp vụ, yêu cầu của hệ thống hoặc tiêu chí môn học.

---

## 10. Cấu trúc thư mục

```
SmartRent_System/
├── backend/
│   ├── SmartRent.slnx
│   ├── src/
│   │   ├── SmartRent.Api/              # Controller, service, cấu hình, JWT
│   │   │   ├── Controllers/
│   │   │   ├── Services/               # Service điều phối nghiệp vụ
│   │   │   ├── Contracts/              # Kiểu dữ liệu vào/ra của API
│   │   │   └── Validators/             # Kiểm tra dữ liệu đầu vào (FluentValidation)
│   │   ├── SmartRent.Domain/           # Entity, quy tắc nghiệp vụ
│   │   │   ├── Entities/
│   │   │   └── Enums/
│   │   └── SmartRent.Infrastructure/   # EF Core, truy cập dữ liệu
│   │       ├── Identity/               # Tài khoản và vai trò
│   │       ├── Persistence/            # DbContext, migration
│   │       ├── Email/                  # Gửi email qua SMTP
│   │       └── Storage/                # Lưu trữ file trên Supabase Storage
│   └── tests/
│       └── SmartRent.UnitTests/
├── frontend/                            # React + TypeScript + Tailwind
│   └── src/
│       ├── assets/                      # Ảnh, icon, font
│       ├── components/                  # Thành phần giao diện dùng lại: nút, ô nhập, hộp thoại
│       ├── layouts/                     # Khung trang: header, sidebar theo từng vai trò
│       ├── pages/                       # Mỗi màn hình một file, chia thư mục con theo vai trò
│       │   ├── public/                  # Khách: trang chủ, tìm phòng, chi tiết phòng
│       │   ├── auth/                    # Đăng ký, đăng nhập, mật khẩu
│       │   ├── tenant/                  # Người thuê
│       │   ├── landlord/                # Chủ trọ
│       │   ├── admin/                   # Admin
│       │   └── shared/                  # Dùng chung mọi vai trò: thông báo, hồ sơ cá nhân
│       ├── services/                    # Hàm gọi API, nhóm theo nghiệp vụ
│       ├── types/                       # Kiểu dữ liệu TypeScript của request/response, nhóm theo nghiệp vụ
│       ├── hooks/                       # Custom hook
│       ├── lib/                         # Cấu hình gọi API (axios)
│       ├── utils/                       # Hàm tiện ích: định dạng tiền, ngày
│       └── App.tsx                      # Khai báo toàn bộ route (URL → trang)
└── docs/                                # Tài liệu phân tích và thiết kế (không đưa lên Git)
```

**Nguyên tắc sắp xếp file:** mỗi thư mục chỉ chứa một loại code, và tên file ghép từ **chức năng nghiệp vụ + vai trò của file** — nhìn tên là biết file thuộc chức năng nào, làm nhiệm vụ gì. Không đặt tên chung chung như `Helper`, `Utils`, `Common`.

| Loại file | Quy ước tên | Ví dụ |
|---|---|---|
| Backend (C#) | PascalCase, trùng tên class | `AuthController.cs`, `AuthService.cs`, `AuthValidators.cs` |
| Trang (`pages/`) | PascalCase, hậu tố `Page` | `LoginPage.tsx`, `LandlordApplicationPage.tsx` |
| Component, layout | PascalCase | `RoomCard.tsx`, `AdminLayout.tsx` |
| Gọi API (`services/`) | camelCase, hậu tố `Service` | `authService.ts`, `landlordApplicationService.ts` |
| Kiểu dữ liệu (`types/`) | camelCase, hậu tố `Types`, cùng nghiệp vụ với file service | `authTypes.ts`, `invoiceTypes.ts` |
| Hook (`hooks/`) | camelCase, tiền tố `use` | `useCurrentUser.ts` |
| Tiện ích (`utils/`) | camelCase, nêu rõ việc làm | `formatCurrency.ts`, `formatDate.ts` |

**Quy tắc phụ thuộc giữa các tầng:**

```
Api  ──►  Infrastructure  ──►  Domain
 └──────────────────────────────►┘
```

`Domain` không phụ thuộc vào tầng nào khác — mọi thứ hướng vào nó.

---

## 11. Quy ước Git

**Nhánh:**

| Nhánh | Vai trò |
|---|---|
| `main` | Luôn ở trạng thái chạy được; là bản dùng để nộp. Không push thẳng, chỉ nhận merge từ `develop` |
| `develop` | Nhánh tích hợp, nơi các nhánh công việc gộp vào |
| Nhánh công việc | Tách từ `develop`, merge về `develop` qua Pull Request |

**Tiền tố nhánh công việc:**

| Tiền tố | Dùng khi |
|---|---|
| `feat/` | Thêm tính năng mới |
| `fix/` | Sửa lỗi |
| `docs/` | Chỉ sửa tài liệu |
| `chore/` | Cấu hình, dọn dẹp |

**Kích thước một nhánh:** mỗi nhánh gói trọn **một quy trình nghiệp vụ (BP)**, không tách nhỏ hơn. Ví dụ toàn bộ BP-01 — đăng ký, đăng nhập, đổi mật khẩu, nộp và duyệt hồ sơ Chủ trọ — nằm trên một nhánh `feat/`. Nếu một BP quá lớn thì tách làm hai phần theo luồng nghiệp vụ, ví dụ BP-07 tách thành phần chốt số và lập hóa đơn, phần ghi nhận thanh toán.

Nhánh nên sống từ vài ngày đến một tuần. Nhánh sống lâu hơn sẽ lệch xa `develop` và xung đột khi merge.

**Pull Request:** bắt buộc với nhánh `feat/` và `fix/` — phải được người còn lại duyệt trước khi merge, và **không ai merge PR của chính mình**. Với `docs/` và `chore/` — sửa tài liệu, đổi cấu hình lặt vặt — được commit thẳng vào `develop`, không cần PR.

**Trước khi mở PR**, kéo code mới nhất về nhánh của mình để tự xử lý xung đột, không đẩy phần rắc rối sang người duyệt:

```bash
git pull origin develop
```

**Commit message:** theo Conventional Commits, dạng `<type>: mo ta ngan`, với `type` thuộc `feat` / `fix` / `docs` / `chore` / `refactor` / `test`. Phần mô tả viết tiếng Việt không dấu, chữ thường, không có dấu chấm cuối câu.

```
feat: them chuc nang dat coc
fix: sua loi tinh tien dien khi chi so bang nhau
docs: cap nhat erd cho bang hop dong
```

**Vòng lặp hằng ngày:**

```bash
git checkout develop
git pull
git checkout -b feat/ten-viec
git add .
git commit -m "feat: mo ta ngan"
git push -u origin feat/ten-viec
```

Sau đó mở Pull Request trên GitHub để người còn lại duyệt.

**Quy tắc migration:** tại một thời điểm **chỉ một người** được chạy `dotnet ef migrations add`, và phải báo cho người kia trước. Người còn lại `git pull` lấy migration mới nhất rồi mới đổi schema. File snapshot của EF Core là code sinh tự động — xung đột ở file này rất khó gỡ. Vì hai người dùng chung một database, người chạy migration cũng là người chạy `dotnet ef database update`.

**Không gắn attribution AI vào commit và pull request** — không có dòng `Co-Authored-By` của AI, không có dòng ghi công cụ trong mô tả PR.

---

## 12. Cấu hình và chạy dự án

Yêu cầu môi trường: .NET SDK 10, Node.js 20 trở lên.

### 12.1 Cấu hình secret

Chuỗi kết nối database và khóa ký JWT **không nằm trong repository**. Mỗi người tự đặt trên máy mình bằng User Secrets — dữ liệu lưu ngoài thư mục dự án nên không có nguy cơ commit nhầm:

```bash
cd backend/src/SmartRent.Api
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Host=<host>;Database=postgres;Username=<user>;Password=<password>"
dotnet user-secrets set "Jwt:Key" "<chuoi-ngau-nhien-toi-thieu-32-ky-tu>"
dotnet user-secrets set "Seed:AdminEmail" "<email-quan-tri>"
dotnet user-secrets set "Seed:AdminPassword" "<mat-khau-quan-tri>"
```

Ngoài ra cần thêm các giá trị cho Supabase Storage và gửi email:

```bash
dotnet user-secrets set "Supabase:Url" "https://<project-id>.supabase.co"
dotnet user-secrets set "Supabase:ServiceRoleKey" "<service-role-key>"
dotnet user-secrets set "Smtp:User" "<dia-chi-gmail>"
dotnet user-secrets set "Smtp:AppPassword" "<app-password-16-ky-tu>"
```

`Supabase:ServiceRoleKey` lấy ở **Project Settings → API Keys**, phần `service_role`. Key này có toàn quyền trên database và storage — không bao giờ đưa vào frontend.

`Smtp:AppPassword` tạo tại tài khoản Google: bật xác minh 2 bước, rồi vào **Bảo mật → Mật khẩu ứng dụng**. Không dùng mật khẩu Gmail thường.

Hai giá trị `Seed:*` dùng để tạo tài khoản Admin đầu tiên khi ứng dụng khởi động lần đầu — không ai tự đăng ký làm Admin được. Thiếu chúng thì ứng dụng vẫn chạy nhưng bỏ qua bước tạo Admin. Mật khẩu phải có tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, chữ số và ký tự đặc biệt.

Lấy thông số kết nối tại Supabase: **Project Settings → Database → Connection string**.

Hai thành viên **dùng chung một project Supabase** — cùng một database và cùng một Storage. Vì vậy phải tuân thủ quy tắc migration ở mục 11: một người chạy migration, người kia pull về trước khi đổi schema.

Ứng dụng **không khởi động được** nếu thiếu một trong hai giá trị trên. Đây là hành vi cố ý: thà dừng ngay còn hơn chạy với cấu hình sai.

### 12.2 Chạy backend

```bash
cd backend
dotnet build
dotnet run --project src/SmartRent.Api
```

API chạy tại `http://localhost:5179`. Swagger UI ở `/swagger`.

### 12.3 Chạy frontend

```bash
cd frontend
npm install
npm run dev
```

Dev server đã cấu hình chuyển tiếp `/api` sang backend, nên frontend gọi thẳng đường dẫn tương đối, không cần ghi địa chỉ backend trong code.

### 12.4 Chạy test

```bash
cd backend
dotnet test
```

---

## 13. Trạng thái hiện tại

Khung dự án đã dựng xong: solution backend với 3 project và 1 project test, frontend Vite + React + TypeScript + Tailwind, cấu hình JWT và rate limiting. **Chưa có chức năng nghiệp vụ nào được hiện thực** — chưa có entity, chưa có controller, chưa có migration.

Tài liệu thiết kế cho Phase 1 đã hoàn tất trong `docs/`: đặc tả yêu cầu chức năng, sơ đồ use case, kiến trúc phần mềm, thiết kế cơ sở dữ liệu, thiết kế API và thiết kế an toàn. Sơ đồ tuần tự chưa được thực hiện.

---

## 14. Tài liệu

README này là bản tóm tắt phục vụ người đọc nhanh. Nguồn nghiệp vụ đầy đủ là tài liệu **System & Business Analysis — Hệ thống Quản lý và Cho thuê Phòng trọ **, bao gồm phân tích chi tiết 13 quy trình nghiệp vụ, 26 quy tắc nghiệp vụ, 9 vòng đời trạng thái, danh mục sự kiện thông báo và ranh giới quyền hạn của AI.

Tài liệu phân tích và thiết kế được lưu trong thư mục `docs/` trên máy từng thành viên và **không được đưa lên Git** — hai thành viên trao đổi trực tiếp với nhau. Bao gồm: tài liệu phân tích nghiệp vụ, đặc tả yêu cầu chức năng, sơ đồ use case, kiến trúc phần mềm, thiết kế cơ sở dữ liệu, thiết kế API và thiết kế an toàn.

Quy ước làm việc chung của nhóm cũng được giữ ngoài Git và trao đổi trực tiếp giữa hai thành viên.
