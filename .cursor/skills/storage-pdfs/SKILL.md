---
name: storage-pdfs
description: Supabase Storage para PDFs de relatório (bucket report-pdfs, signed URLs, paths). Use ao listar, baixar ou referenciar PDFs de relatório por caso.
---

# Storage – Relatórios PDF

## Quando usar

Ao implementar listagem/download de PDFs por caso; ou ao falar de relatórios, bucket, storage.

## Bucket

- Nome: `report-pdfs`.
- Path esperado: `{caseId}/relatorio-{nome}-{data}.pdf`.
- Exemplo: `abc123/relatorio-maria-27-02-2026.pdf`.

## Operações

- **Listar**: `supabase.storage.from('report-pdfs').list(caseId)` para arquivos do caso.
- **Download**: `supabase.storage.from('report-pdfs').createSignedUrl(path, expiry)` para URL assinada.

## Políticas

- RLS desabilitado por padrão; para produção definir políticas de storage em `report-pdfs`.
- Filtro por `user_phone` ou equivalente (caso pertence ao médico).

## Referências

- [docs/schema-supabase.md](../../docs/schema-supabase.md) (Storage)
- [docs/plano-fases.md](../../docs/plano-fases.md) (Fase 5)
