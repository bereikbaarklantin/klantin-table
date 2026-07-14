-- =============================================================================
-- Hapas Noordwijk -- Seed Data
-- Safe to re-run: every INSERT uses ON CONFLICT DO NOTHING.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- CATEGORIES
-- ---------------------------------------------------------------------------
INSERT INTO categories (id, name, emoji, is_food, counts_toward_minimum, sort) VALUES
  ('koud',      'Koude tapas',    '🥗', true,  true,  1),
  ('warm',      'Warme tapas',    '🍳', true,  true,  2),
  ('vlees',     'Vlees',          '🥩', true,  true,  3),
  ('vis',       'Vis',            '🐟', true,  true,  4),
  ('vega',      'Vegetarisch',    '🥦', true,  true,  5),
  ('dessert',   'Desserts',       '🍮', true,  false, 6),
  ('fris',      'Frisdrank',      '🥤', false, false, 7),
  ('bier',      'Bier',           '🍺', false, false, 8),
  ('wijn',      'Wijn',           '🍷', false, false, 9),
  ('cocktail',  'Cocktails',      '🍹', false, false, 10),
  ('warmdrank', 'Koffie & thee',  '☕', false, false, 11)
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- PRODUCTS
-- ---------------------------------------------------------------------------

-- Koude tapas
INSERT INTO products (id, category_id, name, description, price_cents, allergens, emoji) VALUES
  ('pan-tomate',   'koud', 'Pan con tomate',       'Geroosterd brood tomaat knoflook en olijfolie.', 450,  ARRAY['gluten'],        '🍞'),
  ('jamon',        'koud', 'Jamón serrano',         '24 maanden gerijpte serranoham.',                750,  ARRAY[]::text[],        '🍖'),
  ('manchego',     'koud', 'Manchego',              'Schapenkaas met vijgenchutney.',                 650,  ARRAY['melk'],          '🧀'),
  ('olijven',      'koud', 'Gemarineerde olijven',  'Groene en zwarte olijven citroen en tijm.',      350,  ARRAY[]::text[],        '🫒'),
  ('gazpacho',     'koud', 'Gazpacho',              'Koude tomatensoep met komkommer.',               500,  ARRAY['selderij'],      '🍅'),
  ('ensaladilla',  'koud', 'Ensaladilla rusa',      'Aardappelsalade met tonijn en ei.',              550,  ARRAY['ei','vis'],      '🥔')
ON CONFLICT DO NOTHING;

-- Warme tapas
INSERT INTO products (id, category_id, name, description, price_cents, allergens, emoji) VALUES
  ('gambas',      'warm', 'Gambas al ajillo',       'Garnalen in knoflookolie met peper.',            850,  ARRAY['schaaldieren'],      '🍤'),
  ('patatas',     'warm', 'Patatas bravas',          'Krokante aardappel bravas-saus en aioli.',       500,  ARRAY['ei'],                '🥔'),
  ('croquetas',   'warm', 'Croquetas de jamón',      'Hamkroketjes (4 st.).',                          600,  ARRAY['gluten','melk'],     '🥐'),
  ('tortilla',    'warm', 'Tortilla española',       'Spaanse omelet met aardappel en ui.',            550,  ARRAY['ei'],                '🍳'),
  ('champinones', 'warm', 'Champiñones al ajillo',   'Champignons in knoflook en sherry.',             550,  ARRAY['sulfiet'],           '🍄'),
  ('pimientos',   'warm', 'Pimientos de padrón',     'Gebakken groene pepertjes met zeezout.',          550,  ARRAY[]::text[],            '🌶️')
ON CONFLICT DO NOTHING;

-- Vlees
INSERT INTO products (id, category_id, name, description, price_cents, allergens, emoji) VALUES
  ('albondigas', 'vlees', 'Albóndigas',             'Gehaktballetjes in tomatensaus.',                650,  ARRAY['gluten','ei'],   '🍝'),
  ('chorizo',    'vlees', 'Chorizo a la sidra',     'Chorizo gebakken in cider.',                     650,  ARRAY['sulfiet'],       '🌭'),
  ('pinchos',    'vlees', 'Pinchos morunos',        'Gemarineerde kipspiesjes (2 st.).',              650,  ARRAY[]::text[],        '🍢'),
  ('secreto',    'vlees', 'Secreto ibérico',        'Gegrild Iberico-varken gerookte paprika.',       950,  ARRAY[]::text[],        '🥩')
ON CONFLICT DO NOTHING;

-- Vis
INSERT INTO products (id, category_id, name, description, price_cents, allergens, emoji) VALUES
  ('calamares',  'vis', 'Calamares',              'Krokante inktvisringen met aioli.',              750,  ARRAY['gluten','weekdieren','ei'], '🦑'),
  ('boquerones', 'vis', 'Boquerones',             'Ingelegde ansjovis met citroen.',                600,  ARRAY['vis'],                      '🐟'),
  ('pulpo',      'vis', 'Pulpo a la gallega',     'Octopus aardappel en paprikapoeder.',            1050, ARRAY['weekdieren'],               '🐙'),
  ('zalm',       'vis', 'Zalm tataki',            'Kort geschroeide zalm sesam en soja.',           850,  ARRAY['vis','sesam','soja'],       '🍣')
ON CONFLICT DO NOTHING;

-- Vegetarisch
INSERT INTO products (id, category_id, name, description, price_cents, allergens, emoji) VALUES
  ('berenjenas',  'vega', 'Berenjenas con miel',        'Krokante aubergine met honing.',              600,  ARRAY['gluten'],       '🍆'),
  ('espinacas',   'vega', 'Espinacas con garbanzos',    'Spinazie met kikkererwten en komijn.',         550,  ARRAY[]::text[],       '🥬'),
  ('queso-cabra', 'vega', 'Geitenkaas uit de oven',     'Met honing en walnoten.',                     650,  ARRAY['melk','noten'], '🧀'),
  ('verduras',    'vega', 'Verduras a la plancha',       'Gegrilde seizoensgroenten met romesco.',      600,  ARRAY['noten'],        '🥦')
ON CONFLICT DO NOTHING;

-- Desserts
INSERT INTO products (id, category_id, name, description, price_cents, allergens, emoji) VALUES
  ('churros', 'dessert', 'Churros',             'Met warme chocoladesaus.',       550, ARRAY['gluten','melk'], '🥨'),
  ('crema',   'dessert', 'Crema catalana',      'Met gebrande suikerlaag.',       550, ARRAY['ei','melk'],     '🍮'),
  ('helado',  'dessert', 'Helado',              'Twee bollen ijs naar keuze.',    450, ARRAY['melk'],          '🍨'),
  ('tarta',   'dessert', 'Tarta de Santiago',   'Amandeltaart met citroen.',      550, ARRAY['noten','ei'],    '🍰')
ON CONFLICT DO NOTHING;

-- Frisdrank
INSERT INTO products (id, category_id, name, description, price_cents, allergens, emoji) VALUES
  ('cola',      'fris', 'Cola / Cola zero',     'Fles 200 ml.',    290, ARRAY[]::text[], '🥤'),
  ('sinas',     'fris', 'Sinas',                'Fles 200 ml.',    290, ARRAY[]::text[], '🍊'),
  ('spa',       'fris', 'Spa blauw / rood',     'Fles 500 ml.',    320, ARRAY[]::text[], '💧'),
  ('icetea',    'fris', 'Ice tea',              'Sparkling of green.', 310, ARRAY[]::text[], '🍋'),
  ('verse-jus', 'fris', 'Verse jus d''orange',  'Vers geperst.',   420, ARRAY[]::text[], '🍊')
ON CONFLICT DO NOTHING;

-- Bier
INSERT INTO products (id, category_id, name, description, price_cents, allergens, emoji) VALUES
  ('estrella',       'bier', 'Estrella Galicia',              'Tap 25 cl.',                                340, ARRAY['gluten'], '🍺'),
  ('estrella-groot', 'bier', 'Estrella Galicia groot',        'Tap 45 cl.',                                590, ARRAY['gluten'], '🍺'),
  ('speciaal',       'bier', 'Speciaalbier van de maand',     'Vraag de bediening of kijk op het bord.',   550, ARRAY['gluten'], '🍻'),
  ('alcvrij',        'bier', 'Alcoholvrij bier',              'Fles 30 cl.',                               340, ARRAY['gluten'], '🚫')
ON CONFLICT DO NOTHING;

-- Wijn
INSERT INTO products (id, category_id, name, description, price_cents, allergens, emoji) VALUES
  ('rioja',      'wijn', 'Rioja crianza',       'Glas rode huiswijn.',  500,  ARRAY['sulfiet'], '🍷'),
  ('verdejo',    'wijn', 'Verdejo',             'Glas witte huiswijn.', 500,  ARRAY['sulfiet'], '🥂'),
  ('cava',       'wijn', 'Cava brut',           'Glas.',                550,  ARRAY['sulfiet'], '🍾'),
  ('fles-rioja', 'wijn', 'Fles Rioja crianza',  '0.75 l.',             2750, ARRAY['sulfiet'], '🍷')
ON CONFLICT DO NOTHING;

-- Cocktails
INSERT INTO products (id, category_id, name, description, price_cents, allergens, emoji) VALUES
  ('sangria',     'cocktail', 'Sangría',          'Huisgemaakt glas.',                       650,  ARRAY['sulfiet'], '🍹'),
  ('sangria-kan', 'cocktail', 'Kan sangría',      '1 liter voor 4 glazen.',                  1950, ARRAY['sulfiet'], '🫗'),
  ('aperol',      'cocktail', 'Aperol spritz',    'Aperol prosecco bruiswater.',              850,  ARRAY['sulfiet'], '🍹'),
  ('gintonic',    'cocktail', 'Gin-tonic',        'Spaanse serveerstijl met botanicals.',     950,  ARRAY[]::text[],  '🍸'),
  ('mocktail',    'cocktail', 'Virgin sangría',   'Alcoholvrij glas.',                        500,  ARRAY[]::text[],  '🧃')
ON CONFLICT DO NOTHING;

-- Koffie & thee
INSERT INTO products (id, category_id, name, description, price_cents, allergens, emoji) VALUES
  ('espresso',    'warmdrank', 'Espresso',          NULL,                                280, ARRAY[]::text[],  '☕'),
  ('cappuccino',  'warmdrank', 'Cappuccino',        NULL,                                340, ARRAY['melk'],    '☕'),
  ('cafe-bombon', 'warmdrank', 'Café bombón',       'Espresso met gecondenseerde melk.',  360, ARRAY['melk'],    '☕'),
  ('thee',        'warmdrank', 'Verse muntthee',    'Met honing.',                       340, ARRAY[]::text[],  '🌿')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------
-- SETTINGS
-- ---------------------------------------------------------------------------
INSERT INTO settings (id, round_interval_min, min_dishes_per_person_round1, drinks_bypass_timer, review_threshold, review_mode, google_review_url, staff_pin, restaurant_name) VALUES
  ('default', 10, 2, true, 4, 'compliant', 'https://search.google.com/local/writereview?placeid=VUL_PLACE_ID_IN', '1234', 'Hapas Noordwijk')
ON CONFLICT DO NOTHING;
