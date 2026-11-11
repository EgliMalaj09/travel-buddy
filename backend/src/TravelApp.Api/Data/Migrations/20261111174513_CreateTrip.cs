using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TravelApp.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class CreateTrip : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "trips",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    owner_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    type = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    start_date = table.Column<DateOnly>(type: "date", nullable: true),
                    end_date = table.Column<DateOnly>(type: "date", nullable: true),
                    activities = table.Column<List<string>>(type: "text[]", nullable: false),
                    status = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    finished_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    cover_media_id = table.Column<Guid>(type: "uuid", nullable: true),
                    passport_country_snapshot = table.Column<string>(type: "character(2)", fixedLength: true, maxLength: 2, nullable: false),
                    home_currency_snapshot = table.Column<string>(type: "character(3)", fixedLength: true, maxLength: 3, nullable: false),
                    checklist_generated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    checklist_rules_version = table.Column<string>(type: "character varying(20)", maxLength: 20, nullable: true),
                    anniversary_enabled = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_trips", x => x.id);
                    table.CheckConstraint("ck_trips_dates", "(start_date IS NULL) = (end_date IS NULL) AND (end_date IS NULL OR end_date >= start_date)");
                    table.CheckConstraint("ck_trips_status", "status IN ('planned', 'finished')");
                    table.CheckConstraint("ck_trips_type", "type IN ('solo', 'shared')");
                    table.ForeignKey(
                        name: "fk_trips_users_owner_id",
                        column: x => x.owner_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "flights",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    trip_id = table.Column<Guid>(type: "uuid", nullable: false),
                    order = table.Column<int>(type: "integer", nullable: false),
                    direction = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    airline = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: true),
                    flight_number = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    departure_airport = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: true),
                    arrival_airport = table.Column<string>(type: "character varying(60)", maxLength: 60, nullable: true),
                    departure_local_time = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    arrival_local_time = table.Column<DateTime>(type: "timestamp without time zone", nullable: true),
                    departure_time_zone = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    arrival_time_zone = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: true),
                    booking_code = table.Column<string>(type: "character varying(12)", maxLength: 12, nullable: true),
                    seat = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    terminal = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_flights", x => x.id);
                    table.CheckConstraint("ck_flights_direction", "direction IN ('outbound', 'return', 'other')");
                    table.CheckConstraint("ck_flights_order", "\"order\" >= 0");
                    table.ForeignKey(
                        name: "fk_flights_trip_trip_id",
                        column: x => x.trip_id,
                        principalTable: "trips",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "trip_stops",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    trip_id = table.Column<Guid>(type: "uuid", nullable: false),
                    order = table.Column<int>(type: "integer", nullable: false),
                    country_code = table.Column<string>(type: "character(2)", fixedLength: true, maxLength: 2, nullable: false),
                    city_name = table.Column<string>(type: "character varying(120)", maxLength: 120, nullable: false),
                    lat = table.Column<double>(type: "double precision", nullable: true),
                    lng = table.Column<double>(type: "double precision", nullable: true),
                    geo_provider_id = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    nights = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_trip_stops", x => x.id);
                    table.CheckConstraint("ck_trip_stops_nights", "nights >= 0");
                    table.CheckConstraint("ck_trip_stops_order", "\"order\" >= 0");
                    table.CheckConstraint("ck_trip_stops_position", "(lat IS NULL) = (lng IS NULL) AND (lat IS NULL OR (lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180))");
                    table.ForeignKey(
                        name: "fk_trip_stops_trips_trip_id",
                        column: x => x.trip_id,
                        principalTable: "trips",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_flights_trip_id_order",
                table: "flights",
                columns: new[] { "trip_id", "order" });

            migrationBuilder.CreateIndex(
                name: "ix_trip_stops_trip_id_order",
                table: "trip_stops",
                columns: new[] { "trip_id", "order" });

            migrationBuilder.CreateIndex(
                name: "ix_trips_owner_id",
                table: "trips",
                column: "owner_id");

            migrationBuilder.CreateIndex(
                name: "ix_trips_updated_at",
                table: "trips",
                column: "updated_at");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "flights");

            migrationBuilder.DropTable(
                name: "trip_stops");

            migrationBuilder.DropTable(
                name: "trips");
        }
    }
}
