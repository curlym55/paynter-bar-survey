-- ================================================================
-- Paynter Bar Survey — Supabase Schema v3
-- Run this entire file in the Supabase SQL Editor (one paste)
-- ================================================================

drop table if exists votes cascade;
drop table if exists drinks cascade;
drop table if exists settings cascade;
drop view  if exists vote_counts;

create table drinks (
  id                uuid primary key default gen_random_uuid(),
  category          text not null,
  name              text not null,
  type              text not null,
  price_range       text not null,
  price_range_order int  not null default 0,
  price             text not null,
  is_current_stock  boolean not null default false,
  current_bar_price text,
  retail_price      text,
  markup_price      text,
  suggested_by      text,
  notes             text,
  is_seed           boolean not null default false,
  created_at        timestamptz default now()
);

create table votes (
  id            uuid primary key default gen_random_uuid(),
  resident_name text not null,
  drink_id      uuid not null references drinks(id) on delete cascade,
  created_at    timestamptz default now(),
  unique(resident_name, drink_id)
);

create view vote_counts as
  select drink_id, count(*) as vote_count
  from votes
  group by drink_id;

-- ── Settings table (phase control) ───────────────────────────
create table settings (
  key   text primary key,
  value text not null
);

insert into settings (key, value) values ('voting_open', 'false');

alter table drinks   enable row level security;
alter table votes    enable row level security;
alter table settings enable row level security;

create policy "Public read drinks"    on drinks   for select using (true);
create policy "Public insert drinks"  on drinks   for insert with check (true);
create policy "Public read votes"     on votes    for select using (true);
create policy "Public insert votes"   on votes    for insert with check (true);
create policy "Public read settings"  on settings for select using (true);
create policy "Public update settings" on settings for update using (true);

-- ================================================================
-- COMPARISON LIST — Retail & 1.4x markup prices
-- ================================================================

insert into drinks (category, name, type, price_range, price_range_order, price, is_current_stock, current_bar_price, retail_price, markup_price, is_seed) values

-- ── WINE — BUDGET ─────────────────────────────────────────────
('wine', 'Yellow Tail Shiraz',               'Shiraz / Syrah',     'Budget',    0, '$9–$15/btl',   false, null, '$9',  '$12.60', true),
('wine', 'McGuigan Black Label Cabernet',     'Cabernet Sauvignon', 'Budget',    0, '$9–$15/btl',   false, null, '$8',  '$11.20', true),
('wine', 'Lindemans Bin 65 Chardonnay',       'Chardonnay',         'Budget',    0, '$9–$15/btl',   false, null, '$9',  '$12.60', true),
('wine', 'Banrock Station Shiraz',            'Shiraz / Syrah',     'Budget',    0, '$9–$15/btl',   false, null, '$10', '$14.00', true),
('wine', 'De Bortoli Sacred Hill Cabernet',   'Cabernet Sauvignon', 'Budget',    0, '$9–$15/btl',   false, null, '$10', '$14.00', true),

-- ── WINE — MID ────────────────────────────────────────────────
('wine', 'Tempus Two Silver Shiraz',          'Shiraz / Syrah',     'Mid-range', 1, '$16–$30/btl',  false, null, '$18', '$25.20', true),
('wine', 'Grant Burge Benchmark Shiraz',      'Shiraz / Syrah',     'Mid-range', 1, '$16–$30/btl',  false, null, '$20', '$28.00', true),
('wine', 'Devil''s Corner Pinot Noir',        'Pinot Noir',         'Mid-range', 1, '$16–$30/btl',  false, null, '$22', '$30.80', true),
('wine', 'Shaw + Smith Sauvignon Blanc',      'Sauvignon Blanc',    'Mid-range', 1, '$16–$30/btl',  false, null, '$25', '$35.00', true),

-- ── WINE — PREMIUM ────────────────────────────────────────────
('wine', 'Wynns Black Label Cabernet',        'Cabernet Sauvignon', 'Premium',   2, '$31–$45/btl',  false, null, '$35', '$49.00', true),
('wine', 'Kay Brothers Basket Press Shiraz',  'Shiraz / Syrah',     'Premium',   2, '$31–$45/btl',  false, null, '$35', '$49.00', true),
('wine', 'Torbreck Woodcutters Shiraz',       'Shiraz / Syrah',     'Premium',   2, '$31–$45/btl',  false, null, '$38', '$53.20', true),
('wine', 'Vasse Felix Chardonnay',            'Chardonnay',         'Premium',   2, '$31–$45/btl',  false, null, '$35', '$49.00', true),
('wine', 'Giant Steps Pinot Noir',            'Pinot Noir',         'Premium',   2, '$31–$45/btl',  false, null, '$38', '$53.20', true),

-- ── SPARKLING ────────────────────────────────────────────────
('sparkling', 'Yellowglen Yellow',            'Australian Sparkling','Budget',   0, '$14–$20/btl',  false, null, '$10', '$14.00', true),
('sparkling', 'Brown Brothers Prosecco',      'Prosecco',           'Mid-range', 1, '$21–$35/btl',  false, null, '$18', '$25.20', true),
('sparkling', 'Chandon Brut',                 'Australian Sparkling','Mid-range',1, '$21–$35/btl',  false, null, '$28', '$39.20', true),
('sparkling', 'Jansz Tasmania Cuvée',         'Australian Sparkling','Premium',  2, '$36–$55/btl',  false, null, '$35', '$49.00', true),

-- ── CIDER ─────────────────────────────────────────────────────
('cider', 'Somersby Apple Cider',             'Apple',              'Standard',  1, '$4–$5',        false, null, '$8/btl', '$11.20/btl', true),
('cider', 'Strongbow Apple Cider',            'Apple',              'Standard',  1, '$4–$5',        false, null, '$8/btl', '$11.20/btl', true),

-- ── SPIRITS — BUDGET ─────────────────────────────────────────
('spirits', 'Gordon''s Gin 700ml',            'Gin',                'Budget',    0, 'Up to $65/btl',false, null, '$45', '$63.00', true),

-- ── SPIRITS — MID ────────────────────────────────────────────
('spirits', 'Hendrick''s Gin 700ml',          'Gin',                'Premium',   2, '$81–$105/btl', false, null, '$70', '$98.00', true),
('spirits', 'Grey Goose Vodka 700ml',         'Vodka',              'Premium',   2, '$81–$105/btl', false, null, '$75', '$105.00', true),

-- ── LIQUEUR ──────────────────────────────────────────────────
('liqueur', 'Kahlúa 700ml',                   'Coffee Liqueur',     'Mid-range', 1, '$31–$65/btl',  false, null, '$45', '$63.00', true),
('liqueur', 'Cointreau 700ml',                'Orange Liqueur',     'Premium',   2, '$66–$80/btl',  false, null, '$55', '$77.00', true),
('liqueur', 'Chambord 500ml',                 'Other',              'Premium',   2, '$66–$80/btl',  false, null, '$55', '$77.00', true),

-- ── FORTIFIED ────────────────────────────────────────────────
('liqueur', 'Penfolds Club Tawny',            'Port',               'Budget',    0, 'Up to $30/btl',false, null, '$18', '$25.20', true),
('liqueur', 'Morris Classic Muscat',          'Muscat',             'Mid-range', 1, '$31–$65/btl',  false, null, '$30', '$42.00', true),

-- ── CURRENT STOCK — carried over from existing price list ─────
('beer', 'ASAHI Super Dry 3.5',               'Lager',          'Value',    0, '$3–$4',  true, '$3.50',  null, null, true),
('beer', 'Corona',                            'Lager',          'Standard', 1, '$4–$5',  true, '$4.00',  null, null, true),
('beer', 'Great Northern Original',           'Lager',          'Value',    0, '$3–$4',  true, '$3.00–$3.50', null, null, true),
('beer', 'Great Northern SuperCrisp',         'Lager',          'Value',    0, '$3–$4',  true, '$3.00',  null, null, true),
('beer', 'Guinness',                          'Stout / Porter', 'Premium',  2, '$5–$6',  true, '$6.00',  null, null, true),
('beer', 'Heineken',                          'Lager',          'Value',    0, '$3–$4',  true, '$3.50',  null, null, true),
('beer', 'James Squire 150 Lashes',           'Pale Ale',       'Value',    0, '$3–$4',  true, '$3.50',  null, null, true),
('beer', 'James Squire Ginger Beer',          'Other',          'Premium',  2, '$5–$6',  true, '$5.50',  null, null, true),
('beer', 'Kilkenny',                          'Other',          'Premium',  2, '$5–$6',  true, '$6.00',  null, null, true),
('beer', 'Oettinger 500ml',                   'Lager',          'Standard', 1, '$4–$5',  true, '$4.00',  null, null, true),
('beer', 'Peroni',                            'Lager',          'Value',    0, '$3–$4',  true, '$3.50',  null, null, true),
('beer', 'XXXX Gold',                         'Lager',          'Value',    0, '$3–$4',  true, '$3.00',  null, null, true),
('cider', 'Somersby Apple Cider',             'Apple',          'Value',    0, '$3–$4',  true, '$3.50',  '$8/btl', '$11.20/btl', true),
('premix', 'Canadian Club & Dry',             'Bourbon & Cola', 'Standard', 1, '$6–$7',  true, '$6.00',  null, null, true),
('wine', 'Adelaide Hills Pinot Gris',         'Pinot Gris',     'Budget',   0, '$9–$15/btl',  true, '$15.00/btl', null, null, true),
('wine', 'Balliamo Pinot Grigio',             'Pinot Gris',     'Budget',   0, '$9–$15/btl',  true, '$14.00/btl', null, null, true),
('wine', 'Rosemount Chardonnay',              'Chardonnay',     'Budget',   0, '$9–$15/btl',  true, '$17.00/btl', null, null, true),
('wine', 'Stoneleigh Sauvignon Blanc',        'Sauvignon Blanc','Mid-range',1, '$16–$30/btl', true, '$19.00/btl', null, null, true),
('wine', 'Yellow Tail Chardonnay',            'Chardonnay',     'Budget',   0, '$9–$15/btl',  true, '$12.00/btl', null, null, true),
('wine', 'Curtis Legion Cabernet Sauvignon',  'Cabernet Sauvignon','Budget',0, '$9–$15/btl',  true, '$15.00/btl', null, null, true),
('wine', 'Curtis Legion Shiraz',              'Shiraz / Syrah', 'Budget',   0, '$9–$15/btl',  true, '$15.00/btl', null, null, true),
('wine', 'Pepperjack Cabernet Sauvignon',     'Cabernet Sauvignon','Mid-range',1,'$16–$30/btl',true,'$24.00/btl','$20','$28.00',true),
('wine', 'Pepperjack Shiraz',                 'Shiraz / Syrah', 'Mid-range',1, '$16–$30/btl', true, '$24.00/btl','$20','$28.00',true),
('wine', 'Tread Softly Pinot Noir',           'Pinot Noir',     'Mid-range',1, '$16–$30/btl', true, '$19.50/btl', null, null, true),
('wine', 'Wyndham 555 Shiraz',                'Shiraz / Syrah', 'Budget',   0, '$9–$15/btl',  true, '$15.00/btl', null, null, true),
('wine', 'Yellow Tail Merlot',                'Merlot',         'Budget',   0, '$9–$15/btl',  true, '$12.00/btl', null, null, true),
('wine', 'Arrogant Frog French Rosé',         'Rosé',           'Mid-range',1, '$16–$30/btl', true, '$19.00/btl', null, null, true),
('sparkling', 'Balliamo Prosecco',            'Prosecco',       'Mid-range',1, '$21–$35/btl', true, '$21.00/btl', null, null, true),
('sparkling', 'Henkell Dry-Sec Piccolo 200mL','Australian Sparkling','Budget',0,'$14–$20/btl',true,'$7.00/piccolo',null,null,true),
('sparkling', 'Jacob''s Creek Trilogy Cuvée Brut','Australian Sparkling','Budget',0,'$14–$20/btl',true,'$18.00/btl',null,null,true),
('sparkling', 'Tempus Two Varietal Prosecco', 'Prosecco',       'Budget',   0, '$14–$20/btl', true, '$17.00/btl', null, null, true),
('liqueur', 'Baileys Irish Cream',            'Irish Cream (e.g. Baileys)','Mid-range',1,'$31–$65/btl',true,'$5.00/60ml nip','$45','$63.00',true),
('liqueur', 'Galway Pipe Port',               'Port',           'Budget',   0, 'Up to $30/btl',true,'$2.00/60ml nip',null,null,true),
('liqueur', 'Penfolds Club Port',             'Port',           'Budget',   0, 'Up to $30/btl',true,'$3.00/60ml nip',null,null,true),
('spirits', 'Bombay Sapphire Gin',            'Gin',            'Mid-range',1, '$66–$80/btl', true, '$3.50/30ml nip',null,null,true),
('spirits', 'Bundaberg Rum',                  'Rum',            'Budget',   0, 'Up to $65/btl',true,'$3.00/30ml nip','$48','$67.20',true),
('spirits', 'Canadian Club Whisky',           'Whisky / Bourbon','Budget',  0, 'Up to $65/btl',true,'$3.00/30ml nip','$50','$70.00',true),
('spirits', 'Chatelle Napoleon Brandy',       'Brandy / Cognac','Budget',   0, 'Up to $65/btl',true,'$4.00/30ml nip',null,null,true),
('spirits', 'Glenlivet Whisky',               'Whisky / Bourbon','Premium', 2, '$81–$105/btl',true,'$4.00/30ml nip',null,null,true),
('spirits', 'Jameson Irish Whiskey',          'Whisky / Bourbon','Mid-range',1,'$66–$80/btl', true,'$3.00/30ml nip',null,null,true),
('spirits', 'Jim Beam Bourbon',               'Whisky / Bourbon','Budget',  0, 'Up to $65/btl',true,'$3.00/30ml nip',null,null,true),
('spirits', 'Smirnoff Vodka',                 'Vodka',          'Budget',   0, 'Up to $65/btl',true,'$3.00/30ml nip','$45','$63.00',true),
('zerobeer',  'Guinness ZERO',                'Stout Style',    'Standard', 1, '$4–$5',        true, '$4.50',  null, null, true),
('zerowine',  'Minchinbury Shiraz Zero',       'Red',            'Budget',   0, '$9–$18/btl',   true, '$14.00/btl',null,null,true),
('zerobeer',  'Great Northern Zero',           'Lager',          'Value',    0, '$3–$4',        false, null, null, null, true),
('zerobeer',  'Heineken 0.0',                  'Lager',          'Standard', 1, '$4–$5',        false, null, null, null, true),
('zerospirits','Seedlip Spice 94',             'Botanical / Aperitif','Mid-range',1,'$31–$50/btl',false,null,null,null,true),
('zerospirits','Lyre''s American Malt',        'Whisky Alternative','Mid-range',1,'$31–$50/btl', false,null,null,null,true),
('zerowine',   'Giesen 0% Sauvignon Blanc',    'White',          'Mid-range',1, '$19–$28/btl',  false,null,null,null,true);
