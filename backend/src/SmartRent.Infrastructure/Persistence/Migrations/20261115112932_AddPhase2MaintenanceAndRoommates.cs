using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace SmartRent.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPhase2MaintenanceAndRoommates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "maintenance_requests",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    contract_id = table.Column<long>(type: "bigint", nullable: false),
                    title = table.Column<string>(type: "text", nullable: false),
                    description = table.Column<string>(type: "text", nullable: false),
                    urgency = table.Column<string>(type: "text", nullable: false),
                    status = table.Column<string>(type: "text", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    accepted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    expected_completion_date = table.Column<DateOnly>(type: "date", nullable: true),
                    completed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    not_fixed_reason = table.Column<string>(type: "text", nullable: true),
                    rejection_reason = table.Column<string>(type: "text", nullable: true),
                    estimated_compensation = table.Column<decimal>(type: "numeric(14,2)", nullable: true),
                    rejected_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    closed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    is_auto_closed = table.Column<bool>(type: "boolean", nullable: false),
                    cancelled_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    xmin = table.Column<uint>(type: "xid", rowVersion: true, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_maintenance_requests", x => x.id);
                    table.CheckConstraint("ck_maintenance_requests_estimated_compensation", "estimated_compensation > 0");
                    table.CheckConstraint("ck_maintenance_requests_status", "status IN ('Moi', 'DangXuLy', 'ChoNguoiThueXacNhan', 'DaDong', 'TuChoi', 'DaHuy')");
                    table.CheckConstraint("ck_maintenance_requests_urgency", "urgency IN ('BinhThuong', 'Gap', 'KhanCap')");
                    table.ForeignKey(
                        name: "fk_maintenance_requests_contracts_contract_id",
                        column: x => x.contract_id,
                        principalTable: "contracts",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "roommate_blocks",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    blocker_user_id = table.Column<long>(type: "bigint", nullable: false),
                    blocked_user_id = table.Column<long>(type: "bigint", nullable: false),
                    blocked_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_roommate_blocks", x => x.id);
                    table.CheckConstraint("ck_roommate_blocks_khac_nguoi", "blocked_user_id <> blocker_user_id");
                    table.ForeignKey(
                        name: "fk_roommate_blocks_users_blocked_user_id",
                        column: x => x.blocked_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_roommate_blocks_users_blocker_user_id",
                        column: x => x.blocker_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "roommate_invitations",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    sender_user_id = table.Column<long>(type: "bigint", nullable: false),
                    recipient_user_id = table.Column<long>(type: "bigint", nullable: false),
                    status = table.Column<string>(type: "text", nullable: false),
                    sent_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    responded_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_roommate_invitations", x => x.id);
                    table.CheckConstraint("ck_roommate_invitations_khac_nguoi", "recipient_user_id <> sender_user_id");
                    table.CheckConstraint("ck_roommate_invitations_status", "status IN ('ChoPhanHoi', 'DaChapNhan', 'TuChoi', 'DaRut')");
                    table.ForeignKey(
                        name: "fk_roommate_invitations_users_recipient_user_id",
                        column: x => x.recipient_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_roommate_invitations_users_sender_user_id",
                        column: x => x.sender_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "roommate_profiles",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    tenant_user_id = table.Column<long>(type: "bigint", nullable: false),
                    gender = table.Column<string>(type: "text", nullable: false),
                    preferred_roommate_gender = table.Column<string>(type: "text", nullable: false),
                    city = table.Column<string>(type: "text", nullable: false),
                    ward = table.Column<string>(type: "text", nullable: true),
                    budget_min = table.Column<decimal>(type: "numeric(14,2)", nullable: false),
                    budget_max = table.Column<decimal>(type: "numeric(14,2)", nullable: false),
                    sleep_time = table.Column<string>(type: "text", nullable: false),
                    smokes = table.Column<bool>(type: "boolean", nullable: false),
                    has_pet = table.Column<bool>(type: "boolean", nullable: false),
                    cooking = table.Column<string>(type: "text", nullable: false),
                    noise_level = table.Column<string>(type: "text", nullable: false),
                    occupation_type = table.Column<string>(type: "text", nullable: false),
                    organization_name = table.Column<string>(type: "text", nullable: false),
                    move_in_from = table.Column<DateOnly>(type: "date", nullable: false),
                    visibility = table.Column<string>(type: "text", nullable: false),
                    is_searching = table.Column<bool>(type: "boolean", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_roommate_profiles", x => x.id);
                    table.CheckConstraint("ck_roommate_profiles_budget_max", "budget_max >= budget_min");
                    table.CheckConstraint("ck_roommate_profiles_budget_min", "budget_min > 0");
                    table.CheckConstraint("ck_roommate_profiles_cooking", "cooking IN ('ThuongXuyen', 'ThinhThoang', 'Khong')");
                    table.CheckConstraint("ck_roommate_profiles_gender", "gender IN ('Nam', 'Nu')");
                    table.CheckConstraint("ck_roommate_profiles_noise_level", "noise_level IN ('YenTinh', 'BinhThuong', 'On')");
                    table.CheckConstraint("ck_roommate_profiles_occupation_type", "occupation_type IN ('SinhVien', 'DiLam')");
                    table.CheckConstraint("ck_roommate_profiles_preferred_roommate_gender", "preferred_roommate_gender IN ('ChiNam', 'ChiNu', 'KhongYeuCau')");
                    table.CheckConstraint("ck_roommate_profiles_sleep_time", "sleep_time IN ('Truoc23Gio', 'Tu23Den1Gio', 'Sau1Gio')");
                    table.CheckConstraint("ck_roommate_profiles_visibility", "visibility IN ('CongKhai', 'ChiKhiToiKetNoi')");
                    table.ForeignKey(
                        name: "fk_roommate_profiles_users_tenant_user_id",
                        column: x => x.tenant_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "maintenance_request_images",
                columns: table => new
                {
                    id = table.Column<long>(type: "bigint", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    maintenance_request_id = table.Column<long>(type: "bigint", nullable: false),
                    url = table.Column<string>(type: "text", nullable: false),
                    display_order = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_maintenance_request_images", x => x.id);
                    table.ForeignKey(
                        name: "fk_maintenance_request_images_maintenance_requests_maintenance",
                        column: x => x.maintenance_request_id,
                        principalTable: "maintenance_requests",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_maintenance_request_images_maintenance_request_id",
                table: "maintenance_request_images",
                column: "maintenance_request_id");

            migrationBuilder.CreateIndex(
                name: "ix_maintenance_requests_contract_id",
                table: "maintenance_requests",
                column: "contract_id");

            migrationBuilder.CreateIndex(
                name: "ix_maintenance_requests_status_completed_at",
                table: "maintenance_requests",
                columns: new[] { "status", "completed_at" });

            migrationBuilder.CreateIndex(
                name: "ix_maintenance_requests_status_created_at",
                table: "maintenance_requests",
                columns: new[] { "status", "created_at" });

            migrationBuilder.CreateIndex(
                name: "ix_roommate_blocks_blocked_user_id",
                table: "roommate_blocks",
                column: "blocked_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_roommate_blocks_blocker_user_id_blocked_user_id",
                table: "roommate_blocks",
                columns: new[] { "blocker_user_id", "blocked_user_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "ix_roommate_invitations_recipient_user_id",
                table: "roommate_invitations",
                column: "recipient_user_id");

            migrationBuilder.CreateIndex(
                name: "ux_roommate_invitations_sender_recipient_cho_phan_hoi",
                table: "roommate_invitations",
                columns: new[] { "sender_user_id", "recipient_user_id" },
                unique: true,
                filter: "status = 'ChoPhanHoi'");

            migrationBuilder.CreateIndex(
                name: "ix_roommate_profiles_tenant_user_id",
                table: "roommate_profiles",
                column: "tenant_user_id",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "maintenance_request_images");

            migrationBuilder.DropTable(
                name: "roommate_blocks");

            migrationBuilder.DropTable(
                name: "roommate_invitations");

            migrationBuilder.DropTable(
                name: "roommate_profiles");

            migrationBuilder.DropTable(
                name: "maintenance_requests");
        }
    }
}
