-- Dictionary compatibility bootstrap placeholder.
--
-- The API creates and migrates runtime tables with Sequelize after PostgreSQL
-- starts. This initdb phase runs before those tables exist, so compatibility
-- views must not be created here on a clean volume.
CREATE SCHEMA IF NOT EXISTS dictionary_compat;
