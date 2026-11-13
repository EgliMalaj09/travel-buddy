using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TravelApp.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class Weather : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "weather_cache",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    kind = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    lat10 = table.Column<int>(type: "integer", nullable: false),
                    lng10 = table.Column<int>(type: "integer", nullable: false),
                    date = table.Column<DateOnly>(type: "date", nullable: false),
                    min_c = table.Column<double>(type: "double precision", nullable: false),
                    max_c = table.Column<double>(type: "double precision", nullable: false),
                    precipitation_mm = table.Column<double>(type: "double precision", nullable: false),
                    precipitation_chance = table.Column<int>(type: "integer", nullable: true),
                    snow_cm = table.Column<double>(type: "double precision", nullable: false),
                    fetched_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_weather_cache", x => x.id);
                    table.CheckConstraint("ck_weather_cache_chance", "precipitation_chance IS NULL OR precipitation_chance BETWEEN 0 AND 100");
                    table.CheckConstraint("ck_weather_cache_kind", "kind IN ('forecast', 'typical')");
                    table.CheckConstraint("ck_weather_cache_position", "lat10 BETWEEN -900 AND 900 AND lng10 BETWEEN -1800 AND 1800");
                });

            migrationBuilder.CreateIndex(
                name: "ix_weather_cache_fetched_at",
                table: "weather_cache",
                column: "fetched_at");

            migrationBuilder.CreateIndex(
                name: "ix_weather_cache_kind_lat10_lng10_date",
                table: "weather_cache",
                columns: new[] { "kind", "lat10", "lng10", "date" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "weather_cache");
        }
    }
}
