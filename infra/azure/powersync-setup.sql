-- Run ONCE on the beta database, after the API has started for the first time (it creates the tables).
-- Steps: docs/COMMANDS.md, "Beta server (KAN-61)". The password is passed in by psql (-v ps_password=...), so it is
-- never written in this file. Keep it only in your password manager and in PowerSync Cloud.
--
-- 1. A read-only user PowerSync uses to copy our tables to the phones (needs REPLICATION).
CREATE ROLE powersync_role WITH REPLICATION LOGIN PASSWORD :'ps_password';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO powersync_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO powersync_role;

-- 2. The tables PowerSync listens to. Azure does not allow "FOR ALL TABLES" (it needs a superuser), so the
-- synced tables are listed. They are the tables in backend/docker/powersync/sync-rules.yaml. When a feature adds
-- a synced table, run:  ALTER PUBLICATION powersync ADD TABLE <new_table>;
CREATE PUBLICATION powersync FOR TABLE
  trips, trip_stops, flights, places, checklist_items, expenses, media, user_settings;
