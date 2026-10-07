# Etapa 1: auditoria visual do app atual

**Data:** 06/10/2026 · **Skill:** `redesign-existing-projects` · **Branch:** `falaped-ui-2.0`

Leitura do código de `app/` e `components/` (291 arquivos `.tsx`, sem Books e sem Admin quando indicado) e dos tokens em `app/globals.css`. A auditoria não muda nada no app: ela alimenta a **ficha de design (Etapa 2)**. A gravidade segue a escala da `ux-heuristics`, de 0 (não é problema) a 4 (impede a tarefa).

> Retrato visual de todos os componentes com os tokens atuais: aba **Componentes atuais** do `fluxo-falaped-2.0.html` (arquivo `componentes-atuais.html`).

> Limite: a auditoria foi feita pelo código, não pelas telas logadas. Os pontos marcados com 👁 precisam ser confirmados no `yarn dev`.

## Resumo

A base é boa e deve ser mantida: tokens em oklch, um azul de marca só, cinzas neutros, `tabular-nums` em 32 arquivos, skeletons e `loading.tsx` em 13 rotas, nenhum `alert()`. Os problemas não vêm de excesso de estilo, e sim da **falta de sistema**:

1. **Contraste do azul:** o azul da marca é claro demais para levar texto branco ou ser usado como cor de texto.
2. **Botão principal sem estado:** sem hover e sem resposta ao clique.
3. **Status sem tokens:** verde, âmbar e laranja escritos à mão, só no admin.
4. **Estados vazios:** são uma frase solta (o "bloco de notas" que o gestor rejeitou).
5. **Tipografia e cards sem escala:** cada tela decide tamanhos, cards e raios.
6. **Marca desalinhada com a landing:** logo antiga no menu e fonte diferente (Geist no app, Inter na landing).

## Achados

### Cor e contraste

| # | Achado | Evidência | Grav. |
|---|---|---|---|
| C1 | **Botão principal com texto branco sobre o azul claro**: contraste de 2,0:1 (o mínimo AA é 4,5:1). Afeta o CTA mais importante de cada tela, como Iniciar consulta e Salvar. No escuro, o botão já usa texto escuro sobre o azul e passa com 8,7:1: a correção do claro pode seguir o escuro. | `--primary` L 0,76 com `--primary-foreground` L 0,98 (`globals.css`). `bg-primary` aparece 44 vezes. | **3** |
| C2 | **Azul claro usado como cor de texto**, com contraste de 2,1:1. A borda do checkbox também usa esse azul e fica abaixo do mínimo de 3:1. O token `--primary-ink` existe para isso, mas é pouco usado. | `text-primary`: 62 usos. `text-primary-ink`: 17. | **3** |
| C3 | **Não há tokens de status** (sucesso, atenção, erro suave, informação). Verde, âmbar e laranja são escritos à mão, quase todos no admin. Os selos da 2.0 (Atenção, Vacina atrasada, Sem valor) vão precisar deles. | Usos de cor fixa: `emerald` 54, `amber` 45, `orange` 26 (admin, menu lateral, vacinas). | 2 |
| C4 | **Tokens duplicados e conflitantes**: há dois blocos `:root` e dois `.dark`, e o segundo sobrescreve o primeiro. O fundo do app é branco (L 1), apesar do comentário "mesmo tom do menu" (L 0,985). | `globals.css` blocos 1 e 2 (separados por `---break---`) | 2 |
| C5 | **Cinzas de duas famílias**: `secondary` tem matiz 286 (frio, puxado para o roxo) e todo o resto é cinza neutro. | `--secondary`, `--secondary-foreground` | 1 |
| C6 | **Cores quebradas por `hsl()` em token oklch**: o placeholder do Tiptap e o contorno da variante `outline` do item de menu não recebem cor. 👁 | `globals.css`, regra `.ProseMirror`; `sidebar.tsx`, variante `outline` | 1 |
| C7 | **Tokens mortos da Agenda** (cerca de 60 linhas de `--agenda-*`), já que a tela saiu do produto. | `globals.css`, bloco "Agenda" | 1 |

### Marca

| # | Achado | Evidência | Grav. |
|---|---|---|---|
| M1 | **O app ainda usa a logo antiga** no menu lateral, enquanto a landing e os criativos já usam a nova (blocos FALA/PED, desde 17/09/2026). O médico chega pela landing e encontra outra marca no app. | `components/app-sidebar.tsx:66` usa `/full-logo.svg`. A horizontal nova (`public/falaped-logo-horizontal.svg`) é idêntica à da landing. | 2 |
| M2 | **A versão compacta da logo (ícone F/P) não está no app.** O menu recolhido durante a consulta (wireframe A5 e D1) precisa dela. | Existe em `falaped.com.br/logo/falaped-icon.svg`, mas não em `public/` | 1 |
| M3 | **Fonte do app diferente da landing**: o app usa Geist, a landing usa Inter. A logo usa Lexend Mega, mas convertida em desenho, então não conta como fonte de texto. Duas tipografias para o mesmo produto. A skill desaconselha a Inter por ser genérica, mas a coerência de marca pesa mais: **decisão do gestor na Etapa 2**. | `app/layout.tsx` (Geist) e o HTML da landing (Inter) | 2 |

### Tipografia

| # | Achado | Evidência | Grav. |
|---|---|---|---|
| T1 | **Duas fontes carregadas e só uma usada**: a Noto Sans vira `--font-sans`, mas o `body` usa a Geist. Custo de download sem efeito. | `app/layout.tsx:9`, `:36` | 1 |
| T2 | **Sem escala tipográfica definida**: o título da página tem 5 variações (`text-2xl`, `text-[26px]`, `text-[28px]`, `text-xl`) e o `CardTitle` também tem 5. Na prática, a hierarquia depende do `text-sm` (469 usos) e do `text-xs` (249). | `<h1>`: 32 iguais e 5 variantes. `CardTitle`: base, base semibold, lg, 2xl e xs uppercase. | 2 |
| T3 | **Rótulos em CAIXA ALTA espalhados** (61 usos em 12 arquivos): ficha, crescimento, encerramento, início. | `patient-clinical-overview.tsx`, `close-case-with-earnings-dialog.tsx`… | 1 |
| T4 | **`lang="en"`** em um app todo em PT-BR: hifenização, leitor de tela e corretor saem errados. | `app/layout.tsx:35` | 2 |
| T5 | **Títulos de aba**: só 10 das 42 páginas definem `metadata`. As outras mostram "@falaped - IA para pediatras" em todas as abas. | `grep metadata app/dashboard` | 1 |

### Componentes e estados

| # | Achado | Evidência | Grav. |
|---|---|---|---|
| S1 | **Botão principal sem hover**: o hover só vale quando o botão é um link (`[a]:hover`). Um `<button>` comum não reage ao mouse. Também não há resposta ao clique (`active:`). | `components/ui/button.tsx`, variante `default` | **3** |
| S2 | **Botão padrão baixo** (32 px, `h-8`), inclusive nos CTAs principais. No consultório, com pressa, um alvo pequeno gera clique errado. | `button.tsx`, tamanho `default` | 2 |
| S3 | **Estados vazios são uma frase solta**: "Nenhum caso ativo.", "Nenhum atestado gerado". Não há componente de vazio com ação ("Iniciar consulta", "Emitir atestado"). | 12+ textos "Nenhum…" e nenhum componente `Empty`. | 2 |
| S4 | **Cards sem sistema**: o card base usa anel de 10%, sem sombra e com `rounded-xl`, e cada tela soma sombra e raio por conta própria. Sombras de 6 tipos, raios de 7 tipos. Fica tudo no mesmo plano, sem diferenciar destaque, item comum e área de apoio. | `shadow-xs` 22 · `sm` 26 · `md` 11 · `lg` 7. `rounded-lg` 131 · `md` 96 · `full` 98 · `xl` 55 · `2xl` 15. | 2 |
| S5 | **Selos sem papel definido**: `secondary` (19) e `outline` (17) são usados ao acaso para status. O médico não aprende o que cada selo significa. | Variantes de `<Badge>` | 2 |
| S6 | **Altura calculada à mão** na área de atendimento e em listas (`h-[calc(100dvh-2rem)]`, `h-[calc(100svh-16rem)]`). Uma pequena mudança de layout corta o compositor (já apontado no diagnóstico do fluxo). | `new-case-workspace.tsx`, listas | 2 |
| S7 | **Gradiente da marca só como faixa** no topo do Perfil, e não no card inteiro, como foi aprovado no admin. | `profile-content.tsx:495` | 1 |
| S8 | **Páginas-hub com 3 cards iguais** (o layout mais genérico, segundo a skill). Já saem na 2.0 com o novo menu. | `section-hub.tsx` | 0 (já resolvido no fluxo) |

### Iconografia e outros

| # | Achado | Evidência | Grav. |
|---|---|---|---|
| I1 | Lucide em 148 arquivos, consistente. A skill sugere trocar, mas **manter**: a troca não traz ganho de uso e o shadcn depende do Lucide. | | 0 |
| I2 | **Ícone em "chip" azul sem regra**: `bg-primary/10` em um lugar, `/15` em outro, e às vezes `text-primary` (contraste baixo). | `profile-content.tsx:125`, `funil/[id]/page.tsx:236` | 1 |
| I3 | Restos do starter do Supabase (`hero.tsx`, `deploy-button.tsx`, `next-logo.tsx`, `supabase-logo.tsx`, `env-var-warning.tsx`), sem nenhum import: podem ser apagados. | `components/` | 0 |

## Encaixe no nicho (06/10/2026)

**Skills:** `ui-ux-pro-max` (busca no banco de tipos de produto, estilos, paletas e fontes) e `better-colors` (papel de cada cor, rampas e contraste). Contexto informado: SaaS clínico em que **o usuário é o pediatra**, uso diário no computador, telas com muita informação.

### O que o banco recomenda para saúde e o que vale para nós

| Tema | O banco diz (Healthcare / Medical Clinic) | Vale para o Falaped? |
|---|---|---|
| Estilo | Clínica: **Accessible & Ethical + Minimalism & Swiss Style** (indicado para "SaaS, ferramentas profissionais, dashboards"). App de paciente: Neumorphism e Claymorphism. | **Sim para o primeiro**, que é exatamente a base do shadcn: manter. **Não** para Neumorphism e Claymorphism, que são para apps de paciente e de criança e têm risco alto de acessibilidade. O nosso usuário é o médico. |
| Cor | "Azul médico calmo + branco de confiança + verde calmo". **Todas** as paletas de saúde usam **texto escuro sobre a cor principal** (`On Primary #000`). | **Sim.** O `#8AB4EB` é um azul médico calmo. O verde já existe para "vacina aplicada". O texto escuro sobre o azul confirma a **opção A** do botão (e o modo escuro já faz isso). |
| Fonte | Healthcare: **Lexend** (títulos) + Source Sans 3 (corpo), "desenhada para legibilidade". Alternativa de acessibilidade: Atkinson Hyperlegible. Nem Geist nem Inter aparecem para saúde. | A **Lexend** é da mesma família da Lexend Mega da logo: liga o app à marca. Ver as opções abaixo. |
| Neo-brutalismo | Indicado para "Gen Z, startups, apps estilo Notion"; não aparece para saúde. | **Fica na logo e no marketing.** No app, no máximo um toque (sombra dura) na ação principal ou no card da consulta aberta. |
| Densidade | Dashboards densos: linha de tabela de 36 px e texto de 12 a 14 px. Acessível: alvo de 44 px e texto de 16 px ou mais. | **Meio-termo:** listas densas (linha de 36 a 40 px, texto de 14 px) e ações principais com 40 px. É desktop com mouse, então os 44 px de toque não são obrigatórios. |

### Opções de fonte para a Etapa 2

| Opção | Títulos | Texto | A favor | Contra |
|---|---|---|---|---|
| 1 | Inter | Inter | Igual à landing, ótima em 13–14 px, números alinhados | A mais comum de todas (a skill de gosto desaconselha) |
| 2 | **Lexend** | **Inter** | Os títulos ecoam a logo (família Lexend) e o texto é igual à landing. Recomendada pelo banco para saúde. | Duas fontes para carregar |
| 3 | Geist | Geist | Já está no app, sem migração | Diferente da landing e sem ligação com a logo |

**Recomendação: opção 2.** Os títulos em Lexend dão a personalidade da marca e o texto em Inter mantém a coerência com a landing e a leitura densa.

### Cor: avaliação da `better-colors`

O azul da marca (L 0,76, C 0,09, matiz 255) fica no **meio-claro da rampa** (equivalente a um 300–400). O papel dele é **fundo de destaque, preenchimento e ícone**, nunca texto nem botão com texto branco. Hoje a rampa azul tem só dois degraus (0,76 e o `primary-ink`, 0,52) mais transparências (`/10`, `/15`). Faltam os degraus de fundo suave, contorno e hover.

**Rampas de status que o produto realmente mostra:**
- **Sucesso:** vacina aplicada, pagamento.
- **Atenção:** vacina atrasada e as pendências da 2.0.
- **Perigo:** alergia, erro e excluir.

**Informação** não precisa de rampa própria: o azul da marca cumpre esse papel.

| Gravidade | Local | Antes | Depois | Por quê |
|---|---|---|---|---|
| HIGH | `app/globals.css` (`--primary-foreground`), 44 botões | Texto 0,98 sobre o azul 0,76: **2,02:1** | Texto escuro (≈ 0,22) sobre o mesmo azul: 8,09:1 | Texto de controle abaixo de 4,5:1 |
| HIGH | 62 usos de `text-primary` | Azul 0,76 como texto: **2,14:1** | `text-primary-ink`: 5,52:1 | Token usado fora do papel (cor de preenchimento como texto) |
| MEDIUM | `components/ui/checkbox.tsx` | Borda azul 0,76: **2,14:1** | Degrau de contorno com 3:1 ou mais | Contorno de controle abaixo de 3:1 |
| MEDIUM | `globals.css` | Azul com 2 degraus + transparências | Rampa com papéis (fundo suave, contorno, preenchimento, hover, texto) | Cada papel sem token faz cada tela inventar o seu |
| MEDIUM | `patient-vaccine-calendar-section.tsx`, admin, `app-sidebar.tsx:93` | `emerald` (54), `amber` (45), `orange` (26) direto nos componentes | Tokens `success`, `warning` e `danger`, nos modos claro e escuro | Cor crua em componente, sem tema escuro |
| LOW | `patient-clinical-overview.tsx:53` e botões Excluir | O mesmo vermelho para **alergia** e para **excluir** | Excluir discreto (só texto), para a alergia ser o vermelho mais forte da tela | Uma cor, um sentido: o alerta clínico não pode competir com um botão |
| LOW | `app-sidebar.tsx:93` | Selo laranja a 20,6° do vermelho de erro | Usar o token de atenção | Duas cores quentes vizinhas confundem |

**Não verificado:** os pares desenhados sobre fundos transparentes (como `bg-primary/10` com texto) e as telas logadas. A medição foi feita a partir dos valores dos tokens, sem navegador logado.

**Veredito da `better-colors`: Block.** Os dois HIGH (botão e texto azul) precisam ser resolvidos na ficha de design antes de aplicar o visual novo.

## O que manter (não mexer)

- Uma fonte só no app (qual delas é decisão da Etapa 2).
- A logo nova, que já existe em `public/`.
- Um azul de marca só, com tokens em oklch.
- Cinzas neutros.
- `tabular-nums` nos números.
- Skeletons e `loading.tsx`.
- Telas de 404 e erro ilustradas (PR #74).
- `focus-visible` no `Button` (81 usos).
- Toasts com desfazer.
- Shadcn com `cva`.
- Lucide.

## O que a Etapa 2 (ficha de design) precisa definir

Em ordem de impacto, seguindo a ordem de correção sugerida pela skill:

0. **Marca** (M1–M3): fonte do app (recomendação: Lexend nos títulos e Inter no texto, ver "Encaixe no nicho"), logo nova no menu e a compacta no menu recolhido.
1. **Cor do botão principal e do texto azul** (C1, C2):
   - Texto escuro sobre o azul da marca (como o modo escuro já faz, e como todas as paletas de saúde do banco fazem; recomendada), **ou** um azul mais escuro para o botão, mantendo o `#8AB4EB` nos fundos, chips e gradiente.
   - `text-primary` vira `text-primary-ink` em todo lugar.
2. **Tokens de status** (C3, S5): sucesso, atenção, perigo e informação, cada um com fundo, contorno e texto, em claro e escuro. Selos com papéis fixos: status, alerta clínico (alergia), pendência e canal.
3. **Estados do botão** (S1, S2): hover, clique e desabilitado, e altura mínima de 36 a 40 px para as ações principais.
4. **Escala tipográfica** (T2, T3): 5 ou 6 degraus nomeados (título da página, título de seção, título de card, corpo, rótulo, legenda), com sentence case no lugar da caixa alta.
5. **Superfícies** (S4, S7): 3 níveis de card (destaque com gradiente no card inteiro, item comum, área de apoio), com uma escala de sombra e uma de raio.
6. **Estado vazio padrão** (S3): ilustração ou ícone, uma frase e a ação.
7. **Limpeza sem risco**, que pode entrar já na implementação:
   - Unificar os blocos de token (C4).
   - Cinzas de uma família só (C5).
   - Corrigir o placeholder do editor (C6).
   - Apagar os tokens da Agenda (C7).
   - Tirar a Noto Sans (T1).
   - `lang="pt-BR"` (T4).
   - Título nas abas (T5).

## Pontuação

Pela escala da `ux-heuristics` aplicada ao visual: **6/10**. Há três problemas de gravidade 3: o contraste do botão principal, o texto azul claro e o botão sem hover. Os três afetam a ação principal de todas as telas. Para chegar a 10, corrigir os itens 1 a 3 da lista acima (9/10) e depois a escala de tipografia e superfícies.
