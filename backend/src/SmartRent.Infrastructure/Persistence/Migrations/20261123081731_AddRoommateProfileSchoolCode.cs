using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace SmartRent.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddRoommateProfileSchoolCode : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "school_code",
                table: "roommate_profiles",
                type: "text",
                nullable: true);

            migrationBuilder.AddCheckConstraint(
                name: "ck_roommate_profiles_school_code",
                table: "roommate_profiles",
                sql: "school_code IS NULL OR occupation_type = 'SinhVien'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_roommate_profiles_school_code",
                table: "roommate_profiles");

            migrationBuilder.DropColumn(
                name: "school_code",
                table: "roommate_profiles");
        }
    }
}
