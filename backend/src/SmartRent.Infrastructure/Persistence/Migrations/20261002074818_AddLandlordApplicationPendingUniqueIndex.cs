using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartRent.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddLandlordApplicationPendingUniqueIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "ux_landlord_applications_user_cho_duyet",
                table: "landlord_applications",
                column: "user_id",
                unique: true,
                filter: "status = 'ChoDuyet'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ux_landlord_applications_user_cho_duyet",
                table: "landlord_applications");
        }
    }
}
