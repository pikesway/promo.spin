/*
  # Add Trivia Support - Phase 2: Brands Geofencing Columns

  ## Summary
  Adds default geofencing fields to the brands table. These serve as brand-level defaults
  that can be overridden at the campaign or game instance level via config JSON.

  ## Changes
  1. New Columns on `brands`:
     - `default_geo_enabled` (boolean, nullable, default false) - Whether geofencing is enabled by default
     - `default_geo_lat` (double precision, nullable) - Default latitude for geofence center
     - `default_geo_lng` (double precision, nullable) - Default longitude for geofence center
     - `default_geo_radius_meters` (integer, nullable, default 100) - Default geofence radius

  ## Security
  - No RLS changes required (existing policies apply)

  ## Notes
  - All columns are nullable to support brands that don't use geofencing
  - Campaign-level and instance-level overrides remain in config JSON
  - No lat/lng columns added to campaigns table per design decision
*/

-- Add default_geo_enabled column
ALTER TABLE brands 
ADD COLUMN IF NOT EXISTS default_geo_enabled boolean DEFAULT false;

-- Add default_geo_lat column
ALTER TABLE brands 
ADD COLUMN IF NOT EXISTS default_geo_lat double precision;

-- Add default_geo_lng column
ALTER TABLE brands 
ADD COLUMN IF NOT EXISTS default_geo_lng double precision;

-- Add default_geo_radius_meters column
ALTER TABLE brands 
ADD COLUMN IF NOT EXISTS default_geo_radius_meters integer DEFAULT 100;
