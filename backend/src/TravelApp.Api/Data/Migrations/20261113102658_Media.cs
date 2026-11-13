using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace TravelApp.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class Media : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "media",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    owner_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    trip_id = table.Column<Guid>(type: "uuid", nullable: true),
                    place_id = table.Column<Guid>(type: "uuid", nullable: true),
                    media_type = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    purpose = table.Column<string>(type: "character varying(12)", maxLength: 12, nullable: false),
                    scope = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    source = table.Column<string>(type: "character varying(12)", maxLength: 12, nullable: false),
                    is_suggested = table.Column<bool>(type: "boolean", nullable: false),
                    caption = table.Column<string>(type: "character varying(2000)", maxLength: 2000, nullable: true),
                    taken_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    lat = table.Column<double>(type: "double precision", nullable: true),
                    lng = table.Column<double>(type: "double precision", nullable: true),
                    country_code = table.Column<string>(type: "character(2)", fixedLength: true, maxLength: 2, nullable: true),
                    width = table.Column<int>(type: "integer", nullable: false),
                    height = table.Column<int>(type: "integer", nullable: false),
                    mime_type = table.Column<string>(type: "character varying(40)", maxLength: 40, nullable: false),
                    duration_sec = table.Column<int>(type: "integer", nullable: true),
                    content_hash = table.Column<string>(type: "character varying(64)", maxLength: 64, nullable: false),
                    quality_tier = table.Column<string>(type: "character varying(10)", maxLength: 10, nullable: false),
                    file_key = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    thumbnail_key = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    size_bytes = table.Column<long>(type: "bigint", nullable: true),
                    uploaded_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    include_in_video = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true),
                    sort_order = table.Column<int>(type: "integer", nullable: true),
                    created_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    deleted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    version = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("pk_media", x => x.id);
                    table.CheckConstraint("ck_media_content_hash", "content_hash ~ '^[0-9a-f]{64}$'");
                    table.CheckConstraint("ck_media_country_code", "country_code IS NULL OR country_code ~ '^[A-Z]{2}$'");
                    table.CheckConstraint("ck_media_media_type", "media_type IN ('photo', 'video')");
                    table.CheckConstraint("ck_media_position", "(lat IS NULL) = (lng IS NULL) AND (lat IS NULL OR (lat BETWEEN -90 AND 90 AND lng BETWEEN -180 AND 180))");
                    table.CheckConstraint("ck_media_purpose", "purpose IN ('trip_photo', 'avatar')");
                    table.CheckConstraint("ck_media_quality_tier", "quality_tier IN ('compressed', 'full')");
                    table.CheckConstraint("ck_media_scope", "scope IN ('shared', 'personal')");
                    table.CheckConstraint("ck_media_size", "width BETWEEN 1 AND 20000 AND height BETWEEN 1 AND 20000");
                    table.CheckConstraint("ck_media_source", "source IN ('camera', 'library', 'autocapture')");
                    table.CheckConstraint("ck_media_trip", "purpose <> 'trip_photo' OR trip_id IS NOT NULL");
                    table.ForeignKey(
                        name: "fk_media_trip_trip_id",
                        column: x => x.trip_id,
                        principalTable: "trips",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "fk_media_users_owner_user_id",
                        column: x => x.owner_user_id,
                        principalTable: "users",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "ix_media_deleted_at",
                table: "media",
                column: "deleted_at",
                filter: "deleted_at IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_media_owner_user_id",
                table: "media",
                column: "owner_user_id");

            migrationBuilder.CreateIndex(
                name: "ix_media_trip_id_owner_user_id_content_hash",
                table: "media",
                columns: new[] { "trip_id", "owner_user_id", "content_hash" },
                unique: true,
                filter: "deleted_at IS NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "media");
        }
    }
}
