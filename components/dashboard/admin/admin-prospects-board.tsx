"use client"

import * as React from "react"
import { format } from "date-fns"
import { toast } from "sonner"
import {
  AlarmClockIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  ExternalLinkIcon,
  MailIcon,
  MapPinIcon,
  MessageCircleIcon,
  PhoneIcon,
  SendIcon,
} from "lucide-react"

import { sendProspectInviteAction, updateProspectAction, type UpdateProspectInput } from "@/actions/admin"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { formatDateTime, formatRelativeTime } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import { buildInviteEmail, INVITE_TRIAL_DAYS } from "@/modules/admin/emails/invite-email"
import {
  FOLLOW_UP_DAYS,
  PROSPECT_STATUSES,
  type ContactChannel,
  type EmailStatus,
  type ProspectRow,
  type ProspectStatus,
} from "@/modules/admin/list-prospects"

const CHANNEL_LABEL: Record<ContactChannel, string> = { email: "e-mail", whatsapp: "WhatsApp", telefone: "telefone" }
const EMAIL_STATUS_LABEL: Record<EmailStatus, string> = {
  enviado: "enviado",
  entregue: "entregue",
  aberto: "abriu",
  clicou: "clicou",
  bounce: "voltou (bounce)",
  reclamou: "marcado como spam",
}

/** Toque vencido: tem data, já passou e o lead ainda está em jogo. */
const isDue = (r: ProspectRow) =>
  !!r.next_contact_at && new Date(r.next_contact_at) <= new Date() && r.status !== "fechou" && r.status !== "descartado"

/** Patch de um toque feito agora pelo canal: o próximo contato vence na cadência do canal. */
const touch = (channel: ContactChannel) => {
  const now = new Date()
  return {
    last_channel: channel,
    last_contact_at: now.toISOString(),
    next_contact_at: new Date(now.getTime() + FOLLOW_UP_DAYS[channel] * 86_400_000).toISOString(),
  }
}

const STATUS_META: Record<ProspectStatus, { label: string; plural: string; dot: string; pill: string }> = {
  novo: { label: "Novo", plural: "Novos", dot: "bg-muted-foreground", pill: "bg-muted text-muted-foreground" },
  contatado: { label: "Contatado", plural: "Contatados", dot: "bg-amber-500", pill: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  respondeu: { label: "Respondeu", plural: "Responderam", dot: "bg-emerald-500", pill: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  fechou: { label: "Fechou", plural: "Fecharam", dot: "bg-primary", pill: "bg-primary/15 text-primary" },
  descartado: { label: "Descartado", plural: "Descartados", dot: "bg-destructive", pill: "bg-destructive/10 text-destructive" },
}

type Sort = "prioridade" | "nome" | "cidade" | "atualizado"

const norm = (s: string | null | undefined) =>
  String(s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

/** Quem dá para convidar primeiro: e-mail vale mais que WhatsApp, que vale mais que fixo. */
const priority = (r: ProspectRow) =>
  (r.email ? 4 : 0) + (r.has_whatsapp ? 2 : 0) + (r.phone ? 1 : 0) + (r.crm ? 0.5 : 0)

const waLink = (r: ProspectRow) => {
  const m = (r.phone ?? "").match(/\((\d{2})\)\s?(9\d{4})-?(\d{4})/)
  return m ? `https://wa.me/55${m[1]}${m[2]}${m[3]}` : null
}

const initials = (name: string) =>
  norm(name)
    .replace(/^(dra?|prof)\.?\s+/, "")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !/^(de|da|do|dos|das)$/.test(w))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "?"

const selectClass =
  "h-8 rounded-md border border-input bg-background px-2 text-sm shadow-xs dark:bg-input/30"

export function AdminProspectsBoard({ prospects }: { prospects: ProspectRow[] }) {
  const [rows, setRows] = React.useState(prospects)
  const [query, setQuery] = React.useState("")
  const [city, setCity] = React.useState("")
  const [status, setStatus] = React.useState<ProspectStatus | "">("")
  const [onlyEmail, setOnlyEmail] = React.useState(false)
  const [onlyWa, setOnlyWa] = React.useState(false)
  const [onlyDue, setOnlyDue] = React.useState(false)
  /** "convidado" = qualquer um que recebeu convite; um EmailStatus = último evento do webhook. */
  const [emailFilter, setEmailFilter] = React.useState<EmailStatus | "convidado" | "">("")
  const [sort, setSort] = React.useState<Sort>("prioridade")
  const [selectedId, setSelectedId] = React.useState<string | null>(null)

  const patchRow = (row: ProspectRow) => setRows((prev) => prev.map((r) => (r.id === row.id ? row : r)))

  const cities = React.useMemo(() => {
    const count = new Map<string, number>()
    for (const r of rows) if (r.city) count.set(r.city, (count.get(r.city) ?? 0) + 1)
    return [...count.entries()].sort((a, b) => b[1] - a[1])
  }, [rows])

  const visible = React.useMemo(() => {
    const q = norm(query)
    const list = rows.filter(
      (r) =>
        (!city || r.city === city) &&
        (!status || r.status === status) &&
        (!onlyEmail || !!r.email) &&
        (!onlyWa || r.has_whatsapp) &&
        (!onlyDue || isDue(r)) &&
        (!emailFilter || (emailFilter === "convidado" ? r.invite_count > 0 : r.email_status === emailFilter)) &&
        (!q ||
          norm([r.full_name, r.clinic, r.city, r.address, r.crm, r.email, r.phone, r.notes].join(" ")).includes(q)),
    )
    const byName = (a: ProspectRow, b: ProspectRow) => norm(a.name).localeCompare(norm(b.name), "pt")
    const byCity = (a: ProspectRow, b: ProspectRow) => norm(a.city).localeCompare(norm(b.city), "pt")
    if (sort === "nome") return list.sort(byName)
    if (sort === "cidade") return list.sort((a, b) => byCity(a, b) || byName(a, b))
    if (sort === "atualizado") return list.sort((a, b) => b.updated_at.localeCompare(a.updated_at) || byName(a, b))
    return list.sort((a, b) => priority(b) - priority(a) || byCity(a, b) || byName(a, b))
  }, [rows, query, city, status, onlyEmail, onlyWa, onlyDue, emailFilter, sort])

  const selected = rows.find((r) => r.id === selectedId) ?? null
  const selectedIndex = selected ? visible.findIndex((r) => r.id === selected.id) : -1
  const countOf = (s: ProspectStatus) => rows.filter((r) => r.status === s).length
  const due = rows.filter(isDue).length
  const bounced = rows.filter((r) => r.email_status === "bounce" || r.email_status === "reclamou").length
  const signedUp = rows.filter((r) => r.profile).length
  const invited = rows.filter((r) => r.invite_count > 0).length
  const emailCount = (...statuses: EmailStatus[]) => rows.filter((r) => r.email_status && statuses.includes(r.email_status)).length

  return (
    <>
      <div className="grid gap-2 sm:grid-cols-4 lg:grid-cols-8">
        <FunnelTile
          active={status === "" && !onlyDue}
          label="Leads"
          value={rows.length}
          hint={`${rows.filter((r) => r.email).length} e-mail · ${rows.filter((r) => r.has_whatsapp).length} WhatsApp`}
          onClick={() => {
            setStatus("")
            setOnlyDue(false)
          }}
        />
        <FunnelTile
          active={onlyDue}
          label="A contatar"
          value={due}
          dot={due > 0 ? "bg-destructive" : "bg-muted-foreground"}
          hint={[bounced > 0 ? `${bounced} bounce` : null, signedUp > 0 ? `${signedUp} cadastrados` : null]
            .filter(Boolean)
            .join(" · ") || "toques vencidos"}
          onClick={() => setOnlyDue((v) => !v)}
        />
        <FunnelTile
          active={emailFilter === "convidado"}
          label="Convites"
          value={invited}
          hint={
            invited > 0
              ? `${emailCount("entregue", "aberto", "clicou")} entregues · ${emailCount("aberto", "clicou")} abriram · ${emailCount("clicou")} clicaram`
              : "nenhum enviado"
          }
          onClick={() => setEmailFilter((v) => (v === "convidado" ? "" : "convidado"))}
        />
        {PROSPECT_STATUSES.map((s) => (
          <FunnelTile
            key={s}
            active={status === s}
            label={STATUS_META[s].plural}
            value={countOf(s)}
            dot={STATUS_META[s].dot}
            onClick={() => setStatus(status === s ? "" : s)}
          />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar nome, clínica, e-mail, CRM…"
          className="h-8 w-full sm:w-64"
          aria-label="Buscar"
        />
        <select value={city} onChange={(e) => setCity(e.target.value)} className={selectClass} aria-label="Cidade">
          <option value="">Todas as cidades</option>
          {cities.map(([name, n]) => (
            <option key={name} value={name}>
              {name} ({n})
            </option>
          ))}
        </select>
        <Button
          type="button"
          size="sm"
          variant={onlyEmail ? "default" : "outline"}
          aria-pressed={onlyEmail}
          onClick={() => setOnlyEmail((v) => !v)}
        >
          <MailIcon aria-hidden /> Com e-mail
        </Button>
        <Button
          type="button"
          size="sm"
          variant={onlyWa ? "default" : "outline"}
          aria-pressed={onlyWa}
          onClick={() => setOnlyWa((v) => !v)}
        >
          <MessageCircleIcon aria-hidden /> Com WhatsApp
        </Button>
        <select
          value={emailFilter}
          onChange={(e) => setEmailFilter(e.target.value as EmailStatus | "convidado" | "")}
          className={selectClass}
          aria-label="Convite por e-mail"
        >
          <option value="">Convite: qualquer</option>
          <option value="convidado">Convidados</option>
          {(Object.keys(EMAIL_STATUS_LABEL) as EmailStatus[]).map((s) => (
            <option key={s} value={s}>
              Convite: {EMAIL_STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as Sort)} className={selectClass} aria-label="Ordenar">
          <option value="prioridade">Melhores primeiro</option>
          <option value="nome">Nome</option>
          <option value="cidade">Cidade</option>
          <option value="atualizado">Atualizados</option>
        </select>
        <span className="ml-auto text-xs text-muted-foreground">
          {visible.length} de {rows.length}
        </span>
      </div>

      {visible.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <p className="text-sm font-medium">Nenhum lead com esses filtros.</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {visible.map((r) => (
            <Card
              key={r.id}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedId(r.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  setSelectedId(r.id)
                }
              }}
              className={cn(
                "cursor-pointer gap-0 py-0 transition-all hover:bg-primary/5 hover:ring-2 hover:ring-primary",
                "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
              )}
            >
              <CardContent className="flex items-start gap-3 p-4">
                <div
                  className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary"
                  aria-hidden
                >
                  {initials(r.name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium leading-tight">{r.full_name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {[r.city, r.clinic].filter(Boolean).join(" · ")}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_META[r.status].pill)}>
                      {STATUS_META[r.status].label}
                    </span>
                    {r.email ? <Badge variant="outline">e-mail</Badge> : null}
                    {r.has_whatsapp ? <Badge variant="outline">WhatsApp</Badge> : null}
                    {r.invite_count > 0 ? (
                      <Badge variant="outline">
                        convite ×{r.invite_count}
                      </Badge>
                    ) : null}
                    {r.email_status === "bounce" || r.email_status === "reclamou" ? (
                      <Badge variant="destructive">{EMAIL_STATUS_LABEL[r.email_status]}</Badge>
                    ) : r.email_status === "aberto" || r.email_status === "clicou" ? (
                      <Badge variant="secondary">{EMAIL_STATUS_LABEL[r.email_status]}</Badge>
                    ) : null}
                    {r.profile ? (
                      <Badge variant={r.profile.status === "paid" ? "default" : "secondary"}>
                        {r.profile.status === "paid" ? "assinante" : "cadastrou"}
                      </Badge>
                    ) : null}
                  </div>
                </div>
                {isDue(r) ? (
                  <span className="flex shrink-0 items-center gap-1 text-xs whitespace-nowrap text-destructive">
                    <AlarmClockIcon className="size-3" aria-hidden /> vencido
                  </span>
                ) : r.last_contact_at ? (
                  <span className="shrink-0 text-xs whitespace-nowrap text-muted-foreground">
                    {formatRelativeTime(r.last_contact_at)}
                  </span>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          {selected ? (
            <ProspectDetail
              key={selected.id}
              row={selected}
              onPatched={patchRow}
              onPrev={selectedIndex > 0 ? () => setSelectedId(visible[selectedIndex - 1]!.id) : undefined}
              onNext={
                selectedIndex >= 0 && selectedIndex < visible.length - 1
                  ? () => setSelectedId(visible[selectedIndex + 1]!.id)
                  : undefined
              }
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  )
}

function FunnelTile({
  active,
  label,
  value,
  hint,
  dot,
  onClick,
}: {
  active: boolean
  label: string
  value: number
  hint?: string
  dot?: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex flex-col items-start gap-0.5 rounded-lg border bg-card px-3 py-2 text-left transition-colors hover:border-primary",
        active ? "border-primary bg-primary/5" : "border-border",
      )}
    >
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {dot ? <i className={cn("size-2 rounded-full", dot)} aria-hidden /> : null}
        {label}
      </span>
      <span className="text-lg font-semibold tabular-nums leading-tight">{value}</span>
      {hint ? <span className="text-[11px] text-muted-foreground">{hint}</span> : null}
    </button>
  )
}

function ProspectDetail({
  row,
  onPatched,
  onPrev,
  onNext,
}: {
  row: ProspectRow
  onPatched: (row: ProspectRow) => void
  onPrev?: () => void
  onNext?: () => void
}) {
  const [pending, startTransition] = React.useTransition()
  const [confirmInvite, setConfirmInvite] = React.useState(false)
  const wa = waLink(row)

  const save = (patch: UpdateProspectInput) =>
    startTransition(async () => {
      const result = await updateProspectAction(row.id, patch)
      if (result.ok) onPatched(result.prospect)
      else toast.error(result.error)
    })

  const saveField = (field: keyof UpdateProspectInput, value: string) => {
    if ((row[field as keyof ProspectRow] ?? "") === value) return
    save({ [field]: value })
  }

  const sendInvite = () =>
    startTransition(async () => {
      const result = await sendProspectInviteAction(row.id)
      if (result.ok) {
        onPatched(result.prospect)
        toast.success(`Convite enviado para ${row.email}`)
      } else toast.error(result.error)
    })

  const preview = row.email
    ? buildInviteEmail({ title: row.title, name: row.name, city: row.city, kind: row.kind, senderName: "…", replyTo: "" })
    : null

  return (
    <>
      <DialogHeader>
        <DialogTitle>{row.full_name}</DialogTitle>
        <DialogDescription className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span>{row.city ?? "sem cidade"}</span>
          <span>·</span>
          <span>{row.kind === "clínica" ? "clínica" : "pediatra"}</span>
          {row.sources.map((s) => (
            <Badge key={s} variant="outline">
              {s}
            </Badge>
          ))}
          {row.rating ? (
            <span>
              ★ {row.rating}
              {row.reviews ? ` (${row.reviews})` : ""}
            </span>
          ) : null}
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-wrap gap-2">
        {wa ? (
          <Button asChild size="sm" variant="outline">
            <a href={wa} target="_blank" rel="noreferrer">
              <MessageCircleIcon aria-hidden /> WhatsApp
            </a>
          </Button>
        ) : null}
        {row.profile_url ? (
          <Button asChild size="sm" variant="outline">
            <a href={row.profile_url} target="_blank" rel="noreferrer">
              <ExternalLinkIcon aria-hidden /> Doctoralia
            </a>
          </Button>
        ) : null}
        {row.map_url ? (
          <Button asChild size="sm" variant="outline">
            <a href={row.map_url} target="_blank" rel="noreferrer">
              <MapPinIcon aria-hidden /> Maps
            </a>
          </Button>
        ) : null}
        {row.website ? (
          <Button asChild size="sm" variant="outline">
            <a href={row.website} target="_blank" rel="noreferrer">
              <ExternalLinkIcon aria-hidden /> Site
            </a>
          </Button>
        ) : null}
        <div className="ml-auto flex gap-1">
          <Button type="button" size="icon-sm" variant="ghost" onClick={onPrev} disabled={!onPrev} aria-label="Anterior">
            <ChevronUpIcon />
          </Button>
          <Button type="button" size="icon-sm" variant="ghost" onClick={onNext} disabled={!onNext} aria-label="Próximo">
            <ChevronDownIcon />
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm">
            <p className="font-medium">Convite de {INVITE_TRIAL_DAYS} dias grátis</p>
            <p className="text-xs text-muted-foreground">
              {row.invited_at
                ? `Enviado ${row.invite_count}× · último em ${formatDateTime(row.invited_at)}${row.email_status ? ` · ${EMAIL_STATUS_LABEL[row.email_status]}` : ""}`
                : row.email
                  ? `Vai para ${row.email}`
                  : "Preencha o e-mail para convidar."}
            </p>
          </div>
          <Button type="button" size="sm" disabled={!row.email || pending} onClick={() => setConfirmInvite(true)}>
            <SendIcon aria-hidden /> {row.invited_at ? "Reenviar convite" : "Enviar convite"}
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm">
            <p className="font-medium">Toques</p>
            <p className="text-xs text-muted-foreground">
              {row.last_contact_at && row.last_channel
                ? `Último por ${CHANNEL_LABEL[row.last_channel]} ${formatRelativeTime(row.last_contact_at)}`
                : "Nenhum toque registrado."}
              {row.profile
                ? ` · cadastrou em ${formatDateTime(row.profile.created_at)} · ${row.profile.cases} consultas${row.profile.status === "paid" ? " · assinante" : ""}`
                : ""}
            </p>
          </div>
          <div className="flex gap-1.5">
            <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => save(touch("whatsapp"))}>
              <MessageCircleIcon aria-hidden /> Toquei no WhatsApp
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => save(touch("telefone"))}>
              <PhoneIcon aria-hidden /> Liguei
            </Button>
          </div>
        </div>
        <label className={cn("mt-3 flex items-center gap-2 text-xs", isDue(row) ? "text-destructive" : "text-muted-foreground")}>
          <AlarmClockIcon className="size-3.5" aria-hidden />
          Próximo contato
          <input
            type="date"
            value={row.next_contact_at ? format(new Date(row.next_contact_at), "yyyy-MM-dd") : ""}
            onChange={(e) =>
              save({ next_contact_at: e.target.value ? new Date(`${e.target.value}T09:00:00`).toISOString() : null })
            }
            disabled={pending}
            className={cn(selectClass, "text-foreground")}
            aria-label="Próximo contato"
          />
          {isDue(row) ? "vencido" : null}
        </label>
      </div>

      <div className="grid gap-3">
        <div>
          <p className="mb-1.5 text-xs uppercase tracking-wide text-muted-foreground">Status</p>
          <div className="flex flex-wrap gap-1.5">
            {PROSPECT_STATUSES.map((s) => (
              <Button
                key={s}
                type="button"
                size="sm"
                variant={row.status === s ? "default" : "outline"}
                aria-pressed={row.status === s}
                disabled={pending}
                onClick={() => row.status !== s && save({ status: s })}
              >
                <i className={cn("size-2 rounded-full", STATUS_META[s].dot)} aria-hidden />
                {STATUS_META[s].label}
              </Button>
            ))}
          </div>
        </div>

        <Field label="E-mail">
          <Input
            type="email"
            defaultValue={row.email ?? ""}
            onBlur={(e) => saveField("email", e.target.value.trim())}
            placeholder="—"
            className="h-8 font-mono text-xs"
          />
          {row.site_emails.filter((e) => e !== row.email).length > 0 ? (
            <p className="mt-1 flex flex-wrap gap-x-2 text-xs text-muted-foreground">
              no site:
              {row.site_emails
                .filter((e) => e !== row.email)
                .map((e) => (
                  <button key={e} type="button" className="underline" onClick={() => save({ email: e })}>
                    {e}
                  </button>
                ))}
            </p>
          ) : null}
        </Field>
        <Field label="Telefone" hint={row.has_whatsapp ? "celular, provável WhatsApp" : undefined}>
          <Input
            defaultValue={row.phone ?? ""}
            onBlur={(e) => saveField("phone", e.target.value.trim())}
            placeholder="—"
            className="h-8 font-mono text-xs"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="CRM">
            <Input
              defaultValue={row.crm ?? ""}
              onBlur={(e) => saveField("crm", e.target.value.trim())}
              placeholder="—"
              className="h-8 font-mono text-xs"
            />
          </Field>
          <Field label="Clínica">
            <Input
              defaultValue={row.clinic ?? ""}
              onBlur={(e) => saveField("clinic", e.target.value.trim())}
              placeholder="—"
              className="h-8 text-xs"
            />
          </Field>
        </div>
        <Field label="Endereço">
          <p className="text-sm">{row.address || "—"}</p>
        </Field>
        <Field label="Notas">
          <Textarea
            defaultValue={row.notes}
            onBlur={(e) => saveField("notes", e.target.value)}
            placeholder="Como foi o contato, quem atendeu, quando retornar…"
            rows={3}
          />
        </Field>
        <p className="text-xs text-muted-foreground">
          {pending ? "Salvando…" : `Atualizado em ${formatDateTime(row.updated_at)}`}
          {row.price ? ` · consulta ${row.price}` : ""}
        </p>
      </div>

      <AlertDialog open={confirmInvite} onOpenChange={setConfirmInvite}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Enviar convite para {row.email}?</AlertDialogTitle>
            <AlertDialogDescription>
              Assunto: “{preview?.subject}”. O e-mail sai pela Resend em seu nome, com {INVITE_TRIAL_DAYS} dias
              grátis, preço e desconto por fechar vindo do convite, e pedido de resposta. O próximo contato fica
              para daqui a {FOLLOW_UP_DAYS.email} dias. {row.status === "novo" ? "O status passa para Contatado." : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={sendInvite}>Enviar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
        {label}
        {hint ? <span className="ml-2 normal-case tracking-normal">{hint}</span> : null}
      </p>
      {children}
    </div>
  )
}
