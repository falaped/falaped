-- Seed: 5 pacientes para o profile_id 9eca2e99-c2f0-4717-bc20-d622f396013e
-- Requer que o perfil tenha telefone em authenticated_users ou profiles (user_phone do médico).

INSERT INTO patients (
  user_phone,
  name,
  birth_date,
  responsible,
  contact_phone,
  sex,
  legal_guardian,
  blood_type,
  weight,
  height,
  head_circumference,
  allergies,
  current_medications,
  medical_history
)
SELECT
  COALESCE(
    (SELECT au.phone FROM authenticated_users au WHERE au.profile_id = '9eca2e99-c2f0-4717-bc20-d622f396013e' LIMIT 1),
    (SELECT p.phone FROM profiles p WHERE p.id = '9eca2e99-c2f0-4717-bc20-d622f396013e' LIMIT 1)
  ),
  v.name,
  v.birth_date::date,
  v.responsible,
  v.contact_phone,
  v.sex,
  v.legal_guardian,
  v.blood_type,
  v.weight,
  v.height,
  v.head_circumference,
  v.allergies,
  v.current_medications,
  v.medical_history
FROM (VALUES
  (
    'Ana Silva',
    '2020-01-15',
    'Maria Silva',
    '31999887766',
    'F',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    NULL
  ),
  (
    'Bruno Costa',
    '2019-05-22',
    'João Costa',
    '31988776655',
    'M',
    NULL,
    'O+',
    '18',
    '95',
    NULL,
    'Penicilina',
    NULL,
    NULL
  ),
  (
    'Clara Santos',
    '2021-03-10',
    'Fernanda Santos',
    '31977665544',
    'F',
    NULL,
    NULL,
    '12',
    '82',
    '45',
    NULL,
    'Paracetamol (uso eventual)',
    NULL
  ),
  (
    'Diego Oliveira',
    '2018-11-08',
    'Roberto Oliveira',
    '31966554433',
    'M',
    NULL,
    'A+',
    '22',
    '108',
    NULL,
    NULL,
    NULL,
    'Asma leve em acompanhamento'
  ),
  (
    'Elena Ferreira',
    '2022-07-30',
    'Patricia Ferreira',
    '31955443322',
    'F',
    NULL,
    NULL,
    '10',
    '78',
    NULL,
    'Dipirona',
    NULL,
    NULL
  )
) AS v (
  name,
  birth_date,
  responsible,
  contact_phone,
  sex,
  legal_guardian,
  blood_type,
  weight,
  height,
  head_circumference,
  allergies,
  current_medications,
  medical_history
)
WHERE COALESCE(
  (SELECT au.phone FROM authenticated_users au WHERE au.profile_id = '9eca2e99-c2f0-4717-bc20-d622f396013e' LIMIT 1),
  (SELECT p.phone FROM profiles p WHERE p.id = '9eca2e99-c2f0-4717-bc20-d622f396013e' LIMIT 1)
) IS NOT NULL;
