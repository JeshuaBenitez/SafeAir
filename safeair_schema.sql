--
-- PostgreSQL database dump
--

\restrict MgXA4afwfSbCrdrboL4hJxFkSPpKXoqWgb9GGyXGqOGFpQAJvgK9VW9zFWZ7biA

-- Dumped from database version 16.13 (Debian 16.13-1.pgdg13+1)
-- Dumped by pg_dump version 16.13 (Debian 16.13-1.pgdg13+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: dictionary_compat; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA dictionary_compat;


ALTER SCHEMA dictionary_compat OWNER TO postgres;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: 
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: enum_alarms_severity; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enum_alarms_severity AS ENUM (
    'low',
    'medium',
    'high'
);


ALTER TYPE public.enum_alarms_severity OWNER TO postgres;

--
-- Name: enum_alarms_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enum_alarms_type AS ENUM (
    'critical_persistence',
    'abrupt_change',
    'no_improvement',
    'invalid_configuration'
);


ALTER TYPE public.enum_alarms_type OWNER TO postgres;

--
-- Name: enum_cycle_measurements_source; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enum_cycle_measurements_source AS ENUM (
    'mqtt',
    'rest'
);


ALTER TYPE public.enum_cycle_measurements_source OWNER TO postgres;

--
-- Name: enum_cycles_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enum_cycles_status AS ENUM (
    'open',
    'closed'
);


ALTER TYPE public.enum_cycles_status OWNER TO postgres;

--
-- Name: enum_device_actions_deviceType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."enum_device_actions_deviceType" AS ENUM (
    'minisplit',
    'purifier',
    'extractor'
);


ALTER TYPE public."enum_device_actions_deviceType" OWNER TO postgres;

--
-- Name: enum_device_actions_level; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enum_device_actions_level AS ENUM (
    'low',
    'medium',
    'high'
);


ALTER TYPE public.enum_device_actions_level OWNER TO postgres;

--
-- Name: enum_device_actions_requestedBy; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."enum_device_actions_requestedBy" AS ENUM (
    'rule-engine',
    'manual'
);


ALTER TYPE public."enum_device_actions_requestedBy" OWNER TO postgres;

--
-- Name: enum_device_states_deviceType; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public."enum_device_states_deviceType" AS ENUM (
    'minisplit',
    'purifier',
    'extractor'
);


ALTER TYPE public."enum_device_states_deviceType" OWNER TO postgres;

--
-- Name: enum_device_states_source; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enum_device_states_source AS ENUM (
    'mqtt',
    'rest'
);


ALTER TYPE public.enum_device_states_source OWNER TO postgres;

--
-- Name: enum_devices_type; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enum_devices_type AS ENUM (
    'minisplit',
    'purifier',
    'extractor'
);


ALTER TYPE public.enum_devices_type OWNER TO postgres;

--
-- Name: enum_emulators_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enum_emulators_status AS ENUM (
    'online',
    'offline'
);


ALTER TYPE public.enum_emulators_status OWNER TO postgres;

--
-- Name: enum_rooms_status; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enum_rooms_status AS ENUM (
    'idle',
    'monitoring',
    'alarm'
);


ALTER TYPE public.enum_rooms_status OWNER TO postgres;

--
-- Name: enum_users_role; Type: TYPE; Schema: public; Owner: postgres
--

CREATE TYPE public.enum_users_role AS ENUM (
    'admin',
    'operator'
);


ALTER TYPE public.enum_users_role OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alarms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.alarms (
    id uuid NOT NULL,
    "roomId" uuid NOT NULL,
    "cycleId" uuid NOT NULL,
    type public.enum_alarms_type NOT NULL,
    severity public.enum_alarms_severity NOT NULL,
    message character varying(255) NOT NULL,
    "isActive" boolean DEFAULT true NOT NULL,
    "triggeredAt" timestamp with time zone NOT NULL,
    "resolvedAt" timestamp with time zone,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    "createdAt" timestamp with time zone,
    "updatedAt" timestamp with time zone
);


ALTER TABLE public.alarms OWNER TO postgres;

--
-- Name: api_request_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.api_request_logs (
    id uuid NOT NULL,
    method character varying(10) NOT NULL,
    path character varying(255) NOT NULL,
    "statusCode" integer NOT NULL,
    "receivedAt" timestamp with time zone NOT NULL,
    "respondedAt" timestamp with time zone NOT NULL,
    "durationMs" integer NOT NULL,
    ip character varying(64),
    "userAgent" character varying(255),
    "createdAt" timestamp with time zone,
    "updatedAt" timestamp with time zone
);


ALTER TABLE public.api_request_logs OWNER TO postgres;

--
-- Name: cycle_measurements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cycle_measurements (
    id uuid NOT NULL,
    "roomId" uuid NOT NULL,
    "cycleId" uuid NOT NULL,
    temperature double precision NOT NULL,
    humidity double precision NOT NULL,
    co2 double precision NOT NULL,
    pm25 double precision NOT NULL,
    "measuredAt" timestamp with time zone NOT NULL,
    "receivedAt" timestamp with time zone NOT NULL,
    source public.enum_cycle_measurements_source DEFAULT 'mqtt'::public.enum_cycle_measurements_source NOT NULL,
    "createdAt" timestamp with time zone,
    "updatedAt" timestamp with time zone
);


ALTER TABLE public.cycle_measurements OWNER TO postgres;

--
-- Name: cycles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.cycles (
    id uuid NOT NULL,
    "roomId" uuid NOT NULL,
    "cycleNumber" integer NOT NULL,
    status public.enum_cycles_status DEFAULT 'open'::public.enum_cycles_status NOT NULL,
    "startedAt" timestamp with time zone NOT NULL,
    "endedAt" timestamp with time zone,
    "createdAt" timestamp with time zone,
    "updatedAt" timestamp with time zone
);


ALTER TABLE public.cycles OWNER TO postgres;

--
-- Name: device_actions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.device_actions (
    id uuid NOT NULL,
    "roomId" uuid NOT NULL,
    "cycleId" uuid NOT NULL,
    "deviceType" public."enum_device_actions_deviceType" NOT NULL,
    "deviceIndex" integer DEFAULT 1 NOT NULL,
    action character varying(80) NOT NULL,
    reason character varying(255) NOT NULL,
    level public.enum_device_actions_level,
    "requestedBy" public."enum_device_actions_requestedBy" DEFAULT 'rule-engine'::public."enum_device_actions_requestedBy" NOT NULL,
    "executedAt" timestamp with time zone NOT NULL,
    "createdAt" timestamp with time zone,
    "updatedAt" timestamp with time zone
);


ALTER TABLE public.device_actions OWNER TO postgres;

--
-- Name: device_states; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.device_states (
    id uuid NOT NULL,
    "roomId" uuid NOT NULL,
    "emulatorId" character varying(120) NOT NULL,
    "deviceType" public."enum_device_states_deviceType" NOT NULL,
    "deviceIndex" integer DEFAULT 1 NOT NULL,
    "isOn" boolean NOT NULL,
    mode character varying(80),
    "targetTemperature" double precision,
    "ambientTemperature" double precision,
    "ambientHumidity" double precision,
    "reportedAt" timestamp with time zone NOT NULL,
    source public.enum_device_states_source DEFAULT 'mqtt'::public.enum_device_states_source NOT NULL,
    payload jsonb DEFAULT '{}'::jsonb NOT NULL,
    "createdAt" timestamp with time zone,
    "updatedAt" timestamp with time zone
);


ALTER TABLE public.device_states OWNER TO postgres;

--
-- Name: devices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.devices (
    id uuid NOT NULL,
    "roomId" uuid NOT NULL,
    type public.enum_devices_type NOT NULL,
    label character varying(80) NOT NULL,
    "isEnabled" boolean DEFAULT true NOT NULL,
    metadata jsonb DEFAULT '{}'::jsonb NOT NULL,
    "createdAt" timestamp with time zone,
    "updatedAt" timestamp with time zone
);


ALTER TABLE public.devices OWNER TO postgres;

--
-- Name: emulators; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.emulators (
    id uuid NOT NULL,
    "roomId" uuid,
    "emulatorExternalId" character varying(120) NOT NULL,
    status public.enum_emulators_status DEFAULT 'online'::public.enum_emulators_status NOT NULL,
    "createdAt" timestamp with time zone,
    "updatedAt" timestamp with time zone
);


ALTER TABLE public.emulators OWNER TO postgres;

--
-- Name: instances; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.instances (
    id uuid NOT NULL,
    "userId" uuid,
    name character varying(120) NOT NULL,
    description text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp with time zone,
    "updatedAt" timestamp with time zone
);


ALTER TABLE public.instances OWNER TO postgres;

--
-- Name: room_setup_derived; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.room_setup_derived (
    id uuid NOT NULL,
    "roomId" uuid NOT NULL,
    "roomArea" double precision NOT NULL,
    "windowAreaRatio" double precision NOT NULL,
    "windowFactorBase" double precision NOT NULL,
    "windowFactor" double precision NOT NULL,
    "areaTermica" double precision NOT NULL,
    "areaCalidadAire" double precision NOT NULL,
    "createdAt" timestamp with time zone,
    "updatedAt" timestamp with time zone
);


ALTER TABLE public.room_setup_derived OWNER TO postgres;

--
-- Name: room_setups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.room_setups (
    id uuid NOT NULL,
    "roomId" uuid NOT NULL,
    "roomWidth" double precision NOT NULL,
    "roomLength" double precision NOT NULL,
    "roomHeight" double precision NOT NULL,
    "windowCount" integer NOT NULL,
    "windowAreaTotal" double precision NOT NULL,
    "minisplitCount" integer NOT NULL,
    "purifierCount" integer NOT NULL,
    "extractorCount" integer NOT NULL,
    "createdAt" timestamp with time zone,
    "updatedAt" timestamp with time zone
);


ALTER TABLE public.room_setups OWNER TO postgres;

--
-- Name: rooms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rooms (
    id uuid NOT NULL,
    "instanceId" uuid NOT NULL,
    name character varying(100) NOT NULL,
    status public.enum_rooms_status DEFAULT 'idle'::public.enum_rooms_status NOT NULL,
    "createdAt" timestamp with time zone,
    "updatedAt" timestamp with time zone
);


ALTER TABLE public.rooms OWNER TO postgres;

--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id uuid NOT NULL,
    email character varying(120) NOT NULL,
    "passwordHash" character varying(255) NOT NULL,
    "fullName" character varying(120) NOT NULL,
    role public.enum_users_role DEFAULT 'operator'::public.enum_users_role NOT NULL,
    "otpCode" character varying(6),
    "otpExpiresAt" timestamp with time zone,
    "createdAt" timestamp with time zone,
    "updatedAt" timestamp with time zone,
    enabled boolean DEFAULT true NOT NULL
);


ALTER TABLE public.users OWNER TO postgres;

--
-- Name: alarms alarms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alarms
    ADD CONSTRAINT alarms_pkey PRIMARY KEY (id);


--
-- Name: api_request_logs api_request_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_request_logs
    ADD CONSTRAINT api_request_logs_pkey PRIMARY KEY (id);


--
-- Name: cycle_measurements cycle_measurements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cycle_measurements
    ADD CONSTRAINT cycle_measurements_pkey PRIMARY KEY (id);


--
-- Name: cycles cycles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cycles
    ADD CONSTRAINT cycles_pkey PRIMARY KEY (id);


--
-- Name: device_actions device_actions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.device_actions
    ADD CONSTRAINT device_actions_pkey PRIMARY KEY (id);


--
-- Name: device_states device_states_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.device_states
    ADD CONSTRAINT device_states_pkey PRIMARY KEY (id);


--
-- Name: devices devices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT devices_pkey PRIMARY KEY (id);


--
-- Name: emulators emulators_emulatorExternalId_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emulators
    ADD CONSTRAINT "emulators_emulatorExternalId_key" UNIQUE ("emulatorExternalId");


--
-- Name: emulators emulators_emulatorExternalId_key1; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emulators
    ADD CONSTRAINT "emulators_emulatorExternalId_key1" UNIQUE ("emulatorExternalId");


--
-- Name: emulators emulators_emulatorExternalId_key2; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emulators
    ADD CONSTRAINT "emulators_emulatorExternalId_key2" UNIQUE ("emulatorExternalId");


--
-- Name: emulators emulators_emulatorExternalId_key3; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emulators
    ADD CONSTRAINT "emulators_emulatorExternalId_key3" UNIQUE ("emulatorExternalId");


--
-- Name: emulators emulators_emulatorExternalId_key4; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emulators
    ADD CONSTRAINT "emulators_emulatorExternalId_key4" UNIQUE ("emulatorExternalId");


--
-- Name: emulators emulators_emulatorExternalId_key5; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emulators
    ADD CONSTRAINT "emulators_emulatorExternalId_key5" UNIQUE ("emulatorExternalId");


--
-- Name: emulators emulators_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emulators
    ADD CONSTRAINT emulators_pkey PRIMARY KEY (id);


--
-- Name: emulators emulators_roomId_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emulators
    ADD CONSTRAINT "emulators_roomId_key" UNIQUE ("roomId");


--
-- Name: instances instances_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.instances
    ADD CONSTRAINT instances_pkey PRIMARY KEY (id);


--
-- Name: room_setup_derived room_setup_derived_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.room_setup_derived
    ADD CONSTRAINT room_setup_derived_pkey PRIMARY KEY (id);


--
-- Name: room_setup_derived room_setup_derived_roomId_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.room_setup_derived
    ADD CONSTRAINT "room_setup_derived_roomId_key" UNIQUE ("roomId");


--
-- Name: room_setups room_setups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.room_setups
    ADD CONSTRAINT room_setups_pkey PRIMARY KEY (id);


--
-- Name: room_setups room_setups_roomId_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.room_setups
    ADD CONSTRAINT "room_setups_roomId_key" UNIQUE ("roomId");


--
-- Name: rooms rooms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT rooms_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_email_key1; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key1 UNIQUE (email);


--
-- Name: users users_email_key2; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key2 UNIQUE (email);


--
-- Name: users users_email_key3; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key3 UNIQUE (email);


--
-- Name: users users_email_key4; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key4 UNIQUE (email);


--
-- Name: users users_email_key5; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key5 UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: alarms_room_id_is_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX alarms_room_id_is_active ON public.alarms USING btree ("roomId", "isActive");


--
-- Name: api_request_logs_path_received_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX api_request_logs_path_received_at ON public.api_request_logs USING btree (path, "receivedAt");


--
-- Name: api_request_logs_received_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX api_request_logs_received_at ON public.api_request_logs USING btree ("receivedAt");


--
-- Name: cycle_measurements_room_id_measured_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX cycle_measurements_room_id_measured_at ON public.cycle_measurements USING btree ("roomId", "measuredAt");


--
-- Name: cycle_measurements_room_id_received_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX cycle_measurements_room_id_received_at ON public.cycle_measurements USING btree ("roomId", "receivedAt");


--
-- Name: cycles_room_id_cycle_number; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX cycles_room_id_cycle_number ON public.cycles USING btree ("roomId", "cycleNumber");


--
-- Name: device_states_emulator_id_reported_at; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX device_states_emulator_id_reported_at ON public.device_states USING btree ("emulatorId", "reportedAt");


--
-- Name: device_states_room_id_device_type_device_index; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX device_states_room_id_device_type_device_index ON public.device_states USING btree ("roomId", "deviceType", "deviceIndex");


--
-- Name: alarms alarms_cycleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alarms
    ADD CONSTRAINT "alarms_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES public.cycles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: alarms alarms_roomId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alarms
    ADD CONSTRAINT "alarms_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES public.rooms(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: cycle_measurements cycle_measurements_cycleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cycle_measurements
    ADD CONSTRAINT "cycle_measurements_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES public.cycles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: cycle_measurements cycle_measurements_roomId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cycle_measurements
    ADD CONSTRAINT "cycle_measurements_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES public.rooms(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: cycles cycles_roomId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.cycles
    ADD CONSTRAINT "cycles_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES public.rooms(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: device_actions device_actions_cycleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.device_actions
    ADD CONSTRAINT "device_actions_cycleId_fkey" FOREIGN KEY ("cycleId") REFERENCES public.cycles(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: device_actions device_actions_roomId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.device_actions
    ADD CONSTRAINT "device_actions_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES public.rooms(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: devices devices_roomId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.devices
    ADD CONSTRAINT "devices_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES public.rooms(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: emulators emulators_roomId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.emulators
    ADD CONSTRAINT "emulators_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES public.rooms(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: instances instances_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.instances
    ADD CONSTRAINT "instances_userId_fkey" FOREIGN KEY ("userId") REFERENCES public.users(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: room_setup_derived room_setup_derived_roomId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.room_setup_derived
    ADD CONSTRAINT "room_setup_derived_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES public.rooms(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: room_setups room_setups_roomId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.room_setups
    ADD CONSTRAINT "room_setups_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES public.rooms(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: rooms rooms_instanceId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rooms
    ADD CONSTRAINT "rooms_instanceId_fkey" FOREIGN KEY ("instanceId") REFERENCES public.instances(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--

\unrestrict MgXA4afwfSbCrdrboL4hJxFkSPpKXoqWgb9GGyXGqOGFpQAJvgK9VW9zFWZ7biA

