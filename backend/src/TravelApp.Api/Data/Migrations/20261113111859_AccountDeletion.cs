using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TravelApp.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AccountDeletion : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "delete_after",
                table: "users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "deletion_requested_at",
                table: "users",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "user_settings",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    reminders_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    remind_checklist = table.Column<bool>(type: "boolean", nullable: false),
                    remind_pack_tonight = table.Column<bool>(type: "boolean", nullable: false),
                    remind_flight = table.Column<bool>(type: "boolean", nullable: false),
                    remind_anniversary = table.Column<bool>(type: "boolean", nullable: false),
                    reminder_time = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: false),
                    quiet_hours_start = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: false),
                    quiet_hours_end = table.Column<string>(type: "character varying(5)", maxLength: 5, nullable: false),
                    distance_unit = table.Column<string>(type: "character varying(2)", maxLength: 2, nullable: false),
                    temperature_unit = table.Column<string>(type: "character varying(1)", maxLength: 1, nullable: false),
                    default_place_scope = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_user_settings", x => x.id);
                    table.CheckConstraint("ck_user_settings_default_place_scope", "default_place_scope IN ('shared', 'personal')");
                    table.CheckConstraint("ck_user_settings_distance_unit", "distance_unit IN ('km', 'mi')");
                    table.CheckConstraint("ck_user_settings_temperature_unit", "temperature_unit IN ('C', 'F')");
                    table.CheckConstraint("ck_user_settings_times", "reminder_time ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND quiet_hours_start ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND quiet_hours_end ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'");
                    table.ForeignKey(
                        name: "fk_user_settings_asp_net_users_id",
                        column: x => x.id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_users_delete_after",
                table: "users",
                column: "delete_after",
                filter: "delete_after IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "user_settings");

            migrationBuilder.DropIndex(
                name: "ix_users_delete_after",
                table: "users");

            migrationBuilder.DropColumn(
                name: "delete_after",
                table: "users");

            migrationBuilder.DropColumn(
                name: "deletion_requested_at",
                table: "users");
        }
    }
}
