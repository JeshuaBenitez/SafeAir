-- Dictionary compatibility layer
-- Goal: expose dictionary/ERD-compatible structures without breaking current API schema.

BEGIN;

CREATE SCHEMA IF NOT EXISTS dictionary_compat;

-- 1) Add optional columns expected by dictionary where current schema differs.
ALTER TABLE IF EXISTS emulators
  ADD COLUMN IF NOT EXISTS "updateIntervalSec" integer,
  ADD COLUMN IF NOT EXISTS "isRunning" boolean;

UPDATE emulators
SET "isRunning" = (status = 'online')
WHERE "isRunning" IS NULL;

ALTER TABLE IF EXISTS devices
  ADD COLUMN IF NOT EXISTS "size" varchar(50),
  ADD COLUMN IF NOT EXISTS "installedAt" timestamptz,
  ADD COLUMN IF NOT EXISTS "isActive" boolean;

UPDATE devices
SET "installedAt" = COALESCE("installedAt", "createdAt"),
    "isActive" = COALESCE("isActive", "isEnabled")
WHERE "installedAt" IS NULL OR "isActive" IS NULL;

ALTER TABLE IF EXISTS room_setups
  ADD COLUMN IF NOT EXISTS "isValid" boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS "validationNotes" text;

-- 2) Compatibility views with dictionary names/shape.
CREATE OR REPLACE VIEW dictionary_compat."instance" AS
SELECT
  i.id,
  i.name,
  i."createdAt" AS created_at
FROM instances i;

CREATE OR REPLACE VIEW dictionary_compat.room AS
SELECT
  r.id,
  r."instanceId" AS instance_id,
  r.name,
  r."createdAt" AS created_at
FROM rooms r;

CREATE OR REPLACE VIEW dictionary_compat.room_setup AS
SELECT
  rs.id,
  rs."roomId" AS room_id,
  rs."roomWidth"::numeric(16,2) AS room_width_m,
  rs."roomLength"::numeric(16,2) AS room_length_m,
  rs."windowCount" AS window_count,
  rs."windowAreaTotal"::numeric(16,2) AS window_area_total_m2,
  rs."isValid" AS is_valid,
  rs."validationNotes" AS validation_notes,
  rs."createdAt" AS created_at
FROM room_setups rs;

CREATE OR REPLACE VIEW dictionary_compat.room_setup_derived AS
SELECT
  rsd.id,
  rs.id AS room_setup_id,
  rsd."roomArea"::numeric(10,2) AS room_area_m2,
  rsd."windowAreaRatio"::numeric(10,6) AS window_area_ratio,
  rsd."windowFactorBase"::numeric(10,6) AS window_factor_base,
  rsd."windowFactor"::numeric(10,6) AS window_factor,
  rsd."areaTermica"::numeric(10,2) AS area_termica_m2,
  rsd."areaCalidadAire"::numeric(10,2) AS area_calidad_aire_m2,
  rsd."createdAt" AS computed_at
FROM room_setup_derived rsd
JOIN room_setups rs ON rs."roomId" = rsd."roomId";

CREATE OR REPLACE VIEW dictionary_compat.emulator AS
SELECT
  e.id,
  e."roomId" AS room_id,
  COALESCE(e."updateIntervalSec", 10) AS update_interval_sec,
  COALESCE(e."isRunning", e.status = 'online') AS is_running,
  e."createdAt" AS created_at
FROM emulators e;

CREATE OR REPLACE VIEW dictionary_compat.device AS
SELECT
  d.id,
  d."roomId" AS room_id,
  d.type,
  COALESCE(d."size", d.metadata ->> 'size') AS size,
  d.label,
  COALESCE(d."installedAt", d."createdAt") AS installed_at,
  COALESCE(d."isActive", d."isEnabled") AS is_active
FROM devices d;

CREATE OR REPLACE VIEW dictionary_compat.cycle AS
SELECT
  c.id,
  e.id AS emulator_id,
  c."cycleNumber"::bigint AS cycle_no,
  c."startedAt" AS time,
  rs.id AS room_setup_id
FROM cycles c
LEFT JOIN emulators e ON e."roomId" = c."roomId"
LEFT JOIN room_setups rs ON rs."roomId" = c."roomId";

CREATE OR REPLACE VIEW dictionary_compat.cycle_measurement AS
SELECT
  cm.id,
  cm."cycleId" AS cycle_id,
  'temperature'::text AS metric,
  cm.temperature::numeric(14,2) AS value,
  cm."measuredAt" AS measured_at,
  cm."receivedAt" AS received_at
FROM cycle_measurements cm
UNION ALL
SELECT
  cm.id,
  cm."cycleId" AS cycle_id,
  'humidity'::text AS metric,
  cm.humidity::numeric(14,2) AS value,
  cm."measuredAt" AS measured_at,
  cm."receivedAt" AS received_at
FROM cycle_measurements cm
UNION ALL
SELECT
  cm.id,
  cm."cycleId" AS cycle_id,
  'co2'::text AS metric,
  cm.co2::numeric(14,2) AS value,
  cm."measuredAt" AS measured_at,
  cm."receivedAt" AS received_at
FROM cycle_measurements cm
UNION ALL
SELECT
  cm.id,
  cm."cycleId" AS cycle_id,
  'pm25'::text AS metric,
  cm.pm25::numeric(14,2) AS value,
  cm."measuredAt" AS measured_at,
  cm."receivedAt" AS received_at
FROM cycle_measurements cm;

CREATE OR REPLACE VIEW dictionary_compat.device_action AS
SELECT
  da.id,
  da."cycleId" AS cycle_id,
  dmap.id AS device_id,
  CASE WHEN da."deviceType" = 'minisplit' THEN da.action ELSE NULL END AS minisplit_mode,
  da.level AS power,
  da.reason,
  da."executedAt" AS applied_at
FROM device_actions da
LEFT JOIN LATERAL (
  SELECT d.id
  FROM devices d
  WHERE d."roomId" = da."roomId"
    AND d.type::text = da."deviceType"::text
  ORDER BY d."createdAt" DESC
  LIMIT 1
) dmap ON TRUE;

CREATE OR REPLACE VIEW dictionary_compat.alarm AS
SELECT
  a.id,
  a."roomId" AS room_id,
  a."cycleId" AS cycle_id,
  a.type,
  a.message,
  a."createdAt" AS created_at
FROM alarms a;

COMMIT;
