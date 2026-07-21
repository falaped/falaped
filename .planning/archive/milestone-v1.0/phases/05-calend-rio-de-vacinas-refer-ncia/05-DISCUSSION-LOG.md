# Phase 5: Calendário de Vacinas (Referência) - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-19
**Phase:** 5-calend-rio-de-vacinas-refer-ncia
**Areas discussed:** Layout do calendário, Ponto de entrada / navegação, Referência da gestante, Modelo de dado / versão

---

## Layout do calendário

### Estrutura da exibição SUS + SBIm

| Option | Description | Selected |
|--------|-------------|----------|
| Accordion por faixa etária | Seções colapsáveis por marco; cada seção lista vacinas com colunas SUS/SBIm | |
| Grade vacina × idade | Tabela clássica: linhas = vacinas, colunas = idades; células marcam a dose | |
| Duas colunas paralelas | SUS à esquerda, SBIm à direita, cada um lista por idade | ✓ |

**User's choice:** Duas colunas paralelas

### Reação à idade da criança (ao abrir de um paciente)

| Option | Description | Selected |
|--------|-------------|----------|
| Destacar a idade atual | Mostra o calendário inteiro, rola/realça a faixa de idade atual | ✓ |
| Filtrar só a idade atual | Mostra apenas as vacinas previstas para a idade atual | |
| Sem reação à idade | Calendário estático completo; navegação manual | |

**User's choice:** Destacar a idade atual

---

## Ponto de entrada / navegação

| Option | Description | Selected |
|--------|-------------|----------|
| Ambos (rota + perfil) | Rota standalone /dashboard/vaccines + acesso pelo perfil do paciente com idade | ✓ |
| Só rota standalone | Uma única rota na sidebar; idade informada manualmente | |
| Só dentro do perfil | Aba de vacinas sempre no contexto de um paciente | |

**User's choice:** Ambos (rota + perfil)

---

## Referência da gestante

### Apresentação em relação ao SUS/SBIm

| Option | Description | Selected |
|--------|-------------|----------|
| Terceira aba/seção separada | Abas "Criança (SUS × SBIm)" e "Gestante" com eixo próprio (semanas) | ✓ |
| Rota própria | /dashboard/vaccines/pregnancy ou item de sidebar dedicado | |
| Bloco na mesma tela | Painel de gestante abaixo do calendário infantil | |

**User's choice:** Terceira aba/seção separada

### Exibição do timing por semana

| Option | Description | Selected |
|--------|-------------|----------|
| Lista com janela por vacina | Uma linha por vacina com janela em texto ("dTpa — a partir de 20 semanas") | ✓ |
| Agrupado por trimestre | Seções 1º/2º/3º trimestre com as vacinas de cada janela | |

**User's choice:** Lista com janela por vacina

---

## Modelo de dado / versão

### Storage

| Option | Description | Selected |
|--------|-------------|----------|
| In-repo JSON versionado | Padrão da Phase 3 (lib/growth-reference/); JSON tipado no build | |
| Seed em tabela Supabase | Tabelas populadas por seed SQL; migration + query | ✓ |

**User's choice:** Seed em tabela Supabase (divergência deliberada do precedente in-repo da Phase 3)

### Proveniência / aviso

| Option | Description | Selected |
|--------|-------------|----------|
| Rodapé por dataset + aviso fixo | Fonte/vigência no rodapé de cada bloco + aviso persistente | ✓ |
| Banner único no topo | Aviso global com fontes/vigências listadas juntas | |

**User's choice:** Rodapé por dataset + aviso fixo

### Acesso e edição (decorrência da escolha de tabela Supabase)

| Option | Description | Selected |
|--------|-------------|----------|
| Leitura global + seed-only | RLS SELECT p/ authenticated/paid sem profile_id; writes só por migration/seed | ✓ |
| Leitura global + admin edita | Leitura para todos + caminho de edição (action/UI de admin) | |

**User's choice:** Leitura global + seed-only

### Estrutura do versionamento

| Option | Description | Selected |
|--------|-------------|----------|
| Metadata por dataset | Tabela schedule (SUS/SBIm/gestante) com source/version/effective_date; linhas referenciam o schedule | ✓ |
| Versão por linha | Cada linha carrega sua própria fonte/ano | |

**User's choice:** Metadata por dataset

---

## Claude's Discretion

- Nomes exatos de tabelas/colunas e a modelagem de "dose" e "idade recomendada" (estruturada vs rótulo texto) — seguindo a granularidade que a Phase 6 vai precisar para o diff.
- Componentes de UI (tabs, layout de duas colunas) do design system existente.
- Busca por vacina no calendário standalone — nice-to-have, fora do escopo mínimo salvo indicação do planner.

## Deferred Ideas

- Carteira de vacinação por paciente (doses aplicadas, pendentes/atrasadas, próxima dose) — Phase 6.
- Busca por vacina no calendário standalone — nice-to-have.
- PDF/impressão do calendário de referência — possível fase futura.
- UI/action de admin para editar vigência sem deploy — preterido; seed-only nesta fase.
- **Content accuracy checkpoint:** seed dos três calendários exige sign-off do médico contra fontes oficiais no build (blocker já em STATE.md).
