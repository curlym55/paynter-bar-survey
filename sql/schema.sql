-- ================================================================
-- Paynter Bar Survey — Supabase Schema
-- Run this entire file in the Supabase SQL Editor (one paste)
-- ================================================================

-- Drop existing tables if re-running
drop table if exists votes cascade;
drop table if exists drinks cascade;
drop view  if exists vote_counts;

-- ── Drinks table ─────────────────────────────────────────────
create table drinks (
  id              uuid primary key default gen_random_uuid(),
  category        text not null,          -- wine | sparkling | beer | cider | spirits | liqueur | premix | zerowine | zerobeer | zerospirits
  name            text not null,
  type            text not null,
  price_range     text not null,          -- Budget | Mid-range | Premium | Value | Standard
  price_range_order int not null default 0, -- 0=cheap, 1=mid, 2=premium (for sorting)
  price           text not null,          -- display string e.g. "$10–$18/btl"
  suggested_by    text,                   -- null for seeded drinks
  notes           text,
  is_seed         boolean not null default false,
  created_at      timestamptz default now()
);

-- ── Votes table ───────────────────────────────────────────────
create table votes (
  id              uuid primary key default gen_random_uuid(),
  resident_name   text not null,
  drink_id        uuid not null references drinks(id) on delete cascade,
  created_at      timestamptz default now(),
  unique(resident_name, drink_id)          -- one vote per person per drink
);

-- ── Vote counts view ──────────────────────────────────────────
create view vote_counts as
  select drink_id, count(*) as vote_count
  from votes
  group by drink_id;

-- ── Row Level Security ────────────────────────────────────────
alter table drinks enable row level security;
alter table votes  enable row level security;

-- Anyone can read drinks
create policy "Public read drinks" on drinks for select using (true);
-- Anyone can insert a drink (Phase 1 suggestions)
create policy "Public insert drinks" on drinks for insert with check (true);

-- Anyone can read votes (for the vote_counts view)
create policy "Public read votes" on votes for select using (true);
-- Anyone can insert a vote
create policy "Public insert votes" on votes for insert with check (true);

-- ── Seed data ────────────────────────────────────────────────
insert into drinks (category, name, type, price_range, price_range_order, price, is_seed) values

-- WINE
('wine', 'Jacob''s Creek Shiraz',              'Shiraz / Syrah',        'Budget',    0, '$10–$18/btl', true),
('wine', 'Penfolds Koonunga Hill Cab Sav',     'Cabernet Sauvignon',    'Mid-range', 1, '$19–$28/btl', true),
('wine', 'Oyster Bay Sauvignon Blanc',          'Sauvignon Blanc',       'Mid-range', 1, '$19–$28/btl', true),
('wine', 'Wolf Blass Yellow Label Chardonnay', 'Chardonnay',            'Budget',    0, '$10–$18/btl', true),
('wine', 'Yering Station Village Pinot Noir',  'Pinot Noir',            'Premium',   2, '$29–$45/btl', true),

-- SPARKLING
('sparkling', 'Yellowglen Pink',               'Sparkling Rosé',        'Budget',    0, '$12–$20/btl', true),
('sparkling', 'Jansz Premium Cuvée',           'Australian Sparkling',  'Mid-range', 1, '$21–$35/btl', true),
('sparkling', 'Chandon Garden Spritz',         'Australian Sparkling',  'Premium',   2, '$36–$60/btl', true),
('sparkling', 'Brown Brothers Moscato',        'Moscato',               'Budget',    0, '$12–$20/btl', true),

-- BEER
('beer', 'XXXX Gold',                          'Lager',       'Value',    0, '$3–$4', true),
('beer', 'Great Northern Original',            'Lager',       'Standard', 1, '$4–$5', true),
('beer', 'Coopers Pale Ale',                   'Pale Ale',    'Standard', 1, '$4–$5', true),
('beer', 'Tooheys New',                        'Lager',       'Value',    0, '$3–$4', true),
('beer', 'Stone & Wood Pacific Ale',           'Craft Beer',  'Premium',  2, '$5–$6', true),

-- CIDER
('cider', 'Strongbow Original',                'Apple',       'Value',    0, '$3–$4', true),
('cider', 'Rekorderlig Strawberry-Lime',       'Flavoured',   'Standard', 1, '$4–$5', true),
('cider', 'Willie Smiths Organic Apple',       'Apple',       'Premium',  2, '$5–$6', true),

-- SPIRITS
('spirits', 'Jim Beam White Label',            'Whisky / Bourbon', 'Budget',    0, 'Up to $40/btl', true),
('spirits', 'Absolut Vodka',                   'Vodka',            'Budget',    0, 'Up to $40/btl', true),
('spirits', 'Bundaberg Rum',                   'Rum',              'Budget',    0, 'Up to $40/btl', true),
('spirits', 'Hendrick''s Gin',                 'Gin',              'Mid-range', 1, '$41–$65/btl',   true),
('spirits', 'Johnnie Walker Black',            'Whisky / Bourbon', 'Mid-range', 1, '$41–$65/btl',   true),
('spirits', 'Diplomatico Reserva Rum',         'Rum',              'Premium',   2, '$66–$90/btl',   true),

-- LIQUEUR & FORTIFIED
('liqueur', 'Penfolds Club Tawny Port',        'Port',             'Budget',    0, 'Up to $30/btl', true),
('liqueur', 'Brown Brothers Muscat',           'Muscat',           'Budget',    0, 'Up to $30/btl', true),
('liqueur', 'Baileys Irish Cream',             'Irish Cream',      'Mid-range', 1, '$31–$55/btl',   true),
('liqueur', 'Kahlúa Coffee Liqueur',           'Coffee Liqueur',   'Mid-range', 1, '$31–$55/btl',   true),
('liqueur', 'Cointreau',                       'Orange Liqueur',   'Premium',   2, '$56–$90/btl',   true),

-- PREMIX
('premix', 'Jack Daniel''s & Cola',            'Bourbon & Cola',   'Standard', 1, '$6–$7', true),
('premix', 'Gordon''s Pink Gin & Tonic',       'Gin & Tonic',      'Standard', 1, '$6–$7', true),
('premix', 'Vodka Cruiser',                    'Vodka Mix',        'Value',    0, '$5–$6', true),
('premix', 'White Claw Hard Seltzer',          'Seltzer',          'Standard', 1, '$6–$7', true),
('premix', 'Canadian Club & Dry',              'Bourbon & Cola',   'Standard', 1, '$6–$7', true),

-- ZERO WINE
('zerowine', 'Giesen 0% Sauvignon Blanc',      'White',     'Mid-range', 1, '$19–$28/btl', true),
('zerowine', 'Edenvale Sparkling Cuvée',       'Sparkling', 'Budget',    0, '$10–$18/btl', true),
('zerowine', 'Rawson''s Retreat 0% Chardonnay','White',     'Budget',    0, '$10–$18/btl', true),

-- ZERO BEER
('zerobeer', 'Great Northern Zero',            'Lager',     'Value',    0, '$3–$4', true),
('zerobeer', 'Carlton Zero',                   'Lager',     'Value',    0, '$3–$4', true),
('zerobeer', 'Heineken 0.0',                   'Lager',     'Standard', 1, '$4–$5', true),
('zerobeer', 'Furphy Zero',                    'Pale Ale',  'Standard', 1, '$4–$5', true),

-- ZERO SPIRITS
('zerospirits', 'Seedlip Spice 94',            'Botanical / Aperitif', 'Mid-range', 1, '$31–$50/btl', true),
('zerospirits', 'Lyre''s American Malt',       'Whisky Alternative',   'Mid-range', 1, '$31–$50/btl', true),
('zerospirits', 'Four Pillars Non-Alc Gin',    'Gin Alternative',      'Premium',   2, '$51–$70/btl', true);
