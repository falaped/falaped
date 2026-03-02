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
