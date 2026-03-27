-- BookBus core relational schema
-- Run this in Supabase SQL Editor.

create extension if not exists pgcrypto;

-- Booking lifecycle state
do $$
begin
  if not exists (select 1 from pg_type where typname = 'booking_status') then
    create type booking_status as enum ('pending', 'confirmed', 'cancelled');
  end if;
end $$;

create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null unique,
  phone text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.buses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  operator_name text not null,
  total_seats integer not null check (total_seats > 0),
  layout_json jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.routes (
  id uuid primary key default gen_random_uuid(),
  from_city text not null,
  to_city text not null,
  distance numeric(10,2) not null check (distance >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  bus_id uuid not null references public.buses(id) on delete restrict,
  route_id uuid not null references public.routes(id) on delete restrict,
  departure_time timestamptz not null,
  arrival_time timestamptz not null,
  date date not null,
  price numeric(10,2) not null check (price >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (arrival_time > departure_time)
);

create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete restrict,
  trip_id uuid not null references public.trips(id) on delete restrict,
  total_amount numeric(10,2) not null check (total_amount >= 0),
  status booking_status not null default 'pending',
  lock_expires_at timestamptz not null default (now() + interval '5 minutes'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Backward-compatible migration for existing databases
alter table if exists public.bookings
  add column if not exists lock_expires_at timestamptz;

update public.bookings
set lock_expires_at = created_at + interval '5 minutes'
where lock_expires_at is null;

create table if not exists public.booking_seats (
  id uuid primary key default gen_random_uuid(),
  booking_id uuid not null references public.bookings(id) on delete cascade,
  seat_number text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (booking_id, seat_number)
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

-- Helpful indexes for frequent queries
create index if not exists idx_routes_from_to on public.routes(from_city, to_city);
create index if not exists idx_trips_route_date on public.trips(route_id, date);
create index if not exists idx_trips_bus_date on public.trips(bus_id, date);
create index if not exists idx_bookings_user on public.bookings(user_id);
create index if not exists idx_bookings_trip on public.bookings(trip_id);
create index if not exists idx_booking_seats_booking on public.booking_seats(booking_id);
create index if not exists idx_booking_seats_seat_number on public.booking_seats(seat_number);
create index if not exists idx_notifications_user_created
  on public.notifications(user_id, created_at desc);

