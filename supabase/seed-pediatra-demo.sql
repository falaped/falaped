-- Seed: pediatra de demonstração (contato@falaped.com.br) — parte 1
--
-- 5 pacientes com cadastro completo, 5 consultas encerradas e 1 consulta em aberto,
-- cada consulta com tudo o que o app guarda: resumo, mensagens, lembretes, relatório
-- (finalizado ou em rascunho), receita, atestados, pedido de exame, encaminhamento,
-- orientação, relatório médico, escala, medidas, vacinas e lançamento financeiro.
--
-- Datas relativas a hoje no fuso da clínica (America/Sao_Paulo): rodar de novo
-- "renova" a agenda. IDs fixos (prefixo 5eed): o bloco apaga o que ele mesmo criou
-- antes de inserir, sem tocar nos dados que o médico criou na conta.
--
-- Fora desta parte: anexos, fotos e leituras de exame (dependem de arquivo no Storage).

DO $$
DECLARE
  v_profile uuid;
  v_phone text;
  v_today date := (now() AT TIME ZONE 'America/Sao_Paulo')::date;
  v_tz text := 'America/Sao_Paulo';
  v_template uuid := '232f1aff-d736-4654-8ad9-de9c2fb6e1c9'; -- Prontuário pediátrico padrão
  v_sus uuid := '621991de-a2ff-4c39-a641-d901ed0920b5';      -- Calendário PNI/SUS

  -- Pacientes
  p_helena uuid := '5eed0000-0000-4000-8000-000000000001';
  p_miguel uuid := '5eed0000-0000-4000-8000-000000000002';
  p_laura  uuid := '5eed0000-0000-4000-8000-000000000003';
  p_davi   uuid := '5eed0000-0000-4000-8000-000000000004';
  p_sofia  uuid := '5eed0000-0000-4000-8000-000000000005';
  -- Consultas
  c_davi   uuid := '5eed0000-0000-4000-8000-000000000101'; -- hoje, encerrada
  c_helena uuid := '5eed0000-0000-4000-8000-000000000102'; -- hoje, encerrada
  c_laura  uuid := '5eed0000-0000-4000-8000-000000000103'; -- ontem
  c_sofia  uuid := '5eed0000-0000-4000-8000-000000000104'; -- 3 dias atrás
  c_miguel uuid := '5eed0000-0000-4000-8000-000000000105'; -- 8 dias atrás
  c_open   uuid := '5eed0000-0000-4000-8000-000000000106'; -- retorno do Miguel, em andamento

  v_patients uuid[];
  v_cases uuid[];
BEGIN
  SELECT p.id, p.phone INTO v_profile, v_phone
  FROM profiles p JOIN auth.users u ON u.id = p.auth_user_id
  WHERE u.email = 'contato@falaped.com.br';
  IF v_profile IS NULL THEN
    RAISE EXCEPTION 'Perfil de contato@falaped.com.br não encontrado';
  END IF;

  v_patients := ARRAY[p_helena, p_miguel, p_laura, p_davi, p_sofia];
  v_cases := ARRAY[c_davi, c_helena, c_laura, c_sofia, c_miguel, c_open];

  -- Limpa o que este seed criou antes
  DELETE FROM case_messages WHERE case_id = ANY (v_cases);
  DELETE FROM case_reminders WHERE case_id = ANY (v_cases);
  DELETE FROM case_reports WHERE case_id = ANY (v_cases);
  DELETE FROM financial_entries WHERE case_id = ANY (v_cases);
  DELETE FROM prescriptions WHERE patient_id = ANY (v_patients);
  DELETE FROM medical_certificates WHERE patient_id = ANY (v_patients);
  DELETE FROM exam_requests WHERE patient_id = ANY (v_patients);
  DELETE FROM referrals WHERE patient_id = ANY (v_patients);
  DELETE FROM guidance_documents WHERE patient_id = ANY (v_patients);
  DELETE FROM medical_reports WHERE patient_id = ANY (v_patients);
  DELETE FROM patient_scale_results WHERE patient_id = ANY (v_patients);
  DELETE FROM patient_measurements WHERE patient_id = ANY (v_patients);
  DELETE FROM patient_vaccine_doses WHERE patient_id = ANY (v_patients);
  DELETE FROM appointments WHERE patient_id = ANY (v_patients);
  DELETE FROM cases WHERE id = ANY (v_cases);
  DELETE FROM patients WHERE id = ANY (v_patients);

  -- Perfil: completa o que falta para os documentos (não sobrescreve)
  UPDATE profiles SET
    crm = coalesce(crm, '52871 MG'),
    default_location_state = coalesce(default_location_state, 'MG'),
    default_location_city = coalesce(default_location_city, 'Belo Horizonte'),
    consultation_price_cents = coalesce(consultation_price_cents, 35000)
  WHERE id = v_profile;

  -- ── Pacientes ──────────────────────────────────────────────────────────────
  INSERT INTO patients (
    id, profile_id, name, birth_date, sex, responsible, legal_guardian, contact_phone,
    blood_type, weight, height, head_circumference, gestational_age_weeks,
    allergies, current_medications, medical_history, address, family_notes,
    consent_given, consent_at
  ) VALUES
  (p_helena, v_profile, 'Helena Duarte Castro', '2025-11-20', 'feminino',
   'Camila Duarte Castro', 'Mãe', '31987412365',
   'O+', '8,8', '70,5', '44,5', 39,
   'Proteína do leite de vaca (APLV)', 'Vitamina D 600 UI/dia; sulfato ferroso 1 mg/kg/dia',
   'Parto cesárea a termo, Apgar 9/10. APLV diagnosticada aos 3 meses (sangue nas fezes), em fórmula extensamente hidrolisada.',
   'Rua Professor Morais, 412, ap. 301 – Savassi, Belo Horizonte', 'Pai: Rafael (engenheiro). Irmão Bento, 4 anos. Avó materna ajuda nos cuidados.',
   true, now() - interval '10 months'),
  (p_miguel, v_profile, 'Miguel Andrade Rocha', '2022-04-03', 'masculino',
   'Juliana Andrade Rocha', 'Mãe', '31991238844',
   'A+', '16,2', '101', NULL, 38,
   'Dipirona (urticária)', NULL,
   'Três episódios de otite média aguda em 2026. Frequenta escola infantil em período integral.',
   'Av. Bandeirantes, 1550 – Sion, Belo Horizonte', 'Mãe professora, pai Thiago trabalha em turnos.',
   true, now() - interval '2 years'),
  (p_laura, v_profile, 'Laura Bittencourt Lima', '2018-09-14', 'feminino',
   'Patrícia Bittencourt', 'Mãe', '31988871020',
   'B+', '25', '127', NULL, 40,
   NULL, 'Budesonida 200 mcg spray, 1 jato 12/12h (manutenção)',
   'Asma intermitente desde os 4 anos; última crise com internação em 2024. Rinite alérgica.',
   'Rua Pium-í, 870 – Cruzeiro, Belo Horizonte', 'Pais separados; guarda compartilhada, semana alternada com o pai (Marcelo, 31 99654-2210).',
   true, now() - interval '3 years'),
  (p_davi, v_profile, 'Davi Nogueira Prates', '2024-12-02', 'masculino',
   'Renata Nogueira Prates', 'Mãe', '31993057781',
   'O-', '11,8', '85', '47', 37,
   NULL, NULL,
   'Prematuro tardio (37 semanas), sem intercorrências neonatais. Desenvolvimento adequado.',
   'Rua Itajubá, 233 – Floresta, Belo Horizonte', 'Fica com a avó paterna durante o dia.',
   true, now() - interval '1 year'),
  (p_sofia, v_profile, 'Sofia Mendes Carvalho', '2021-07-28', 'feminino',
   'Bruno Mendes Carvalho', 'Pai', '31984420917',
   'AB+', '18,5', '108', NULL, 39,
   'Picada de abelha (reação local extensa)', NULL,
   'Hígida. Atraso leve de fala relatado pela escola; trocas fonêmicas (r/l).',
   'Rua Gonçalves Dias, 2010 – Lourdes, Belo Horizonte', 'Filha única. Escola bilíngue, período da manhã.',
   true, now() - interval '4 years');

  -- ── Consultas ──────────────────────────────────────────────────────────────
  INSERT INTO cases (
    id, profile_id, user_phone, patient_id, status, origin, source,
    started_at, ended_at, consultation_paused_ms, awaiting_intent, awaiting_patient_choice,
    summary, summary_generated_at, context_summary, earnings_prompted_at
  ) VALUES
  (c_davi, v_profile, v_phone, p_davi, 'closed', 'dashboard', 'dashboard',
   (v_today + time '08:30') AT TIME ZONE v_tz, (v_today + time '09:04') AT TIME ZONE v_tz, 0, false, false,
   E'• Diarreia aguda há 2 dias, 6 evacuações/dia, sem sangue; febre 38,2 °C ontem.\n• Desidratação leve (mucosas secas, choro com lágrima), bom estado geral.\n• Conduta: SRO, zinco por 10 dias e ondansetrona se vômitos.\n• Atestado de acompanhante para a mãe (2 dias).\n• Ligar amanhã para saber da evolução.',
   (v_today + time '09:05') AT TIME ZONE v_tz,
   'Lactente de 1a10m com gastroenterite aguda provavelmente viral, desidratação leve, hidratação oral.',
   (v_today + time '09:06') AT TIME ZONE v_tz),
  (c_helena, v_profile, v_phone, p_helena, 'closed', 'dashboard', 'dashboard',
   (v_today + time '09:30') AT TIME ZONE v_tz, (v_today + time '10:14') AT TIME ZONE v_tz, 180000, false, false,
   E'• Puericultura de 10 meses: peso 8,8 kg (P50), comprimento 70,5 cm (P50), PC 44,5 cm.\n• APLV em fórmula extensamente hidrolisada, boa aceitação da introdução alimentar.\n• DNPM adequado: senta sem apoio, engatinha, fala "mamã".\n• Vacinas do PNI em dia; orientada Meningo B e ACWY na rede privada.\n• Retorno aos 12 meses.',
   (v_today + time '10:15') AT TIME ZONE v_tz,
   'Puericultura de rotina aos 10 meses, APLV em acompanhamento, crescimento e desenvolvimento adequados.',
   (v_today + time '10:16') AT TIME ZONE v_tz),
  (c_laura, v_profile, v_phone, p_laura, 'closed', 'dashboard', 'dashboard',
   (v_today - 1 + time '16:10') AT TIME ZONE v_tz, (v_today - 1 + time '16:52') AT TIME ZONE v_tz, 0, false, false,
   E'• Crise de asma leve a moderada há 1 dia, desencadeada por IVAS.\n• Sibilos difusos, SatO2 95%, FR 28; PEWS 1.\n• Salbutamol spray 4 jatos 4/4h por 48h e prednisolona 3 dias.\n• Manter budesonida; revisar técnica do espaçador.\n• Atestado escolar de 2 dias.',
   (v_today - 1 + time '16:53') AT TIME ZONE v_tz,
   'Escolar asmática com exacerbação leve a moderada após IVAS, tratada ambulatorialmente.',
   (v_today - 1 + time '16:54') AT TIME ZONE v_tz),
  (c_sofia, v_profile, v_phone, p_sofia, 'closed', 'dashboard', 'dashboard',
   (v_today - 3 + time '14:00') AT TIME ZONE v_tz, (v_today - 3 + time '14:48') AT TIME ZONE v_tz, 0, false, false,
   E'• Puericultura de 5 anos com queixa escolar de trocas na fala (r/l).\n• Crescimento adequado (P50/P50), PA 95x60.\n• Frênulo lingual normal; encaminhada para avaliação fonoaudiológica.\n• Pedido de hemograma e ferritina (palidez e baixa ingesta de carne).\n• Retorno com exames em 30 dias.',
   (v_today - 3 + time '14:49') AT TIME ZONE v_tz,
   'Pré-escolar com dislalia, encaminhada à fonoaudiologia; investigação de anemia ferropriva.',
   NULL),
  (c_miguel, v_profile, v_phone, p_miguel, 'closed', 'dashboard', 'dashboard',
   (v_today - 8 + time '10:20') AT TIME ZONE v_tz, (v_today - 8 + time '10:51') AT TIME ZONE v_tz, 0, false, false,
   E'• Otalgia direita e febre de 39 °C há 1 dia, após resfriado.\n• Otoscopia: membrana timpânica direita abaulada e hiperemiada.\n• OMA à direita: amoxicilina 90 mg/kg/dia por 10 dias; evitar dipirona (alergia).\n• Terceiro episódio no ano: avaliar otorrino se recorrer.\n• Retorno em 8 a 10 dias para reavaliar a membrana.',
   (v_today - 8 + time '10:52') AT TIME ZONE v_tz,
   'Pré-escolar com otite média aguda à direita, terceiro episódio em 2026, em uso de amoxicilina.',
   (v_today - 8 + time '10:53') AT TIME ZONE v_tz),
  (c_open, v_profile, v_phone, p_miguel, 'active', 'dashboard', 'dashboard',
   now() - interval '12 minutes', NULL, 0, false, false,
   NULL, NULL,
   'Retorno de OMA à direita após 8 dias de amoxicilina.',
   NULL);

  -- ── Conversa da consulta (assistente) ──────────────────────────────────────
  INSERT INTO case_messages (case_id, role, content, created_at) VALUES
  (c_davi, 'user', 'Davi, 1 ano e 10 meses, diarreia há 2 dias, 6 vezes ao dia, sem sangue. Febre 38,2 ontem. Aceitando líquidos.', (v_today + time '08:34') AT TIME ZONE v_tz),
  (c_davi, 'assistant', '__FALAPED_JSON__{"type":"assistant_reply","content":"Quadro compatível com gastroenterite aguda, provavelmente viral. Avalie sinais de desidratação (mucosas, lágrimas, enchimento capilar, diurese). Com desidratação leve, terapia de reidratação oral (plano B) e zinco 20 mg/dia por 10 a 14 dias.","showAlertCompact":false}', (v_today + time '08:35') AT TIME ZONE v_tz),
  (c_helena, 'user', 'Helena, 10 meses, puericultura. APLV em fórmula extensamente hidrolisada. Peso 8,8 kg, comprimento 70,5, PC 44,5.', (v_today + time '09:36') AT TIME ZONE v_tz),
  (c_helena, 'assistant', '__FALAPED_JSON__{"type":"assistant_reply","content":"Medidas no P50 para a idade (OMS). Marcos esperados aos 10 meses: engatinhar, ficar de pé com apoio, pinça inferior, balbucio silábico. Na APLV, reavaliar teste de provocação oral entre 9 e 12 meses de dieta de exclusão.","showAlertCompact":false}', (v_today + time '09:37') AT TIME ZONE v_tz),
  (c_laura, 'user', 'Laura, 8 anos, asmática, tosse e chiado desde ontem, SatO2 95%, FR 28.', (v_today - 1 + time '16:14') AT TIME ZONE v_tz),
  (c_laura, 'assistant', '__FALAPED_JSON__{"type":"assistant_reply","content":"Exacerbação leve a moderada. Sugestão: salbutamol 100 mcg/jato, 4 jatos com espaçador a cada 20 min na primeira hora, depois 4/4h; prednisolona 1 a 2 mg/kg/dia (máx. 40 mg) por 3 a 5 dias. Reavaliar se SatO2 < 92%.","showAlertCompact":false}', (v_today - 1 + time '16:15') AT TIME ZONE v_tz),
  (c_sofia, 'user', 'Sofia, 5 anos, escola relata troca do r pelo l. Palidez leve, come pouca carne.', (v_today - 3 + time '14:06') AT TIME ZONE v_tz),
  (c_sofia, 'assistant', '__FALAPED_JSON__{"type":"assistant_reply","content":"Trocas de r/l aos 5 anos merecem avaliação fonoaudiológica. Avalie frênulo lingual e audição. Pela palidez e dieta, considere hemograma e ferritina.","showAlertCompact":false}', (v_today - 3 + time '14:07') AT TIME ZONE v_tz),
  (c_miguel, 'user', 'Miguel, 4 anos, otalgia direita e febre de 39, membrana abaulada. Alérgico a dipirona.', (v_today - 8 + time '10:24') AT TIME ZONE v_tz),
  (c_miguel, 'assistant', '__FALAPED_JSON__{"type":"assistant_reply","content":"OMA à direita. Amoxicilina 80 a 90 mg/kg/dia de 12/12h por 10 dias (menor de 2 anos ou recorrente). Analgesia com paracetamol ou ibuprofeno; evitar dipirona pela alergia registrada.","showAlertCompact":false}', (v_today - 8 + time '10:25') AT TIME ZONE v_tz),
  (c_open, 'user', 'Miguel voltou para reavaliar a otite. Terminou a amoxicilina ontem, sem febre há 6 dias.', now() - interval '9 minutes'),
  (c_open, 'assistant', '__FALAPED_JSON__{"type":"assistant_reply","content":"Na reavaliação, observe a membrana timpânica: efusão residual é comum por semanas e não exige novo antibiótico se assintomático. Com 3 episódios em 6 meses, considere encaminhar ao otorrinolaringologista.","showAlertCompact":false}', now() - interval '8 minutes');

  -- ── Lembretes deixados nas consultas ───────────────────────────────────────
  INSERT INTO case_reminders (profile_id, case_id, text, created_at) VALUES
  (v_profile, c_davi, 'Ligar amanhã para a Renata e saber se a diarreia do Davi melhorou', (v_today + time '09:02') AT TIME ZONE v_tz),
  (v_profile, c_helena, 'Conferir se a Helena tomou a Meningo B na clínica de vacinas', (v_today + time '10:12') AT TIME ZONE v_tz),
  (v_profile, c_laura, 'Revisar a técnica do espaçador da Laura no próximo retorno', (v_today - 1 + time '16:50') AT TIME ZONE v_tz),
  (v_profile, c_sofia, 'Cobrar o resultado do hemograma e da ferritina da Sofia', (v_today - 3 + time '14:45') AT TIME ZONE v_tz),
  (v_profile, c_miguel, 'Se a otite do Miguel voltar, encaminhar ao otorrino', (v_today - 8 + time '10:50') AT TIME ZONE v_tz);

  -- ── Relatórios da consulta (prontuário) ────────────────────────────────────
  INSERT INTO case_reports (case_id, profile_id, report_template_id, sections, is_finalized, finalized_at, source, created_at, updated_at) VALUES
  (c_davi, v_profile, v_template, jsonb_build_array(
     jsonb_build_object('name','Paciente','order',0,'content',E'Nome: Davi Nogueira Prates\nData de nascimento: 02/12/2024\nResponsável: Renata Nogueira Prates\nTelefone de contato: (31) 99305-7781'),
     jsonb_build_object('name','Queixa principal','order',1,'content','Diarreia há 2 dias.'),
     jsonb_build_object('name','História da moléstia atual','order',2,'content','Diarreia aquosa há 2 dias, cerca de 6 evacuações/dia, sem sangue ou muco. Febre de 38,2 °C ontem, um episódio de vômito. Aceitando líquidos, diurese presente porém reduzida.'),
     jsonb_build_object('name','Exame físico','order',3,'content',E'Peso: 11,8 kg\nComprimento: 85 cm\nTemperatura: 37,4 °C\nMucosas levemente secas, choro com lágrimas, enchimento capilar < 2 s. Abdome flácido, RHA aumentados.'),
     jsonb_build_object('name','Hipóteses diagnósticas','order',4,'content','Gastroenterite aguda provavelmente viral (A09). Desidratação leve.'),
     jsonb_build_object('name','Condutas','order',5,'content',E'- Terapia de reidratação oral (plano B).\n- Zinco 20 mg/dia por 10 dias.\n- Ondansetrona se vômitos.\n- Sinais de alarme orientados.')
   ), true, (v_today + time '09:10') AT TIME ZONE v_tz, 'web', (v_today + time '09:05') AT TIME ZONE v_tz, (v_today + time '09:10') AT TIME ZONE v_tz),
  (c_helena, v_profile, v_template, jsonb_build_array(
     jsonb_build_object('name','Paciente','order',0,'content',E'Nome: Helena Duarte Castro\nData de nascimento: 20/11/2025\nResponsável: Camila Duarte Castro\nTelefone de contato: (31) 98741-2365'),
     jsonb_build_object('name','Queixa principal','order',1,'content','Consulta de rotina, sem queixa.'),
     jsonb_build_object('name','História da moléstia atual','order',2,'content','Puericultura de 10 meses. APLV em fórmula extensamente hidrolisada, introdução alimentar sem leite com boa aceitação. Dorme bem, evacuações diárias normais.'),
     jsonb_build_object('name','Exame físico','order',3,'content',E'Peso: 8,8 kg (P50)\nComprimento: 70,5 cm (P50)\nPerímetro cefálico: 44,5 cm\nBEG, ativa, corada, hidratada. Fontanela anterior 1x1 cm.'),
     jsonb_build_object('name','Hipóteses diagnósticas','order',4,'content','Lactente eutrófica com desenvolvimento adequado. APLV em acompanhamento.'),
     jsonb_build_object('name','Condutas','order',5,'content','')
   ), false, NULL, 'web', (v_today + time '10:15') AT TIME ZONE v_tz, (v_today + time '10:15') AT TIME ZONE v_tz),
  (c_laura, v_profile, v_template, jsonb_build_array(
     jsonb_build_object('name','Paciente','order',0,'content',E'Nome: Laura Bittencourt Lima\nData de nascimento: 14/09/2018\nResponsável: Patrícia Bittencourt\nTelefone de contato: (31) 98887-1020'),
     jsonb_build_object('name','Queixa principal','order',1,'content','Tosse e chiado há 1 dia.'),
     jsonb_build_object('name','História da moléstia atual','order',2,'content','Asmática em uso de budesonida. Coriza há 3 dias, tosse e sibilância desde ontem, sem febre. Usou salbutamol 2 vezes em casa com melhora parcial.'),
     jsonb_build_object('name','Exame físico','order',3,'content',E'SatO2: 95%\nFR: 28 irpm\nFC: 108 bpm\nSibilos expiratórios difusos, tiragem subcostal leve.'),
     jsonb_build_object('name','Hipóteses diagnósticas','order',4,'content','Exacerbação de asma leve a moderada (J45.9) desencadeada por IVAS.'),
     jsonb_build_object('name','Condutas','order',5,'content',E'- Salbutamol 4 jatos 4/4h por 48h.\n- Prednisolona 40 mg/dia por 3 dias.\n- Manter budesonida.\n- Atestado de 2 dias.')
   ), true, (v_today - 1 + time '17:00') AT TIME ZONE v_tz, 'web', (v_today - 1 + time '16:53') AT TIME ZONE v_tz, (v_today - 1 + time '17:00') AT TIME ZONE v_tz),
  (c_sofia, v_profile, v_template, jsonb_build_array(
     jsonb_build_object('name','Paciente','order',0,'content',E'Nome: Sofia Mendes Carvalho\nData de nascimento: 28/07/2021\nResponsável: Bruno Mendes Carvalho\nTelefone de contato: (31) 98442-0917'),
     jsonb_build_object('name','Queixa principal','order',1,'content','Troca de sons na fala relatada pela escola.'),
     jsonb_build_object('name','História da moléstia atual','order',2,'content','Escola relata trocas fonêmicas (r/l). Baixa ingesta de carne vermelha, pai nota palidez.'),
     jsonb_build_object('name','Exame físico','order',3,'content',E'Peso: 18,5 kg (P50)\nEstatura: 108 cm (P50)\nPA: 95 x 60 mmHg\nMucosas levemente hipocoradas. Frênulo lingual sem alterações.'),
     jsonb_build_object('name','Hipóteses diagnósticas','order',4,'content','Dislalia. Suspeita de anemia ferropriva.'),
     jsonb_build_object('name','Condutas','order',5,'content',E'- Encaminhamento para fonoaudiologia.\n- Hemograma e ferritina.\n- Retorno em 30 dias.')
   ), true, (v_today - 3 + time '15:00') AT TIME ZONE v_tz, 'web', (v_today - 3 + time '14:49') AT TIME ZONE v_tz, (v_today - 3 + time '15:00') AT TIME ZONE v_tz),
  (c_miguel, v_profile, v_template, jsonb_build_array(
     jsonb_build_object('name','Paciente','order',0,'content',E'Nome: Miguel Andrade Rocha\nData de nascimento: 03/04/2022\nResponsável: Juliana Andrade Rocha\nTelefone de contato: (31) 99123-8844'),
     jsonb_build_object('name','Queixa principal','order',1,'content','Dor de ouvido e febre.'),
     jsonb_build_object('name','História da moléstia atual','order',2,'content','Resfriado há 4 dias, otalgia direita e febre de 39 °C há 1 dia. Terceiro episódio de otite em 2026.'),
     jsonb_build_object('name','Exame físico','order',3,'content',E'Peso: 16,2 kg\nTemperatura: 38,6 °C\nOtoscopia: MT direita abaulada e hiperemiada; MT esquerda normal.'),
     jsonb_build_object('name','Hipóteses diagnósticas','order',4,'content','Otite média aguda à direita (H66.9), recorrente.'),
     jsonb_build_object('name','Condutas','order',5,'content',E'- Amoxicilina 90 mg/kg/dia por 10 dias.\n- Ibuprofeno se dor (alergia a dipirona).\n- Retorno em 8 a 10 dias.')
   ), true, (v_today - 8 + time '11:00') AT TIME ZONE v_tz, 'web', (v_today - 8 + time '10:52') AT TIME ZONE v_tz, (v_today - 8 + time '11:00') AT TIME ZONE v_tz);

  -- ── Receitas ───────────────────────────────────────────────────────────────
  INSERT INTO prescriptions (profile_id, patient_id, case_id, payload, location_state, issued_at, orientations, warning_signs, created_at) VALUES
  (v_profile, p_davi, c_davi, '{"patientName":"Davi Nogueira Prates","birthDate":"2024-12-02","medications":[{"name":"Soro de reidratação oral","dosage":"Envelope 27,9 g","posology":"Diluir 1 envelope em 1 litro de água filtrada. Oferecer 50 a 100 mL após cada evacuação líquida.","duration":"Enquanto durar a diarreia"},{"name":"Sulfato de zinco","dosage":"4 mg/mL","posology":"Dar 5 mL, uma vez ao dia","duration":"10 dias"},{"name":"Ondansetrona","dosage":"4 mg comprimido orodispersível","posology":"Dissolver ½ comprimido na boca se vomitar, até de 8/8h","duration":"Se necessário, por até 3 dias"}]}'::jsonb,
   'MG', v_today, 'Manter alimentação habitual em pequenas porções. Oferecer água e soro com frequência.', 'Sangue nas fezes, vômitos que não param, sonolência, boca muito seca ou xixi muito reduzido: procurar o pronto-atendimento.', (v_today + time '08:58') AT TIME ZONE v_tz),
  (v_profile, p_helena, c_helena, '{"patientName":"Helena Duarte Castro","birthDate":"2025-11-20","medications":[{"name":"Vitamina D3","dosage":"600 UI/gota","posology":"Dar 1 gota, uma vez ao dia","duration":"Uso contínuo"},{"name":"Sulfato ferroso","dosage":"25 mg/mL (1 mg Fe/gota)","posology":"Dar 9 gotas, uma vez ao dia, 30 minutos antes do almoço","duration":"Até 2 anos"}]}'::jsonb,
   'MG', v_today, 'Manter fórmula extensamente hidrolisada. Introdução alimentar sem leite de vaca e derivados.', NULL, (v_today + time '10:08') AT TIME ZONE v_tz),
  (v_profile, p_laura, c_laura, '{"patientName":"Laura Bittencourt Lima","birthDate":"2018-09-14","medications":[{"name":"Salbutamol spray","dosage":"100 mcg/jato","posology":"4 jatos com espaçador de 4/4h","duration":"48 horas, depois se chiado"},{"name":"Prednisolona","dosage":"3 mg/mL","posology":"Dar 13 mL, uma vez ao dia, pela manhã","duration":"3 dias"},{"name":"Budesonida spray","dosage":"200 mcg/jato","posology":"1 jato com espaçador de 12/12h","duration":"Uso contínuo"}]}'::jsonb,
   'MG', v_today - 1, 'Enxaguar a boca após a budesonida. Usar sempre o espaçador.', 'Falta de ar, lábios roxos ou chiado que não melhora com o salbutamol: procurar o pronto-atendimento.', (v_today - 1 + time '16:45') AT TIME ZONE v_tz),
  (v_profile, p_miguel, c_miguel, '{"patientName":"Miguel Andrade Rocha","birthDate":"2022-04-03","medications":[{"name":"Amoxicilina","dosage":"400 mg/5 mL","posology":"Dar 9 mL de 12/12h","duration":"10 dias"},{"name":"Ibuprofeno","dosage":"100 mg/mL","posology":"Dar 16 gotas de 8/8h se dor ou febre","duration":"Se necessário, por até 3 dias"}]}'::jsonb,
   'MG', v_today - 8, 'Completar os 10 dias de antibiótico mesmo com melhora. Não usar dipirona (alergia).', 'Febre que volta após 48h de antibiótico, secreção pelo ouvido ou inchaço atrás da orelha: retornar.', (v_today - 8 + time '10:46') AT TIME ZONE v_tz);

  -- ── Atestados ──────────────────────────────────────────────────────────────
  INSERT INTO medical_certificates (profile_id, type, patient_id, case_id, payload, location_state, issued_at, created_at) VALUES
  (v_profile, 'acompanhante', p_davi, c_davi, jsonb_build_object('patientName','Davi Nogueira Prates','birthDate','2024-12-02','companionName','Renata Nogueira Prates','consultationDate',v_today::text,'periodo','matutino','timeStart','08:30','timeEnd','09:05','observations','Necessita acompanhar o filho por 2 dias para hidratação e observação.'), 'MG', v_today, (v_today + time '09:00') AT TIME ZONE v_tz),
  (v_profile, 'medico', p_laura, c_laura, jsonb_build_object('patientName','Laura Bittencourt Lima','birthDate','2018-09-14','cid10','J45.9','daysAway',2,'startDate',(v_today - 1)::text,'canLeaveHome',false,'observations','Afastamento das atividades escolares.'), 'MG', v_today - 1, (v_today - 1 + time '16:48') AT TIME ZONE v_tz),
  (v_profile, 'comparecimento', p_sofia, c_sofia, jsonb_build_object('patientName','Sofia Mendes Carvalho','birthDate','2021-07-28','attendanceDate',(v_today - 3)::text,'periodo','vespertino','timeStart','14:00','timeEnd','14:50','observations','Compareceu acompanhada do pai.'), 'MG', v_today - 3, (v_today - 3 + time '14:44') AT TIME ZONE v_tz),
  (v_profile, 'aptidao_fisica', p_sofia, c_sofia, jsonb_build_object('patientName','Sofia Mendes Carvalho','birthDate','2021-07-28','activities','Natação e balé','validity','12 meses','observations','Sem restrições.'), 'MG', v_today - 3, (v_today - 3 + time '14:46') AT TIME ZONE v_tz);

  -- ── Pedido de exame, encaminhamento, orientação, relatório médico ─────────
  INSERT INTO exam_requests (profile_id, patient_id, case_id, payload, location_state, issued_at, created_at) VALUES
  (v_profile, p_sofia, c_sofia, '{"patientName":"Sofia Mendes Carvalho","birthDate":"2021-07-28","exams":["HEMOGRAMA COMPLETO","FERRITINA","FERRO SÉRICO","PARASITOLÓGICO DE FEZES (3 AMOSTRAS)"],"observations":"Indicação clínica: palidez cutâneo-mucosa e baixa ingesta de ferro heme. Investigação de anemia ferropriva."}'::jsonb, 'MG', v_today - 3, (v_today - 3 + time '14:40') AT TIME ZONE v_tz);

  INSERT INTO referrals (profile_id, patient_id, case_id, payload, location_state, issued_at, created_at) VALUES
  (v_profile, p_sofia, c_sofia, '{"patientName":"Sofia Mendes Carvalho","birthDate":"2021-07-28","specialty":"Fonoaudiologia","urgency":"rotina","reason":"Dislalia: trocas fonêmicas (r/l) relatadas pela escola.","clinicalSummary":"Encaminho a paciente para avaliação fonoaudiológica completa. Pré-escolar de 5 anos com trocas fonêmicas persistentes. Frênulo lingual sem alterações ao exame. Audição sem queixas."}'::jsonb, 'MG', v_today - 3, (v_today - 3 + time '14:42') AT TIME ZONE v_tz);

  INSERT INTO guidance_documents (profile_id, patient_id, case_id, payload, location_state, issued_at, created_at) VALUES
  (v_profile, p_helena, c_helena, '{"patientName":"Helena Duarte Castro","birthDate":"2025-11-20","milestone":"10 meses","body":"<p><strong>Alimentação</strong></p><ul><li><p>Três refeições de sal por dia e frutas nos lanches, em pedaços pequenos.</p></li><li><p>Nada de leite de vaca, queijo, iogurte ou manteiga (APLV). Ler o rótulo de tudo.</p></li><li><p>Água em copo aberto à vontade.</p></li></ul><p><strong>Segurança</strong></p><ul><li><p>Protetor nas tomadas e portão na escada: ela já engatinha.</p></li><li><p>Cadeirinha no carro virada para trás.</p></li></ul>"}'::jsonb, 'MG', v_today, (v_today + time '10:10') AT TIME ZONE v_tz);

  INSERT INTO medical_reports (profile_id, patient_id, case_id, payload, location_state, issued_at, created_at) VALUES
  (v_profile, p_helena, c_helena, '{"patientName":"Helena Duarte Castro","birthDate":"2025-11-20","title":"RELATÓRIO MÉDICO PARA SOLICITAÇÃO DE VACINAÇÃO","bodyHtml":"<p><strong>Paciente:</strong> Helena Duarte Castro<br><strong>Data de nascimento:</strong> 20/11/2025</p><p>Solicito a aplicação das vacinas <strong>Meningocócica B</strong> e <strong>Meningocócica ACWY</strong> para a paciente acima, para ampliar a proteção contra as doenças meningocócicas, respeitando o esquema da idade.</p><p>Paciente com alergia à proteína do leite de vaca, sem contraindicação às vacinas solicitadas.</p>"}'::jsonb, 'MG', v_today, (v_today + time '10:11') AT TIME ZONE v_tz);

  -- ── Escalas ────────────────────────────────────────────────────────────────
  INSERT INTO patient_scale_results (profile_id, patient_id, case_id, scale_key, answers, score, interpretation, applied_at) VALUES
  (v_profile, p_laura, c_laura, 'pews', '{"behaviour":0,"respiratory":1,"cardiovascular":0,"aggravating":0}'::jsonb, 1, 'Risco baixo', (v_today - 1 + time '16:20') AT TIME ZONE v_tz),
  (v_profile, p_miguel, c_miguel, 'flacc', '{"face":1,"legs":0,"activity":1,"cry":1,"consolability":0}'::jsonb, 3, 'Desconforto leve', (v_today - 8 + time '10:30') AT TIME ZONE v_tz);

  -- ── Medidas (curvas de crescimento) ────────────────────────────────────────
  -- Laura fica sem medida recente de propósito (última há ~8 meses).
  INSERT INTO patient_measurements (profile_id, patient_id, measured_on, weight_grams, length_height_mm, head_circumference_mm, systolic_bp, diastolic_bp) VALUES
  (v_profile, p_helena, '2025-11-20', 3150, 490, 340, NULL, NULL),
  (v_profile, p_helena, '2026-01-20', 5200, 575, 385, NULL, NULL),
  (v_profile, p_helena, '2026-03-20', 6600, 615, 405, NULL, NULL),
  (v_profile, p_helena, '2026-05-20', 7500, 650, 425, NULL, NULL),
  (v_profile, p_helena, '2026-08-20', 8400, 690, 440, NULL, NULL),
  (v_profile, p_helena, v_today, 8800, 705, 445, NULL, NULL),
  (v_profile, p_davi, '2026-06-10', 11100, 815, 465, NULL, NULL),
  (v_profile, p_davi, v_today, 11800, 850, 470, NULL, NULL),
  (v_profile, p_laura, '2025-08-12', 23600, 1225, NULL, 98, 62),
  (v_profile, p_laura, '2026-02-10', 25000, 1270, NULL, 100, 64),
  (v_profile, p_sofia, '2025-10-01', 16900, 1035, NULL, 92, 58),
  (v_profile, p_sofia, v_today - 3, 18500, 1080, NULL, 95, 60),
  (v_profile, p_miguel, '2026-04-15', 15600, 990, NULL, NULL, NULL),
  (v_profile, p_miguel, v_today - 8, 16200, 1010, NULL, NULL, NULL);

  -- ── Vacinas (Helena: PNI em dia até 9 meses) ───────────────────────────────
  INSERT INTO patient_vaccine_doses (profile_id, patient_id, schedule_item_id, taken_at)
  SELECT v_profile, p_helena, i.id, (date '2025-11-20' + make_interval(months => i.age_months))::timestamptz
  FROM vaccine_schedule_items i
  WHERE i.schedule_id = v_sus AND i.age_months <= 9 AND i.vaccine NOT IN ('Pneumo 20', 'Rotavírus');

  -- ── Financeiro (Sofia fica sem valor de propósito) ─────────────────────────
  INSERT INTO financial_entries (profile_id, case_id, description, amount_cents, payment_method, received_on) VALUES
  (v_profile, c_davi, 'Consulta – Davi Nogueira Prates', 35000, 'pix', v_today),
  (v_profile, c_helena, 'Puericultura – Helena Duarte Castro', 35000, 'card', v_today),
  (v_profile, c_laura, 'Consulta – Laura Bittencourt Lima (Unimed)', 18000, 'insurance', v_today - 1),
  (v_profile, c_miguel, 'Consulta – Miguel Andrade Rocha', 35000, 'cash', v_today - 8);

  -- ── Agenda ─────────────────────────────────────────────────────────────────
  INSERT INTO appointments (profile_id, patient_id, status, type, reason, starts_at, ends_at) VALUES
  (v_profile, p_miguel, 'confirmed', 'retorno', 'Retorno da otite', now() - interval '15 minutes', now() + interval '15 minutes'),
  (v_profile, p_sofia, 'pending', 'retorno', 'Retorno com exames', (v_today + 27 + time '14:00') AT TIME ZONE v_tz, (v_today + 27 + time '14:40') AT TIME ZONE v_tz),
  (v_profile, p_helena, 'pending', 'puericultura', 'Puericultura de 12 meses', (v_today + 49 + time '09:30') AT TIME ZONE v_tz, (v_today + 49 + time '10:10') AT TIME ZONE v_tz);
END $$;
