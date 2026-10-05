-- Site Safety Forms: database schema
-- Run this first in the Supabase SQL Editor.

-- App data for each login user (Supabase keeps the login itself in auth.users)
create table profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null,
  role        text not null default 'framer' check (role in ('framer', 'admin')),
  created_at  timestamptz not null default now()
);

create table sites (
  id          uuid primary key default gen_random_uuid(),
  name        text not null unique,
  address     text,
  created_at  timestamptz not null default now()
);

create table submissions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references profiles (id),
  site_id     uuid not null references sites (id),
  work_date   date not null,

  -- Safety checklist
  hard_hat                       boolean not null default false,
  hi_vis_vest                    boolean not null default false,
  safety_boots                   boolean not null default false,
  eye_protection                 boolean not null default false,
  fall_protection                boolean not null default false,
  ladders_scaffolding_inspected  boolean not null default false,
  tools_cords_ok                 boolean not null default false,
  hazards_identified             boolean not null default false,
  notes                          text,

  status      text not null default 'submitted' check (status in ('submitted', 'reviewed')),
  created_at  timestamptz not null default now(),

  -- One form per worker, per site, per day
  unique (user_id, site_id, work_date)
);

create table submission_photos (
  id             uuid primary key default gen_random_uuid(),
  submission_id  uuid not null references submissions (id) on delete cascade,
  storage_path   text not null unique,  -- where the file lives in the storage bucket
  file_name      text not null,         -- original file name, for display
  created_at     timestamptz not null default now()
);

-- Block direct browser access. The Express API uses the service role key,
-- which bypasses these, so all data goes through the API.
alter table profiles          enable row level security;
alter table sites             enable row level security;
alter table submissions       enable row level security;
alter table submission_photos enable row level security;

-- Private photo bucket: 5 MB limit, images only
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('submission-photos', 'submission-photos', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp']);