using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartRent.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class UpdateContractsAndRentalRequestsForBp06 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "billing_cycle_day",
                table: "contracts");

            migrationBuilder.AddColumn<uint>(
                name: "xmin",
                table: "rental_requests",
                type: "xid",
                rowVersion: true,
                nullable: false,
                defaultValue: 0u);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "cancelled_at",
                table: "contracts",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<long>(
                name: "cancelled_by_user_id",
                table: "contracts",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deposit_refund_note",
                table: "contracts",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "initial_electricity_index",
                table: "contracts",
                type: "numeric(12,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<decimal>(
                name: "initial_water_index",
                table: "contracts",
                type: "numeric(12,2)",
                nullable: false,
                defaultValue: 0m);

            migrationBuilder.AddColumn<long>(
                name: "move_out_notice_by_user_id",
                table: "contracts",
                type: "bigint",
                nullable: true);

            migrationBuilder.AddColumn<uint>(
                name: "xmin",
                table: "contracts",
                type: "xid",
                rowVersion: true,
                nullable: false,
                defaultValue: 0u);

            migrationBuilder.CreateIndex(
                name: "ux_rental_requests_room_tenant_cho_duyet",
                table: "rental_requests",
                columns: new[] { "room_id", "tenant_user_id" },
                unique: true,
                filter: "status = 'ChoDuyet'");

            migrationBuilder.CreateIndex(
                name: "ux_rental_requests_tenant_da_duyet",
                table: "rental_requests",
                column: "tenant_user_id",
                unique: true,
                filter: "status = 'DaDuyet'");

            migrationBuilder.CreateIndex(
                name: "ix_contracts_cancelled_by_user_id",
                table: "contracts",
                column: "cancelled_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_contracts_move_out_notice_by_user_id",
                table: "contracts",
                column: "move_out_notice_by_user_id");

            migrationBuilder.AddCheckConstraint(
                name: "ck_contracts_deposit_received_method",
                table: "contracts",
                sql: "deposit_received_method IN ('TienMat', 'ChuyenKhoan')");

            migrationBuilder.AddCheckConstraint(
                name: "ck_contracts_deposit_refund_method",
                table: "contracts",
                sql: "deposit_refund_method IN ('TienMat', 'ChuyenKhoan')");

            migrationBuilder.AddForeignKey(
                name: "fk_contracts_users_cancelled_by_user_id",
                table: "contracts",
                column: "cancelled_by_user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "fk_contracts_users_move_out_notice_by_user_id",
                table: "contracts",
                column: "move_out_notice_by_user_id",
                principalTable: "users",
                principalColumn: "id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "fk_contracts_users_cancelled_by_user_id",
                table: "contracts");

            migrationBuilder.DropForeignKey(
                name: "fk_contracts_users_move_out_notice_by_user_id",
                table: "contracts");

            migrationBuilder.DropIndex(
                name: "ux_rental_requests_room_tenant_cho_duyet",
                table: "rental_requests");

            migrationBuilder.DropIndex(
                name: "ux_rental_requests_tenant_da_duyet",
                table: "rental_requests");

            migrationBuilder.DropIndex(
                name: "ix_contracts_cancelled_by_user_id",
                table: "contracts");

            migrationBuilder.DropIndex(
                name: "ix_contracts_move_out_notice_by_user_id",
                table: "contracts");

            migrationBuilder.DropCheckConstraint(
                name: "ck_contracts_deposit_received_method",
                table: "contracts");

            migrationBuilder.DropCheckConstraint(
                name: "ck_contracts_deposit_refund_method",
                table: "contracts");

            migrationBuilder.DropColumn(
                name: "xmin",
                table: "rental_requests");

            migrationBuilder.DropColumn(
                name: "cancelled_at",
                table: "contracts");

            migrationBuilder.DropColumn(
                name: "cancelled_by_user_id",
                table: "contracts");

            migrationBuilder.DropColumn(
                name: "deposit_refund_note",
                table: "contracts");

            migrationBuilder.DropColumn(
                name: "initial_electricity_index",
                table: "contracts");

            migrationBuilder.DropColumn(
                name: "initial_water_index",
                table: "contracts");

            migrationBuilder.DropColumn(
                name: "move_out_notice_by_user_id",
                table: "contracts");

            migrationBuilder.DropColumn(
                name: "xmin",
                table: "contracts");

            migrationBuilder.AddColumn<int>(
                name: "billing_cycle_day",
                table: "contracts",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }
    }
}
