using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TravelApp.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class Expenses : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "expenses",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    trip_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    paid_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    scope = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    owner_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    title = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    category = table.Column<string>(type: "character varying(12)", maxLength: 12, nullable: false),
                    amount_minor = table.Column<long>(type: "bigint", nullable: false),
                    currency = table.Column<string>(type: "character(3)", fixedLength: true, maxLength: 3, nullable: false),
                    spent_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    fx_rate_date = table.Column<DateOnly>(type: "date", nullable: false),
                    place_id = table.Column<Guid>(type: "uuid", nullable: true),
                    note = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_expenses", x => x.id);
                    table.CheckConstraint("ck_expenses_amount", "amount_minor > 0 AND amount_minor <= 1000000000000");
                    table.CheckConstraint("ck_expenses_category", "category IN ('food', 'transport', 'stay', 'activities', 'shopping', 'other')");
                    table.CheckConstraint("ck_expenses_currency", "currency ~ '^[A-Z]{3}$'");
                    table.CheckConstraint("ck_expenses_owner", "(scope = 'personal') = (owner_user_id IS NOT NULL)");
                    table.CheckConstraint("ck_expenses_scope", "scope IN ('shared', 'personal')");
                    table.ForeignKey(
                        name: "fk_expenses_trip_trip_id",
                        column: x => x.trip_id,
                        principalTable: "trips",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_expenses_users_created_by_user_id",
                        column: x => x.created_by_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "fx_rates",
                columns: table => new
                {
                    date = table.Column<DateOnly>(type: "date", nullable: false),
                    currency = table.Column<string>(type: "character(3)", fixedLength: true, maxLength: 3, nullable: false),
                    rate_to_eur = table.Column<decimal>(type: "numeric(28,12)", precision: 28, scale: 12, nullable: false),
                    fetched_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_fx_rates", x => new { x.date, x.currency });
                    table.CheckConstraint("ck_fx_rates_currency", "currency ~ '^[A-Z]{3}$'");
                    table.CheckConstraint("ck_fx_rates_rate", "rate_to_eur > 0");
                });

            migrationBuilder.CreateIndex(
                name: "ix_expenses_created_by_user_id",
                table: "expenses",
                column: "created_by_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_expenses_trip_id_spent_at",
                table: "expenses",
                columns: new[] { "trip_id", "spent_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "expenses");

            migrationBuilder.DropTable(
                name: "fx_rates");
        }
    }
}
