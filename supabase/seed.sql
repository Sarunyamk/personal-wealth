insert into public.categories (user_id, entity_type, key, label, sort_order)
values
  (null, 'asset', 'cash', 'เงินสดและเงินฝาก', 10),
  (null, 'asset', 'investment', 'การลงทุน', 20),
  (null, 'asset', 'property', 'อสังหาริมทรัพย์', 30),
  (null, 'asset', 'vehicle', 'ยานพาหนะ', 40),
  (null, 'asset', 'other', 'สินทรัพย์อื่น', 90),
  (null, 'liability', 'home-loan', 'สินเชื่อบ้าน', 10),
  (null, 'liability', 'vehicle-loan', 'สินเชื่อรถ', 20),
  (null, 'liability', 'credit-card', 'บัตรเครดิต', 30),
  (null, 'liability', 'personal-loan', 'สินเชื่อส่วนบุคคล', 40),
  (null, 'liability', 'other', 'หนี้สินอื่น', 90),
  (null, 'income', 'salary', 'เงินเดือน', 10),
  (null, 'income', 'bonus', 'โบนัส', 20),
  (null, 'income', 'other', 'รายรับอื่น', 90),
  (null, 'expense', 'housing', 'ที่อยู่อาศัย', 10),
  (null, 'expense', 'food', 'อาหาร', 20),
  (null, 'expense', 'utilities', 'สาธารณูปโภค', 30),
  (null, 'expense', 'insurance', 'ประกัน', 40),
  (null, 'expense', 'family', 'ครอบครัว', 50),
  (null, 'expense', 'lottery', 'สลากกินแบ่ง', 60),
  (null, 'expense', 'other', 'รายจ่ายอื่น', 90),
  (null, 'transfer', 'provident-fund', 'กองทุนสำรองเลี้ยงชีพ', 10),
  (null, 'transfer', 'etf', 'ETF', 20),
  (null, 'transfer', 'gold', 'ทองคำ', 30),
  (null, 'transfer', 'crypto', 'คริปโท', 40),
  (null, 'transfer', 'family-savings', 'เงินออมครอบครัว', 50),
  (null, 'transfer', 'dental-fund', 'กองทุนทันตกรรม', 60),
  (null, 'transfer', 'travel-fund', 'กองทุนท่องเที่ยว', 70)
on conflict (user_id, entity_type, key)
do update set
  label = excluded.label,
  sort_order = excluded.sort_order,
  is_active = true;
