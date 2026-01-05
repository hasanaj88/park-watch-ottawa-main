-- Auto-generated from src/data/parking-lots.ts (EXTENDED_PARKING_LOTS)
-- Inserts into parking_lots only if a row with same name (case-insensitive) doesn't already exist.
-- Columns: name, capacity, available, status, lat, lng

insert into parking_lots (name, capacity, available, status, lat, lng)
select v.name, v.capacity, v.available, v.status, v.lat, v.lng
from (
  values
  ('ByWard Market Garage', 245, 47, 'busy', 45.4284, -75.6918),
  ('Dalhousie Lot', 120, 48, 'open', 45.4251, -75.6897),
  ('Glebe Parking Structure', 300, 16, 'busy', 45.4009, -75.689),
  ('Centretown Surface Lot', 80, 44, 'open', 45.4175, -75.6972),
  ('Ottawa City Hall Parking', 180, 35, 'busy', 45.4215, -75.6972),
  ('Rideau Centre Parking', 450, 72, 'busy', 45.4258, -75.6918),
  ('Lansdowne Park Parking', 200, 45, 'busy', 45.3948, -75.6821),
  ('Sparks Street Parking Garage', 320, 75, 'busy', 45.4214, -75.6981),
  ('Elgin Street Parking', 95, 53, 'open', 45.4151, -75.6925),
  ('Bank Street Central Lot', 140, 42, 'open', 45.4098, -75.6889),
  ('Carleton University Visitor Parking', 150, 61, 'open', 45.3875, -75.6972),
  ('University of Ottawa Parking', 280, 85, 'open', 45.4217, -75.6832),
  ('Algonquin College Woodroffe Parking', 350, 149, 'open', 45.3489, -75.7536),
  ('Parliament Hill Visitor Parking', 100, 8, 'busy', 45.4236, -75.7005),
  ('National Gallery Parking', 85, 54, 'open', 45.4289, -75.6998),
  ('Canadian War Museum Parking', 120, 53, 'open', 45.4167, -75.7178),
  ('Bayshore Shopping Centre', 800, 344, 'open', 45.3567, -75.7989),
  ('St. Laurent Shopping Centre', 650, 263, 'open', 45.4189, -75.6234),
  ('Place d''Orléans Shopping Centre', 750, 452, 'open', 45.4656, -75.5234),
  ('Ottawa Hospital General Campus', 420, 64, 'busy', 45.3834, -75.6478),
  ('Ottawa Hospital Civic Campus', 380, 82, 'busy', 45.3967, -75.7234),
  ('Queensway Carleton Hospital', 200, 66, 'open', 45.3289, -75.7734),
  ('Tunney''s Pasture Station P&R', 450, 172, 'open', 45.4012, -75.7345),
  ('Blair Station Park & Ride', 600, 366, 'open', 45.4567, -75.5689),
  ('Westboro Beach Parking', 75, 52, 'open', 45.3689, -75.7642),
  ('Mooney''s Bay Beach Parking', 120, 75, 'open', 45.3612, -75.6834),
  ('Britannia Beach Parking', 180, 113, 'open', 45.3567, -75.7889),
  ('Little Italy Preston Street', 65, 31, 'open', 45.3989, -75.7012),
  ('Chinatown Somerset Parking', 55, 14, 'busy', 45.4156, -75.7098),
  ('Hintonburg Wellington West', 85, 33, 'open', 45.4012, -75.7234),
  ('Kanata Technology Park', 300, 122, 'open', 45.3234, -75.8967),
  ('South Keys Shopping Centre', 420, 222, 'open', 45.3678, -75.6512)
) as v(name, capacity, available, status, lat, lng)
where not exists (
  select 1 from parking_lots p
  where lower(p.name) = lower(v.name)
);

-- You can verify:
-- select count(*) from parking_lots;
-- select name, capacity, available, status from parking_lots order by name;
