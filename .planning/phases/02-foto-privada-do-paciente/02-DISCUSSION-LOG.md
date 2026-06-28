# Phase 2: Foto Privada do Paciente - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-06-28
**Phase:** 2-foto-privada-do-paciente
**Areas discussed:** Consentimento LGPD, Como anexar a foto, Onde/como exibir, Processamento & plano Supabase

---

## Consentimento LGPD

### Captura do consentimento
| Option | Description | Selected |
|--------|-------------|----------|
| Checkbox obrigatório no upload | Checkbox que bloqueia o upload se não marcado; sem tela extra | ✓ |
| Modal/etapa dedicada | Etapa separada com termo completo; mais formal, mais fricção | |
| Só registrar (sem bloquear) | Grava timestamp como consentimento implícito; postura LGPD mais fraca | |

### O que gravar como prova
| Option | Description | Selected |
|--------|-------------|----------|
| Flag + timestamp | `consent_given` + `consent_at` na linha da foto/paciente | ✓ |
| Flag + timestamp + texto vigente | Também snapshot do termo + versão | |
| Você decide | Modelo de dados a critério do planner | |

**User's choice:** Checkbox obrigatório que bloqueia o upload; gravar flag + timestamp.
**Notes:** Consentimento re-exigido ao substituir a foto.

---

## Como anexar a foto

### Por onde enviar
| Option | Description | Selected |
|--------|-------------|----------|
| Upload de arquivo (com câmera no mobile) | `<input type=file capture>`; sistema oferece tirar foto/galeria | |
| Captura via câmera no app + upload | UI de câmera (getUserMedia) além do upload; mais código | |
| Só upload de arquivo | Input de arquivo clássico, sem atributo `capture` | ✓ |

### Quantidade
| Option | Description | Selected |
|--------|-------------|----------|
| Uma foto, substituível | Única foto de identificação; reenviar substitui | ✓ |
| Histórico de fotos | Galeria ao longo do tempo; mais escopo | |

**User's choice:** Só upload de arquivo (sem `capture`); uma foto substituível.
**Notes:** Captura via câmera in-app e galeria/histórico ficam fora do ciclo.

---

## Onde/como exibir

### Superfícies de exibição (multi-seleção)
| Option | Description | Selected |
|--------|-------------|----------|
| Perfil/hero do paciente | `patient-detail-hero.tsx` — identificação principal | ✓ |
| Lista/tabela de pacientes | Miniatura em `patients-table.tsx` | ✓ |
| Cabeçalho do caso/atendimento | Junto de nome/idade/cronômetro no caso aberto | ✓ |

### Forma
| Option | Description | Selected |
|--------|-------------|----------|
| Avatar circular | Recorte em círculo com fallback (iniciais/ícone) | ✓ |
| Card/thumbnail retangular | Imagem retangular maior | |
| Você decide | Forma/tamanho a critério do Claude/UI | |

**User's choice:** Três superfícies (hero + lista/tabela + cabeçalho do caso); avatar circular com fallback.
**Notes:** Divergência consciente da Fase 1 (que não mostra idade em listas) — foto é apoio de reconhecimento.

---

## Processamento & plano Supabase

### Plano Supabase
| Option | Description | Selected |
|--------|-------------|----------|
| Pro (ou superior) | Image Transformations disponíveis | |
| Free | Sem transformations nativas; processar no cliente | ✓ |
| Não sei / confirmar depois | Pendência para o pesquisador | |

### Tratamento de tamanho/qualidade
| Option | Description | Selected |
|--------|-------------|----------|
| Comprimir no cliente antes do upload | Redimensiona/comprime no browser (~1-2MB) | ✓ |
| Guardar original com limite | Só valida tipo + tamanho máximo | |
| Você decide | Estratégia a critério do pesquisador/planner | |

**User's choice:** Plano Free; comprimir no cliente antes do upload.
**Notes:** Resolve o blocker do STATE.md (transform-on-the-fly indisponível no Free).

---

## Claude's Discretion

- Dimensões exatas do avatar por contexto (hero / lista / cabeçalho do caso).
- Modelo de dados de foto + consentimento (colunas em `patients` vs tabela dedicada).
- Parâmetros de compressão e TTL exato da URL assinada.

## Deferred Ideas

- Histórico/galeria de fotos por paciente — fase futura.
- Captura via câmera in-app (getUserMedia).
- Snapshot do texto/versão do termo de consentimento.
- Image Transformations / transform-on-the-fly — reavaliar se migrar para Supabase Pro.
