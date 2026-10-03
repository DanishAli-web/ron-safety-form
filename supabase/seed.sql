-- Site Safety Forms: seed data
-- Before running, create these users in Supabase Dashboard >
-- Authentication > Users > Add user (tick "Auto Confirm User"):
--   admin@example.com, alex.ferguson@example.com, lionel.messi@example.com,
--   cristiano.ronaldo@example.com, alphonso.davies@example.com
insert into sites (name, address) values
  ('Cedar Grove Townhomes', '1200 Cedar Grove Rd'),
  ('Harbour View Duplexes', '45 Harbour View Dr'),
  ('Northgate Apartments',  '880 Northgate Ave');

insert into profiles (id, full_name, role)
select u.id, v.full_name, v.role
from auth.users u
join (values
  ('alex.ferguson@example.com',      'Alex Ferguson',      'framer'),
  ('lionel.messi@example.com',       'Lionel Messi',       'framer'),
  ('cristiano.ronaldo@example.com',  'Cristiano Ronaldo',  'framer'),
  ('alphonso.davies@example.com',    'Alphonso Davies',    'framer'),
  ('admin@example.com', 'Admin', 'admin')
) as v (email, full_name, role) on u.email = v.email;

insert into submissions (
  user_id, site_id, work_date,
  hard_hat, hi_vis_vest, safety_boots, eye_protection,
  fall_protection, ladders_scaffolding_inspected, tools_cords_ok, hazards_identified,
  notes, status
)
select
  p.id, s.id, v.work_date,
  v.ppe, v.ppe, v.ppe, v.ppe,
  v.fall_protection, true, true, true,
  v.notes, v.status
from (values
 ('Lionel Messi',       'Cedar Grove Townhomes', current_date,      true,  true,  'Decking wet this morning, extra care near edges.',     'submitted'),
  ('Cristiano Ronaldo',  'Harbour View Duplexes', current_date,      true,  true,  null,                                                   'submitted'),

  ('Lionel Messi',       'Cedar Grove Townhomes', current_date - 1,  true,  true,  null,                                                   'submitted'),
  ('Cristiano Ronaldo',  'Harbour View Duplexes', current_date - 1,  true,  false, 'Guardrail missing on east side, reported to super.',   'submitted'),
  ('Alphonso Davies',    'Northgate Apartments',  current_date - 1,  true,  true,  null,                                                   'submitted'),
  ('Alex Ferguson', 'Cedar Grove Townhomes', current_date - 1,  false, true,  'Forgot safety glasses, borrowed a pair from the trailer.', 'submitted'),

  ('Lionel Messi',       'Cedar Grove Townhomes', current_date - 2,  true,  true,  null,                                                   'reviewed'),
  ('Alphonso Davies',    'Northgate Apartments',  current_date - 2,  true,  true,  'Replaced a damaged extension cord.',                   'reviewed'),
  ('Alex Ferguson', 'Cedar Grove Townhomes', current_date - 2,  true,  true,  null,                                                   'reviewed'),

  ('Lionel Messi',       'Cedar Grove Townhomes', current_date - 3,  true,  true,  null,                                                   'reviewed'),
  ('Cristiano Ronaldo',  'Harbour View Duplexes', current_date - 3,  true,  true,  'High winds in the afternoon, paused roof work.',       'reviewed'),
  ('Alphonso Davies',    'Northgate Apartments',  current_date - 3,  true,  true,  null,                                                   'reviewed')
) as v (worker, site, work_date, ppe, fall_protection, notes, status)
join profiles p on p.full_name = v.worker
join sites s on s.name = v.site;