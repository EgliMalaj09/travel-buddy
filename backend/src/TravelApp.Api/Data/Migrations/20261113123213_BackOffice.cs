using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TravelApp.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class BackOffice : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "suspended_at",
                table: "users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "suspension_reason",
                table: "users",
                type: "character varying(20)",
                maxLength: 20,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "admin_audit",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    admin_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    action = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    target_type = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    target_id = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    details = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_admin_audit", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "admin_members",
                columns: table => new
                {
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    role = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    totp_secret = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    totp_confirmed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    totp_last_step = table.Column<long>(type: "bigint", nullable: false),
                    failed_codes = table.Column<int>(type: "integer", nullable: false),
                    locked_until = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    created_by = table.Column<Guid>(type: "uuid", nullable: true),
                    last_login_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_admin_members", x => x.user_id);
                    table.ForeignKey(
                        name: "fk_admin_members_asp_net_users_user_id",
                        column: x => x.user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "app_config",
                columns: table => new
                {
                    id = table.Column<int>(type: "integer", nullable: false),
                    min_app_version = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: false),
                    max_photo_size_mb = table.Column<int>(type: "integer", nullable: false),
                    free_trip_limit = table.Column<int>(type: "integer", nullable: false),
                    photo_quality_by_plan = table.Column<string>(type: "jsonb", nullable: false),
                    feature_flags = table.Column<string>(type: "jsonb", nullable: false),
                    version = table.Column<long>(type: "bigint", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_app_config", x => x.id);
                    table.CheckConstraint("ck_app_config_singleton", "id = 1");
                });

            migrationBuilder.InsertData(
                table: "app_config",
                columns: new[] { "id", "feature_flags", "free_trip_limit", "max_photo_size_mb", "min_app_version", "photo_quality_by_plan", "updated_at", "version" },
                values: new object[] { 1, "{}", 1, 15, "1.0.0", "{\"free\":\"compressed\",\"paid\":\"full\"}", new DateTimeOffset(new DateTime(2026, 11, 13, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)), 1L });

            migrationBuilder.CreateIndex(
                name: "ix_admin_audit_at",
                table: "admin_audit",
                column: "at");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "admin_audit");

            migrationBuilder.DropTable(
                name: "admin_members");

            migrationBuilder.DropTable(
                name: "app_config");

            migrationBuilder.DropColumn(
                name: "suspended_at",
                table: "users");

            migrationBuilder.DropColumn(
                name: "suspension_reason",
                table: "users");
        }
    }
}
