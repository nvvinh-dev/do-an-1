using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartRent.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class UpdateInvoicesPropertiesAndAmenityNames : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_invoices_invoices_adjusted_invoice_id",
                table: "invoices");

            migrationBuilder.DropIndex(
                name: "ix_properties_city_district_ward",
                table: "properties");

            migrationBuilder.DropIndex(
                name: "ix_invoices_adjusted_invoice_id",
                table: "invoices");

            migrationBuilder.DropIndex(
                name: "ux_invoices_contract_ky_dinh_ky",
                table: "invoices");

            migrationBuilder.DropCheckConstraint(
                name: "ck_invoices_status",
                table: "invoices");

            migrationBuilder.DropCheckConstraint(
                name: "ck_invoices_type",
                table: "invoices");

            migrationBuilder.DropColumn(
                name: "district",
                table: "properties");

            migrationBuilder.DropColumn(
                name: "adjusted_invoice_id",
                table: "invoices");

            // Không đặt giá trị mặc định: khu trọ nào còn thiếu phường/xã thì migration dừng lại
            // để bổ sung tay, thay vì ghi chuỗi rỗng không có trong danh mục đơn vị hành chính.
            migrationBuilder.AlterColumn<string>(
                name: "ward",
                table: "properties",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AddColumn<string>(
                name: "change_request_reason",
                table: "invoices",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "landlord_finalize_note",
                table: "invoices",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "sent_at",
                table: "invoices",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "tenant_confirmed_at",
                table: "invoices",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "related_invoice_id",
                table: "invoice_lines",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_properties_city_ward",
                table: "properties",
                columns: new[] { "city", "ward" });

            migrationBuilder.CreateIndex(
                name: "ux_invoices_contract_ky_dinh_ky",
                table: "invoices",
                columns: new[] { "contract_id", "period_start", "period_end" },
                unique: true,
                filter: "type = 'DinhKy' AND status <> 'DaHuy'");

            migrationBuilder.CreateIndex(
                name: "ux_invoices_contract_thanh_ly",
                table: "invoices",
                column: "contract_id",
                unique: true,
                filter: "type = 'ThanhLy'");

            migrationBuilder.AddCheckConstraint(
                name: "ck_invoices_status",
                table: "invoices",
                sql: "status IN ('Nhap', 'ChuaThanhToan', 'ChoXacNhan', 'ThanhToanMotPhan', 'QuaHan', 'DaThanhToan', 'DaHuy', 'DaChuyenThanhLy', 'ChoNguoiThueXacNhan', 'ChoHoanCoc')");

            migrationBuilder.AddCheckConstraint(
                name: "ck_invoices_type",
                table: "invoices",
                sql: "type IN ('DinhKy', 'ThanhLy')");

            migrationBuilder.CreateIndex(
                name: "ix_invoice_lines_related_invoice_id",
                table: "invoice_lines",
                column: "related_invoice_id");

            migrationBuilder.AddForeignKey(
                name: "fk_invoice_lines_invoices_related_invoice_id",
                table: "invoice_lines",
                column: "related_invoice_id",
                principalTable: "invoices",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.Sql(RenameAmenitiesSql(toDiacritics: true));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(RenameAmenitiesSql(toDiacritics: false));

            migrationBuilder.DropForeignKey(
                name: "fk_invoice_lines_invoices_related_invoice_id",
                table: "invoice_lines");

            migrationBuilder.DropIndex(
                name: "ix_properties_city_ward",
                table: "properties");

            migrationBuilder.DropIndex(
                name: "ux_invoices_contract_ky_dinh_ky",
                table: "invoices");

            migrationBuilder.DropIndex(
                name: "ux_invoices_contract_thanh_ly",
                table: "invoices");

            migrationBuilder.DropCheckConstraint(
                name: "ck_invoices_status",
                table: "invoices");

            migrationBuilder.DropCheckConstraint(
                name: "ck_invoices_type",
                table: "invoices");

            migrationBuilder.DropIndex(
                name: "ix_invoice_lines_related_invoice_id",
                table: "invoice_lines");

            migrationBuilder.DropColumn(
                name: "change_request_reason",
                table: "invoices");

            migrationBuilder.DropColumn(
                name: "landlord_finalize_note",
                table: "invoices");

            migrationBuilder.DropColumn(
                name: "sent_at",
                table: "invoices");

            migrationBuilder.DropColumn(
                name: "tenant_confirmed_at",
                table: "invoices");

            migrationBuilder.DropColumn(
                name: "related_invoice_id",
                table: "invoice_lines");

            migrationBuilder.AlterColumn<string>(
                name: "ward",
                table: "properties",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AddColumn<string>(
                name: "district",
                table: "properties",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "adjusted_invoice_id",
                table: "invoices",
                type: "bigint",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_properties_city_district_ward",
                table: "properties",
                columns: new[] { "city", "district", "ward" });

            migrationBuilder.CreateIndex(
                name: "ix_invoices_adjusted_invoice_id",
                table: "invoices",
                column: "adjusted_invoice_id");

            migrationBuilder.CreateIndex(
                name: "ux_invoices_contract_ky_dinh_ky",
                table: "invoices",
                columns: new[] { "contract_id", "period_start", "period_end" },
                unique: true,
                filter: "type = 'DinhKy'");

            migrationBuilder.AddCheckConstraint(
                name: "ck_invoices_status",
                table: "invoices",
                sql: "status IN ('Nhap', 'ChuaThanhToan', 'ChoXacNhan', 'ThanhToanMotPhan', 'QuaHan', 'DaThanhToan', 'DaHuy')");

            migrationBuilder.AddCheckConstraint(
                name: "ck_invoices_type",
                table: "invoices",
                sql: "type IN ('DinhKy', 'ThanhLy', 'DieuChinh')");

            migrationBuilder.AddForeignKey(
                name: "fk_invoices_invoices_adjusted_invoice_id",
                table: "invoices",
                column: "adjusted_invoice_id",
                principalTable: "invoices",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <summary>
        /// Tên tiện ích đã nạp trước khi DatabaseSeeder chuyển sang tiếng Việt có dấu.
        /// "Camera an ninh" và "Wifi" vốn không có dấu nên không nằm trong danh sách.
        /// Database tạo mới được seeder nạp sẵn tên có dấu, nên các câu UPDATE không khớp dòng nào.
        /// </summary>
        private static readonly (string Old, string New)[] AmenityNames =
        [
            ("Bai de xe", "Bãi để xe"),
            ("Thang may", "Thang máy"),
            ("Bao ve 24/7", "Bảo vệ 24/7"),
            ("May giat chung", "Máy giặt chung"),
            ("San phoi", "Sân phơi"),
            ("May lanh", "Máy lạnh"),
            ("Nong lanh", "Nóng lạnh"),
            ("Gac lung", "Gác lửng"),
            ("Ban cong", "Ban công"),
            ("Nha ve sinh rieng", "Nhà vệ sinh riêng"),
            ("Bep rieng", "Bếp riêng"),
            ("Tu lanh", "Tủ lạnh"),
            ("Giuong", "Giường"),
            ("Tu quan ao", "Tủ quần áo")
        ];

        private static string RenameAmenitiesSql(bool toDiacritics)
        {
            var pairs = AmenityNames.Select(n => toDiacritics
                ? $"('{n.Old}', '{n.New}')"
                : $"('{n.New}', '{n.Old}')");

            return $"""
                UPDATE amenities AS a
                SET name = v.new_name
                FROM (VALUES {string.Join(", ", pairs)}) AS v(old_name, new_name)
                WHERE a.name = v.old_name;
                """;
        }
    }
}
