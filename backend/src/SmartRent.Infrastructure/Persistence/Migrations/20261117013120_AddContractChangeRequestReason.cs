using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartRent.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddContractChangeRequestReason : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "change_request_reason",
                table: "contracts",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "change_requested_at",
                table: "contracts",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "change_request_reason",
                table: "contracts");

            migrationBuilder.DropColumn(
                name: "change_requested_at",
                table: "contracts");
        }
    }
}
