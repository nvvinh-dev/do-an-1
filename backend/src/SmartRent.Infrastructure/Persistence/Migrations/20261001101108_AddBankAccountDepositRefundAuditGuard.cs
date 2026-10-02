using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartRent.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddBankAccountDepositRefundAuditGuard : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "bank_account_name",
                table: "users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "bank_account_number",
                table: "users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "bank_bin",
                table: "users",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "deposit_refund_method",
                table: "contracts",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "deposit_refunded_amount",
                table: "contracts",
                type: "numeric(14,2)",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "deposit_refunded_at",
                table: "contracts",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddCheckConstraint(
                name: "ck_users_bank_account",
                table: "users",
                sql: "(bank_bin IS NULL AND bank_account_number IS NULL AND bank_account_name IS NULL) OR (bank_bin IS NOT NULL AND bank_account_number IS NOT NULL AND bank_account_name IS NOT NULL)");

            // QR-03: nhật ký hệ thống chỉ được thêm mới. Trigger ở mức câu lệnh chặn mọi
            // UPDATE, DELETE và TRUNCATE trên audit_logs, kể cả khi lệnh đến từ code ứng dụng.
            migrationBuilder.Sql("""
                CREATE FUNCTION audit_logs_chi_them() RETURNS trigger
                LANGUAGE plpgsql AS $$
                BEGIN
                    RAISE EXCEPTION 'audit_logs chi duoc them moi, khong duoc sua hoac xoa (%)', TG_OP;
                END;
                $$;

                CREATE TRIGGER trg_audit_logs_chi_them
                    BEFORE UPDATE OR DELETE OR TRUNCATE ON audit_logs
                    FOR EACH STATEMENT EXECUTE FUNCTION audit_logs_chi_them();
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DROP TRIGGER IF EXISTS trg_audit_logs_chi_them ON audit_logs;
                DROP FUNCTION IF EXISTS audit_logs_chi_them();
                """);

            migrationBuilder.DropCheckConstraint(
                name: "ck_users_bank_account",
                table: "users");

            migrationBuilder.DropColumn(
                name: "bank_account_name",
                table: "users");

            migrationBuilder.DropColumn(
                name: "bank_account_number",
                table: "users");

            migrationBuilder.DropColumn(
                name: "bank_bin",
                table: "users");

            migrationBuilder.DropColumn(
                name: "deposit_refund_method",
                table: "contracts");

            migrationBuilder.DropColumn(
                name: "deposit_refunded_amount",
                table: "contracts");

            migrationBuilder.DropColumn(
                name: "deposit_refunded_at",
                table: "contracts");
        }
    }
}
