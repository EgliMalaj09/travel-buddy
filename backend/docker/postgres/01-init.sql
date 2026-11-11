-- Runs once when the local database is first created.
-- 1. A separate database where PowerSync keeps its own data (bucket storage). No MongoDB needed.
CREATE DATABASE powersync_storage OWNER travelapp;

-- 2. A read-only user PowerSync uses to replicate our tables (needs REPLICATION).
CREATE ROLE powersync_role WITH REPLICATION LOGIN PASSWORD 'powersync_local';
GRANT SELECT ON ALL TABLES IN SCHEMA public TO powersync_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT ON TABLES TO powersync_role;

-- 3. The publication PowerSync listens to. Tables added by EF Core migrations are included automatically.
CREATE PUBLICATION powersync FOR ALL TABLES;
