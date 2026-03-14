# Enums (public)

Tipos enum do schema `public` no PostgreSQL.

---

## case_report_source

**Uso:** coluna `case_reports.source` — origem da geração do relatório.

| Valor | Descrição |
|-------|-----------|
| web | Relatório gerado no dashboard/app |
| whatsapp | Relatório gerado pelo bot (WhatsApp/Falaped) |

**Comentário no banco:** "Origin of the case report: web (dashboard/app) or whatsapp."

---

## medical_certificate_type

**Uso:** coluna `medical_certificates.type` — tipo do atestado.

| Valor | Descrição |
|-------|-----------|
| comparecimento | Atestado de comparecimento |
| aptidao_fisica | Atestado de aptidão física |
| medico | Atestado médico (afastamento) |
| acompanhante | Atestado de acompanhante |

**Comentário no banco:** "Tipo do atestado: comparecimento, aptidão física, médico (afastamento), acompanhante."
