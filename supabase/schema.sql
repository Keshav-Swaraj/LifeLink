-- ============================================================
-- LifeLink - Supabase Database Schema
-- Run this entire file in your Supabase SQL Editor
-- ============================================================

-- ─── ENUMS ───────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM ('victim', 'responder', 'hospital_staff');
CREATE TYPE severity_level AS ENUM ('red', 'orange', 'yellow', 'unknown');
CREATE TYPE emergency_status AS ENUM ('pending', 'dispatched', 'resolved', 'cancelled');
CREATE TYPE response_status AS ENUM ('accepted', 'rejected', 'on_the_way', 'arrived');

-- ─── HOSPITALS TABLE ───────────────────────────────────────────

CREATE TABLE public.hospitals (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  latitude    DOUBLE PRECISION NOT NULL,
  longitude   DOUBLE PRECISION NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ─── USERS TABLE ─────────────────────────────────────────────
-- Extends Supabase Auth (auth.users). One row per user.

CREATE TABLE public.users (
  id                    UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name             TEXT,
  phone                 TEXT UNIQUE,
  role                  user_role NOT NULL DEFAULT 'victim',
  is_verified_medical   BOOLEAN NOT NULL DEFAULT FALSE,
  medical_role          TEXT,           -- 'Doctor' | 'Nurse' | 'Paramedic'
  experience_years      INT,
  registration_number   TEXT,
  certificate_url       TEXT,           -- Supabase Storage path
  fcm_token             TEXT,           -- For push notifications
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── EMERGENCIES TABLE ───────────────────────────────────────

CREATE TABLE public.emergencies (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           UUID NOT NULL REFERENCES public.users(id) ON DELETE SET NULL,
  -- Location
  latitude          DOUBLE PRECISION NOT NULL,
  longitude         DOUBLE PRECISION NOT NULL,
  address           TEXT,
  -- Input data
  voice_transcript  TEXT,
  photo_urls        TEXT[],            -- Array of Supabase Storage paths
  -- AI Output
  severity          severity_level NOT NULL DEFAULT 'unknown',
  ai_summary        TEXT,
  ai_injuries       TEXT[],            -- List of detected injuries
  ai_risks          TEXT[],            -- List of detected risks
  ai_recommendations TEXT[],          -- Recommended first aid / actions
  ai_raw_response   JSONB,            -- Full Gemini response for debugging
  -- Status
  status            emergency_status NOT NULL DEFAULT 'pending',
  -- Offline support: client-generated ID for deduplication
  client_id         TEXT UNIQUE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER emergencies_updated_at
  BEFORE UPDATE ON public.emergencies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Index for fast geospatial-ish queries by status
CREATE INDEX idx_emergencies_status ON public.emergencies(status);
CREATE INDEX idx_emergencies_created_at ON public.emergencies(created_at DESC);

-- ─── EMERGENCY RESPONSES TABLE ───────────────────────────────

CREATE TABLE public.emergency_responses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  emergency_id  UUID NOT NULL REFERENCES public.emergencies(id) ON DELETE CASCADE,
  responder_id  UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  status        response_status NOT NULL DEFAULT 'accepted',
  eta_minutes   INT,
  accepted_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  arrived_at    TIMESTAMPTZ,
  notes         TEXT,
  UNIQUE(emergency_id, responder_id)
);

CREATE INDEX idx_responses_emergency ON public.emergency_responses(emergency_id);
CREATE INDEX idx_responses_responder ON public.emergency_responses(responder_id);

-- ─── ROW LEVEL SECURITY (RLS) ────────────────────────────────

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.emergency_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;

-- Hospitals: allow public read and insert for the demo
CREATE POLICY "Public can view hospitals"
  ON public.hospitals FOR SELECT USING (true);

CREATE POLICY "Public can insert hospitals"
  ON public.hospitals FOR INSERT WITH CHECK (true);

-- Users: can read/update their own profile
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.users FOR INSERT WITH CHECK (auth.uid() = id);

-- Emergencies: owner can do anything; verified medics & hospital staff can view all
CREATE POLICY "Owner can manage their emergency"
  ON public.emergencies FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Verified responders can view emergencies"
  ON public.emergencies FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid()
        AND (is_verified_medical = TRUE OR role = 'hospital_staff')
    )
  );

-- Emergency responses: responders can view/update their own responses
CREATE POLICY "Responders manage own responses"
  ON public.emergency_responses FOR ALL
  USING (auth.uid() = responder_id);

CREATE POLICY "Emergency owner can view responses"
  ON public.emergency_responses FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.emergencies
      WHERE id = emergency_id AND user_id = auth.uid()
    )
  );

-- ─── REALTIME ────────────────────────────────────────────────
-- Enable realtime on the emergencies table (for hospital dashboard)

ALTER PUBLICATION supabase_realtime ADD TABLE public.emergencies;
ALTER PUBLICATION supabase_realtime ADD TABLE public.emergency_responses;

-- ─── STORAGE BUCKET ──────────────────────────────────────────
-- Run this separately via Supabase Dashboard > Storage > New Bucket
-- Bucket name: emergency-media
-- Public: false (use signed URLs)
-- Alternatively, using the SQL API:

INSERT INTO storage.buckets (id, name, public)
VALUES ('emergency-media', 'emergency-media', false)
ON CONFLICT DO NOTHING;

-- ─── STORAGE RLS POLICIES ─────────────────────────────────────
-- RLS is already enabled on storage.objects by Supabase by default.

-- Allow authenticated users to upload files to the emergency-media bucket
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'emergency-media');

-- Allow authenticated users to view files in the emergency-media bucket
CREATE POLICY "Allow authenticated views"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'emergency-media');

-- Allow authenticated users to update their files
CREATE POLICY "Allow authenticated updates"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'emergency-media');
