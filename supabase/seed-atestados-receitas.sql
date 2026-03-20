-- Seed: 10 atestados (medical_certificates) + 10 receitas (prescriptions)
--
-- Antes de rodar, ajuste v_profile para um profiles.id válido do seu ambiente.
-- Exemplo usado no seed.sql principal deste repo:
--   9eca2e99-c2f0-4717-bc20-d622f396013e
--
-- Opcional: associe patient_id a um paciente existente do mesmo perfil:
--   SELECT id FROM patients WHERE profile_id = '<seu_profile_id>' LIMIT 1;

DO $$
DECLARE
  v_profile uuid := '9eca2e99-c2f0-4717-bc20-d622f396013e'::uuid;
BEGIN
  INSERT INTO medical_certificates (
    profile_id,
    type,
    patient_id,
    case_id,
    payload,
    location_state,
    issued_at,
    pdf_storage_path
  )
  VALUES
    (
      v_profile,
      'comparecimento',
      NULL,
      NULL,
      '{"patientName":"Ana Beatriz Oliveira","birthDate":"2019-06-01","attendanceDate":"2026-03-01","timeStart":"08:30","timeEnd":"09:15","periodo":"matutino","observations":"Compareceu acompanhada da responsável."}'::jsonb,
      'MG',
      '2026-03-01',
      NULL
    ),
    (
      v_profile,
      'aptidao_fisica',
      NULL,
      NULL,
      '{"patientName":"Bruno Costa Lima","birthDate":"2018-11-20","activities":"Natação recreativa e educação física escolar","validity":"6 meses","observations":"Sem restrições adicionais."}'::jsonb,
      'MG',
      '2026-03-02',
      NULL
    ),
    (
      v_profile,
      'medico',
      NULL,
      NULL,
      '{"patientName":"Clara Santos","birthDate":"2021-03-10","daysAway":3,"startDate":"2026-03-05","cid10":"J00","canLeaveHome":false,"observations":"Repouso relativo."}'::jsonb,
      'MG',
      '2026-03-05',
      NULL
    ),
    (
      v_profile,
      'acompanhante',
      NULL,
      NULL,
      '{"companionName":"Fernanda Santos","patientName":"Clara Santos","consultationDate":"2026-03-06","timeStart":"14:00","timeEnd":"15:00","periodo":"vespertino","observations":""}'::jsonb,
      'MG',
      '2026-03-06',
      NULL
    ),
    (
      v_profile,
      'comparecimento',
      NULL,
      NULL,
      '{"patientName":"Daniel Ferreira","birthDate":"2017-02-14","attendanceDate":"2026-03-07","timeStart":"","timeEnd":"","periodo":"atual_data","observations":"Consulta de rotina."}'::jsonb,
      'SP',
      '2026-03-07',
      NULL
    ),
    (
      v_profile,
      'aptidao_fisica',
      NULL,
      NULL,
      '{"patientName":"Elena Martins","birthDate":"2016-09-30","activities":"Futebol infantil","validity":"12 meses","observations":""}'::jsonb,
      'SP',
      '2026-03-08',
      NULL
    ),
    (
      v_profile,
      'medico',
      NULL,
      NULL,
      '{"patientName":"Felipe Rocha","birthDate":"2015-04-22","daysAway":5,"startDate":"2026-03-09","cid10":"","canLeaveHome":true,"observations":"Liberado para atividades leves em domicílio."}'::jsonb,
      'SP',
      '2026-03-09',
      NULL
    ),
    (
      v_profile,
      'acompanhante',
      NULL,
      NULL,
      '{"companionName":"Paulo Rocha","patientName":"Felipe Rocha","consultationDate":"2026-03-09","timeStart":"10:00","timeEnd":"11:30","periodo":"matutino","observations":""}'::jsonb,
      'SP',
      '2026-03-09',
      NULL
    ),
    (
      v_profile,
      'comparecimento',
      NULL,
      NULL,
      '{"patientName":"Gabriela Nunes","birthDate":"2020-12-05","attendanceDate":"2026-03-12","timeStart":"16:00","timeEnd":"16:45","periodo":"vespertino","observations":""}'::jsonb,
      'RJ',
      '2026-03-12',
      NULL
    ),
    (
      v_profile,
      'aptidao_fisica',
      NULL,
      NULL,
      '{"patientName":"Henrique Dias","birthDate":"2014-07-18","activities":"Judô e corrida escolar","validity":"3 meses","observations":"Uso de protetor bucal recomendado."}'::jsonb,
      'RJ',
      '2026-03-14',
      NULL
    );

  INSERT INTO prescriptions (
    profile_id,
    patient_id,
    case_id,
    payload,
    location_state,
    issued_at,
    orientations,
    warning_signs,
    additional_notes,
    pdf_storage_path
  )
  VALUES
    (
      v_profile,
      NULL,
      NULL,
      '{"patientName":"Ana Beatriz Oliveira","birthDate":"2019-06-01","medications":[{"name":"Paracetamol 200 mg/mL gotas","dosage":"200 mg/mL","posology":"10 gotas de 6/6 h se febre ≥ 38 °C","duration":"3 dias","observations":"Máximo 4 doses em 24 h."}],"orientations":"Hidratação oral.","warningSigns":"Febre persistente ou letargia.","additionalNotes":""}'::jsonb,
      'MG',
      '2026-03-01',
      'Administrar com alimento se náusea.',
      'Febre acima de 38,5 °C por mais de 48 h.',
      NULL,
      NULL
    ),
    (
      v_profile,
      NULL,
      NULL,
      '{"patientName":"Bruno Costa Lima","birthDate":"2018-11-20","medications":[{"name":"Salina 0,9% spray nasal","posology":"2 jatos em cada narina de 8/8 h","duration":"7 dias","observations":""}],"orientations":"","warningSigns":"","additionalNotes":""}'::jsonb,
      'MG',
      '2026-03-02',
      NULL,
      NULL,
      NULL,
      NULL
    ),
    (
      v_profile,
      NULL,
      NULL,
      '{"patientName":"Clara Santos","birthDate":"2021-03-10","medications":[{"name":"Azitromicina suspensão","dosage":"200 mg/5 mL","posology":"10 mg/kg/dia em dose única por 3 dias","duration":"3 dias","observations":""},{"name":"Probiótico","posology":"1 sachê ao dia","duration":"10 dias","observations":""}],"orientations":"Suspender antibiótico se diarreira intensa.","warningSigns":"Desidratação.","additionalNotes":""}'::jsonb,
      'MG',
      '2026-03-04',
      NULL,
      NULL,
      NULL,
      NULL
    ),
    (
      v_profile,
      NULL,
      NULL,
      '{"patientName":"Daniel Ferreira","birthDate":"2017-02-14","medications":[{"name":"Loratadina xarope","dosage":"5 mg/5 mL","posology":"5 mL 1x ao dia","duration":"14 dias","observations":""}],"orientations":"","warningSigns":"","additionalNotes":""}'::jsonb,
      'SP',
      '2026-03-05',
      NULL,
      NULL,
      NULL,
      NULL
    ),
    (
      v_profile,
      NULL,
      NULL,
      '{"patientName":"Elena Martins","birthDate":"2016-09-30","medications":[{"name":"Fluticasona spray nasal","posology":"1 jato em cada narina 1x ao dia","duration":"30 dias","observations":"Manter uso contínuo."}],"orientations":"","warningSigns":"","additionalNotes":""}'::jsonb,
      'SP',
      '2026-03-06',
      NULL,
      NULL,
      NULL,
      NULL
    ),
    (
      v_profile,
      NULL,
      NULL,
      '{"patientName":"Felipe Rocha","birthDate":"2015-04-22","medications":[{"name":"Ibuprofeno 100 mg/mL suspensão","dosage":"100 mg/mL","posology":"10 mg/kg de 8/8 h se dor ou febre","duration":"5 dias","observations":"Não associar a outro anti-inflamatório."}],"orientations":"","warningSigns":"Dor abdominal intensa.","additionalNotes":""}'::jsonb,
      'SP',
      '2026-03-08',
      NULL,
      NULL,
      NULL,
      NULL
    ),
    (
      v_profile,
      NULL,
      NULL,
      '{"patientName":"Gabriela Nunes","birthDate":"2020-12-05","medications":[{"name":"Vitamina D3 gotas","posology":"400 UI (1 gota) ao dia","duration":"6 meses","observations":""}],"orientations":"Gotas direto na boca ou misturadas ao leite.","warningSigns":"","additionalNotes":""}'::jsonb,
      'RJ',
      '2026-03-10',
      NULL,
      NULL,
      NULL,
      NULL
    ),
    (
      v_profile,
      NULL,
      NULL,
      '{"patientName":"Henrique Dias","birthDate":"2014-07-18","medications":[{"name":"Omeprazol 20 mg","posology":"1 cápsula em jejum pela manhã","duration":"14 dias","observations":"Engolir inteira."}],"orientations":"","warningSigns":"","additionalNotes":""}'::jsonb,
      'RJ',
      '2026-03-11',
      NULL,
      NULL,
      NULL,
      NULL
    ),
    (
      v_profile,
      NULL,
      NULL,
      '{"patientName":"Isabela Prado","birthDate":"2019-01-25","medications":[{"name":"Amoxicilina suspensão","dosage":"250 mg/5 mL","posology":"50 mg/kg/dia dividido de 12/12 h","duration":"7 dias","observations":"Sacudir o frasco antes de usar."}],"orientations":"Completar o tratamento mesmo se melhorar.","warningSigns":"Reação alérgica (urticária, edema).","additionalNotes":""}'::jsonb,
      'RJ',
      '2026-03-12',
      NULL,
      NULL,
      NULL,
      NULL
    ),
    (
      v_profile,
      NULL,
      NULL,
      '{"patientName":"João Victor Almeida","birthDate":"2013-10-08","medications":[{"name":"Dexametasona elixir","dosage":"0,5 mg/mL","posology":"0,15 mg/kg/dose de 12/12 h","duration":"3 dias","observations":"Reduzir conforme evolução clínica."},{"name":"Soro fisiológico 0,9%","posology":"Lavagem nasal conforme necessidade","duration":"7 dias","observations":""}],"orientations":"","warningSigns":"Dificuldade respiratória.","additionalNotes":""}'::jsonb,
      'MG',
      '2026-03-15',
      NULL,
      NULL,
      NULL,
      NULL
    );
END $$;
