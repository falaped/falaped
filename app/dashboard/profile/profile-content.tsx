"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { useForm, type UseFormReturn } from "react-hook-form"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import {
  BadgeCheckIcon,
  CameraIcon,
  EyeIcon,
  ImageIcon,
  ImagePlusIcon,
  LayoutTemplateIcon,
  Loader2Icon,
  MapPinIcon,
  MessageCircleIcon,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  clearProfileLogoAction,
  deleteMyAccountAction,
  unlinkWhatsAppAction,
  updateProfileAction,
  uploadProfileLogoAction,
} from "@/actions"
import { FieldShell, FormCard, SectionNav, joinPtBr } from "@/components/dashboard/form-layout"
import { SegmentedToggle } from "@/components/segmented-toggle"
import { isInTrial } from "@/lib/account-status"
import { formatDate, formatLinkedPhone } from "@/lib/formatters"
import { cn } from "@/lib/utils"
import type { AuthenticatedUserResult } from "@/modules/supabase/get-authenticated-user"
import type { ReportTemplateOption } from "@/modules/report-templates/get-report-templates-by-profile-id"
import { z } from "zod"
import {
  updateProfileSchema,
  type UpdateProfileFormValues,
} from "@/lib/schemas/profile"
import { formatCentsToInputValue } from "@/lib/money"
import { ProcedureCatalogCard } from "@/components/dashboard/profile/procedure-catalog-card"
import type { ProcedureCatalogItemOption } from "@/modules/procedure-catalog/list-procedure-catalog-items"

const THEME_OPTIONS: { value: "light" | "dark" | "system"; label: string }[] = [
  { value: "light", label: "Claro" },
  { value: "dark", label: "Escuro" },
  { value: "system", label: "Igual ao sistema" },
]

/** Nome de cada campo na barra de salvar ("Você alterou CRM e cidade"). */
const FIELD_LABELS: Partial<Record<keyof UpdateProfileFormValues, string>> = {
  first_name: "nome",
  surname: "sobrenome",
  crm: "CRM",
  rqe: "RQE",
  default_location_city: "cidade",
  default_location_state: "estado",
  social_media_handle: "Instagram",
  website: "site",
  report_template_id: "modelo de relatório",
  consultation_price_cents: "valor da consulta",
}

/** Espelho das regras de `uploadProfileLogo`, para validar antes do upload. */
const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"]
const LOGO_MAX_BYTES = 2 * 1024 * 1024

/** Sentinel for "no template" in Select (Radix does not allow value=""). */
const REPORT_TEMPLATE_NONE_VALUE = "__none__"

type LogoKind = "full" | "short"
type ProfileForm = UseFormReturn<UpdateProfileFormValues>

type ProfileContentProps = AuthenticatedUserResult & {
  reportTemplateOptions: ReportTemplateOption[]
  procedureCatalogItems: ProcedureCatalogItemOption[]
}

/** Situação da conta a partir do status já resolvido pelo trial. */
function planInfo(
  status: string | null | undefined,
  trialEndsAt: string | null | undefined,
): { badge: string; tone: "default" | "secondary" | "destructive"; text: string; trial: boolean } {
  if (status === "blocked")
    return { badge: "Bloqueada", tone: "destructive", trial: false, text: "Sua conta está bloqueada. Fale com a gente para entender o que aconteceu." }
  if (status === "paid" && isInTrial(trialEndsAt))
    return { badge: "Teste grátis", tone: "secondary", trial: true, text: `Você usa tudo do Falaped até ${formatDate(trialEndsAt)}. Antes disso a gente conversa sobre o plano.` }
  if (status === "paid")
    return { badge: "Assinante", tone: "default", trial: false, text: "Sua assinatura está ativa. Obrigado por usar o Falaped." }
  if (trialEndsAt)
    return { badge: "Teste encerrado", tone: "destructive", trial: false, text: `Seu teste grátis terminou em ${formatDate(trialEndsAt)}. Fale com a gente para continuar usando.` }
  return { badge: "Sem acesso", tone: "destructive", trial: false, text: "Seu acesso ainda não foi liberado. Fale com a gente." }
}

function initials(first: string, last: string): string {
  return `${first.trim()[0] ?? ""}${last.trim()[0] ?? ""}`.toUpperCase() || "?"
}

const OPTIONAL = <span className="font-normal text-subtle-foreground">(opcional)</span>

const SECTIONS = [
  { id: "dados", title: "Dados profissionais" },
  { id: "marca", title: "Sua marca nos documentos" },
  { id: "relatorio", title: "Relatório da consulta" },
  { id: "valores", title: "Valores e procedimentos" },
  { id: "whatsapp", title: "WhatsApp" },
  { id: "aparencia", title: "Aparência" },
  { id: "conta", title: "Plano e conta" },
]

/** Campo de texto ligado ao form do perfil: rótulo, ajuda e erro no padrão do guia. */
function TextField({
  form,
  name,
  label,
  placeholder,
  help,
  type = "text",
  inputMode,
  className,
}: {
  form: ProfileForm
  name: keyof UpdateProfileFormValues
  label: React.ReactNode
  placeholder?: string
  help?: React.ReactNode
  type?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]
  className?: string
}) {
  const error = form.formState.errors[name]?.message
  return (
    <FieldShell htmlFor={name} label={label} help={help} error={error} className={className}>
      <Input
        id={name}
        type={type}
        inputMode={inputMode}
        autoComplete="off"
        placeholder={placeholder}
        aria-invalid={!!error}
        {...form.register(name)}
      />
    </FieldShell>
  )
}

/** Um espaço de logo (protótipo d4): a logo num quadro, Trocar e Remover ao lado. */
function LogoSlot({
  title,
  help,
  url,
  uploading,
  removing,
  error,
  onPick,
  onRemove,
}: {
  title: React.ReactNode
  help: string
  url: string | null
  uploading: boolean
  removing: boolean
  error: string | null
  onPick: () => void
  onRemove: () => void
}) {
  const busy = uploading || removing
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-label font-medium">{title}</span>
      {url ? (
        <div className="relative flex h-28 items-center gap-4 rounded-xl border border-border px-4">
          <div className="grid h-16 flex-1 place-items-center overflow-hidden rounded-lg bg-white">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt="" className="max-h-14 w-auto object-contain" />
          </div>
          <div className="flex flex-col gap-1">
            <Button type="button" variant="outline" size="xs" disabled={busy} onClick={onPick}>
              Trocar
            </Button>
            <Button type="button" variant="ghost" size="xs" className="text-danger-text" disabled={busy} onClick={onRemove}>
              Remover
            </Button>
          </div>
          {busy ? (
            <span className="absolute inset-0 flex items-center justify-center gap-2 rounded-xl bg-background/80 font-medium">
              <Loader2Icon className="size-4 animate-spin" />
              {uploading ? "Enviando…" : "Removendo…"}
            </span>
          ) : null}
        </div>
      ) : (
        <button
          type="button"
          onClick={onPick}
          disabled={busy}
          className="flex h-28 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border-strong text-muted-foreground hover:bg-accent hover:text-foreground disabled:cursor-wait"
        >
          {busy ? <Loader2Icon className="size-5 animate-spin" /> : <ImagePlusIcon className="size-5" />}
          <span className="font-medium">{busy ? "Enviando…" : "Clique para enviar"}</span>
          <span className="text-caption text-subtle-foreground">PNG, JPEG ou WebP até 2 MB</span>
        </button>
      )}
      {error ? (
        <span role="alert" className="text-caption text-danger-text">
          {error}
        </span>
      ) : (
        <span className="text-caption text-subtle-foreground">{help}</span>
      )}
    </div>
  )
}

export function ProfileContent({
  profile,
  reportTemplateOptions,
  procedureCatalogItems,
}: ProfileContentProps) {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)
  const [unlinking, setUnlinking] = useState(false)

  const [logoUploading, setLogoUploading] = useState<LogoKind | null>(null)
  const [logoRemoving, setLogoRemoving] = useState<LogoKind | null>(null)
  const [logoError, setLogoError] = useState<Record<LogoKind, string | null>>({ full: null, short: null })
  // O que mostrar até o refresh trazer a URL nova: prévia local no upload, `null` na
  // remoção. `undefined` = usar a URL que veio do servidor.
  const [logoOverride, setLogoOverride] = useState<Record<LogoKind, string | null | undefined>>({
    full: undefined,
    short: undefined,
  })
  const [serverLogos, setServerLogos] = useState({ full: profile.logo_url_full, short: profile.logo_url_short })
  if (serverLogos.full !== profile.logo_url_full || serverLogos.short !== profile.logo_url_short) {
    setServerLogos({ full: profile.logo_url_full, short: profile.logo_url_short })
    setLogoOverride({ full: undefined, short: undefined })
  }
  const logoUrl = (kind: LogoKind): string | null => {
    const override = logoOverride[kind]
    if (override !== undefined) return override
    return (kind === "full" ? profile.logo_url_full : profile.logo_url_short) ?? null
  }

  const fullInputRef = useRef<HTMLInputElement>(null)
  const shortInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  const form = useForm<UpdateProfileFormValues>({
    defaultValues: {
      first_name: profile.first_name ?? "",
      surname: profile.surname ?? "",
      email: profile.email ?? "",
      crm: profile.crm ?? "",
      rqe: profile.rqe ?? "",
      social_media_handle: profile.social_media_handle ?? "",
      website: profile.website ?? "",
      report_template_id: profile.report_template_id ?? "",
      default_location_state: profile.default_location_state ?? "",
      default_location_city: profile.default_location_city ?? "",
      // Nulo abre o campo VAZIO — nunca com zero, que seria submetido por inércia.
      consultation_price_cents: formatCentsToInputValue(
        profile.consultation_price_cents
      ),
    },
  })
  const { isDirty, isSubmitting } = form.formState

  const firstName = form.watch("first_name") ?? ""
  const surname = form.watch("surname") ?? ""
  const crm = form.watch("crm") ?? ""
  const rqe = form.watch("rqe") ?? ""
  const city = form.watch("default_location_city") ?? ""
  const state = form.watch("default_location_state") ?? ""
  const fullName = `${firstName} ${surname}`.trim()
  const place = city && state ? `${city} - ${state}` : city || state
  const plan = planInfo(profile.status, profile.trial_ends_at)
  const shortLogo = logoUrl("short")
  const fullLogo = logoUrl("full")

  async function handleUseGeolocation() {
    if (!navigator.geolocation) {
      toast.error("Seu navegador não permite usar a localização. Preencha à mão.")
      return
    }
    setGeoLoading(true)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&addressdetails=1`,
            { headers: { "Accept-Language": "pt-BR", "User-Agent": "FalapedApp/1.0" } },
          )
          if (!res.ok) throw new Error("Falha ao obter endereço.")
          const data = (await res.json()) as {
            address?: {
              state?: string
              city?: string
              town?: string
              village?: string
              municipality?: string
            }
          }
          const foundState = data.address?.state?.trim()
          const foundCity =
            data.address?.city?.trim() ||
            data.address?.town?.trim() ||
            data.address?.village?.trim() ||
            data.address?.municipality?.trim()
          if (foundState) form.setValue("default_location_state", foundState, { shouldDirty: true })
          if (foundCity) form.setValue("default_location_city", foundCity, { shouldDirty: true })
          if (foundState || foundCity) toast.success("Cidade e estado preenchidos. Confira e salve.")
          else toast.error("Não conseguimos identificar a cidade. Preencha à mão.")
        } catch {
          toast.error("Não conseguimos buscar o endereço agora. Preencha à mão.")
        } finally {
          setGeoLoading(false)
        }
      },
      () => {
        setGeoLoading(false)
        toast.error("Sem permissão para usar a localização. Preencha à mão.")
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }

  async function handleProfileSubmit(data: UpdateProfileFormValues) {
    setProfileError(null)
    const parsed = updateProfileSchema.safeParse(data)
    if (!parsed.success) {
      const fieldErrors = z.flattenError(parsed.error).fieldErrors
        ; (Object.keys(fieldErrors) as (keyof UpdateProfileFormValues)[]).forEach(
          (key) => {
            const msg = fieldErrors[key]?.[0]
            if (msg) form.setError(key, { type: "manual", message: msg })
          }
        )
      toast.error("Confira os campos destacados em vermelho.")
      return
    }
    // Sobe o valor CRU do form: o action re-valida e é a fonte da verdade. Enviar
    // `parsed.data` parseava duas vezes e qualquer campo em branco (transformado em
    // `undefined`) fazia o action reprovar com "Dados inválidos.".
    const result = await updateProfileAction(data)
    if (result.ok) {
      form.reset(data)
      toast.success("Alterações salvas.")
      router.refresh()
      return
    }
    const message = getFriendlyToastMessage(result.error)
    setProfileError(message)
    toast.error(message)
  }

  async function handleLogoChange(kind: LogoKind, e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    const label = kind === "full" ? "Logo completa" : "Logo curta"
    const fail = (message: string) => {
      setLogoError((prev) => ({ ...prev, [kind]: message }))
      toast.error(`${label}: ${message}`)
    }
    setLogoError((prev) => ({ ...prev, [kind]: null }))
    // Mesmas regras do servidor, checadas antes de enviar para o erro ser imediato e claro.
    if (!LOGO_TYPES.includes(file.type)) {
      fail(`use PNG, JPEG ou WebP. O arquivo escolhido é ${file.type || "de outro tipo"}.`)
      return
    }
    if (file.size > LOGO_MAX_BYTES) {
      fail(`o arquivo tem ${(file.size / 1024 / 1024).toFixed(1).replace(".", ",")} MB e o máximo é 2 MB.`)
      return
    }
    setLogoUploading(kind)
    try {
      const formData = new FormData()
      formData.set("kind", kind)
      formData.set("file", file)
      const result = await uploadProfileLogoAction(formData)
      if (result.ok) {
        setLogoOverride((prev) => ({ ...prev, [kind]: URL.createObjectURL(file) }))
        toast.success(`${label} atualizada.`)
        router.refresh()
      } else {
        fail(getFriendlyToastMessage(result.error))
      }
    } catch {
      fail("não conseguimos enviar agora. Tente de novo.")
    } finally {
      setLogoUploading(null)
    }
  }

  async function handleClearLogo(kind: LogoKind) {
    const label = kind === "full" ? "Logo completa" : "Logo curta"
    setLogoError((prev) => ({ ...prev, [kind]: null }))
    setLogoRemoving(kind)
    try {
      const result = await clearProfileLogoAction(kind)
      if (result.ok) {
        setLogoOverride((prev) => ({ ...prev, [kind]: null }))
        toast.success(`${label} removida.`)
        router.refresh()
        return
      }
      const message = getFriendlyToastMessage(result.error)
      setLogoError((prev) => ({ ...prev, [kind]: message }))
      toast.error(message)
    } finally {
      setLogoRemoving(null)
    }
  }

  async function handleUnlinkWhatsApp() {
    setUnlinking(true)
    try {
      const result = await unlinkWhatsAppAction()
      if (!result.ok) {
        toast.error(getFriendlyToastMessage(result.error))
        return
      }
      toast.success("WhatsApp desvinculado.")
      router.refresh()
    } finally {
      setUnlinking(false)
    }
  }

  async function handleConfirmDelete() {
    setDeleteError(null)
    setDeleteLoading(true)
    try {
      const result = await deleteMyAccountAction()
      if (result.ok) {
        window.location.href = "/auth/login"
        return
      }
      const message = getFriendlyToastMessage(result.error)
      setDeleteError(message)
      toast.error(message)
    } finally {
      setDeleteLoading(false)
    }
  }

  const changed = (Object.keys(form.formState.dirtyFields) as (keyof UpdateProfileFormValues)[])
    .map((key) => FIELD_LABELS[key])
    .filter((label): label is string => !!label)
  const errorLabel = (Object.keys(form.formState.errors) as (keyof UpdateProfileFormValues)[])
    .map((key) => FIELD_LABELS[key])
    .find(Boolean)
  const sectionErrors: Record<string, (keyof UpdateProfileFormValues)[]> = {
    dados: ["first_name", "surname", "crm", "rqe", "default_location_city", "default_location_state", "social_media_handle", "website"],
    relatorio: ["report_template_id"],
    valores: ["consultation_price_cents"],
  }

  return (
    <form onSubmit={form.handleSubmit(handleProfileSubmit)} noValidate className="flex w-full max-w-[1440px] flex-col">
      <input
        ref={fullInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => handleLogoChange("full", e)}
      />
      <input
        ref={shortInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => handleLogoChange("short", e)}
      />

      {/* Quem você é para as famílias: o que sai nos documentos, num relance. */}
      <section className="flex flex-wrap items-center gap-5 rounded-xl border border-primary-soft-border bg-highlight p-6 shadow-sm">
        <span className="relative">
          <span className="grid size-20 place-items-center overflow-hidden rounded-full bg-primary-soft font-display text-page font-semibold text-primary-ink-strong">
            {shortLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={shortLogo} alt="" className="size-full bg-white object-contain p-2" />
            ) : (
              initials(firstName, surname)
            )}
          </span>
          <button
            type="button"
            onClick={() => shortInputRef.current?.click()}
            className="absolute -right-1 -bottom-1 grid size-8 place-items-center rounded-full border border-border bg-card shadow-xs hover:bg-accent"
            aria-label={shortLogo ? "Trocar logo curta" : "Enviar logo curta"}
          >
            <CameraIcon className="size-4" />
          </button>
        </span>
        <div className="min-w-0">
          <h1 className="font-display text-page font-semibold">{fullName || "Seu nome"}</h1>
          <div className="mt-1 text-muted-foreground">
            {["Pediatria", crm ? `CRM ${crm}` : null, rqe ? `RQE ${rqe}` : null, place || null]
              .filter(Boolean)
              .map((part, index) => (
                <span key={index} className={index ? "num" : undefined}>
                  {index ? " · " : ""}
                  {part}
                </span>
              ))}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <Badge variant={plan.trial ? "warning" : plan.tone === "default" ? "success" : plan.tone}>
              {plan.tone === "default" ? <BadgeCheckIcon aria-hidden /> : null}
              {plan.badge}
            </Badge>
            {plan.trial ? (
              <span className="text-caption text-subtle-foreground num">até {formatDate(profile.trial_ends_at)}</span>
            ) : null}
          </div>
        </div>
        <Button type="button" variant="outline" className="ml-auto" asChild>
          <a href="#marca">
            <EyeIcon data-icon="inline-start" />
            Ver como sai no documento
          </a>
        </Button>
      </section>

      <div className="mt-6 grid grid-cols-[220px_minmax(0,880px)] items-start gap-8 pb-24">
        <SectionNav
          label="Seções do perfil"
          sections={SECTIONS.map((section) => ({
            ...section,
            hasError: (sectionErrors[section.id] ?? []).some((key) => form.formState.errors[key]),
          }))}
        />

        <div className="flex flex-col gap-6">
          <FormCard id="dados" title="Dados profissionais" description="Saem em todo documento que você emite.">
            <div className="grid grid-cols-2 gap-4">
              <TextField form={form} name="first_name" label="Nome" placeholder="Ex.: Mariana" />
              <TextField form={form} name="surname" label="Sobrenome" placeholder="Ex.: Souza Lima" />
              <TextField form={form} name="crm" label="CRM" placeholder="Ex.: 12345 MG" help="Número e estado, como no carimbo." />
              <TextField form={form} name="rqe" label={<>RQE {OPTIONAL}</>} placeholder="Ex.: 6789" help="Registro de especialista." />
              <TextField form={form} name="default_location_city" label="Cidade" placeholder="Ex.: Belo Horizonte" help="Sai junto da data nos documentos." />
              <TextField
                form={form}
                name="default_location_state"
                label="Estado"
                placeholder="Ex.: Minas Gerais"
                help={
                  <button
                    type="button"
                    onClick={handleUseGeolocation}
                    disabled={geoLoading}
                    className="inline-flex items-center gap-1 text-primary-ink hover:underline disabled:opacity-60"
                  >
                    {geoLoading ? <Loader2Icon className="size-3 animate-spin" /> : <MapPinIcon className="size-3" />}
                    {geoLoading ? "Buscando…" : "Usar minha localização"}
                  </button>
                }
              />
              <TextField form={form} name="social_media_handle" label={<>Instagram {OPTIONAL}</>} placeholder="Ex.: @dra.mariana" />
              <TextField form={form} name="website" label={<>Site {OPTIONAL}</>} type="url" placeholder="https://…" />
            </div>
          </FormCard>

          <FormCard id="marca" title="Sua marca nos documentos" description="A logo entra no cabeçalho de receitas, atestados, pedidos de exame, encaminhamentos e relatórios.">
            <div className="grid grid-cols-2 gap-4">
              <LogoSlot
                title="Logo completa"
                help="Horizontal, de preferência com fundo transparente."
                url={fullLogo}
                uploading={logoUploading === "full"}
                removing={logoRemoving === "full"}
                error={logoError.full}
                onPick={() => fullInputRef.current?.click()}
                onRemove={() => handleClearLogo("full")}
              />
              <LogoSlot
                title={<>Logo curta {OPTIONAL}</>}
                help="Quadrada: o símbolo ou as iniciais. Aparece no menu do Falaped."
                url={shortLogo}
                uploading={logoUploading === "short"}
                removing={logoRemoving === "short"}
                error={logoError.short}
                onPick={() => shortInputRef.current?.click()}
                onRemove={() => handleClearLogo("short")}
              />
            </div>
            <div>
              <div className="mb-2 flex items-center gap-2 text-label font-medium">
                Prévia do cabeçalho
                <Badge variant="secondary">ao vivo</Badge>
              </div>
              {/* Papel é sempre branco, também no tema escuro. */}
              <div className="rounded-xl border border-border bg-white p-6 text-neutral-800 shadow-sm">
                <div className="flex items-center gap-4 border-b border-neutral-200 pb-4">
                  {fullLogo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={fullLogo} alt="" className="max-h-12 max-w-[45%] object-contain" />
                  ) : (
                    <span className="flex items-center gap-1.5 text-caption text-neutral-400">
                      <ImageIcon className="size-4" aria-hidden />
                      Sem logo
                    </span>
                  )}
                  <div className="ml-auto text-right text-[12px] leading-5">
                    <div className="font-semibold">{fullName || "Seu nome"}</div>
                    <div className="text-neutral-500">
                      {["Pediatra", crm ? `CRM ${crm}` : null, rqe ? `RQE ${rqe}` : null].filter(Boolean).join(" · ")}
                    </div>
                    <div className="text-neutral-500">
                      {[place || null, form.watch("social_media_handle") || null].filter(Boolean).join(" · ") || "Cidade, estado"}
                    </div>
                  </div>
                </div>
                <div className="mt-4 space-y-2" aria-hidden>
                  <div className="h-2 w-1/3 rounded bg-neutral-200" />
                  <div className="h-2 w-5/6 rounded bg-neutral-100" />
                  <div className="h-2 w-2/3 rounded bg-neutral-100" />
                </div>
              </div>
              <p className="mt-2 text-caption text-subtle-foreground">
                Uma aproximação: a posição de cada item muda um pouco entre os tipos de documento.
              </p>
            </div>
          </FormCard>

          <FormCard id="relatorio" title="Relatório da consulta" description="As seções e a ordem que o assistente segue quando você pede o relatório.">
            <div className="grid grid-cols-2 items-start gap-4">
              <FieldShell htmlFor="report_template_id" label="Modelo usado" error={form.formState.errors.report_template_id?.message}>
                <Select
                  value={(form.watch("report_template_id") as string) || REPORT_TEMPLATE_NONE_VALUE}
                  onValueChange={(v) =>
                    form.setValue("report_template_id", v === REPORT_TEMPLATE_NONE_VALUE ? "" : v, { shouldDirty: true })
                  }
                >
                  <SelectTrigger id="report_template_id" className="w-full">
                    <SelectValue placeholder="Modelo padrão do Falaped" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={REPORT_TEMPLATE_NONE_VALUE}>Modelo padrão do Falaped</SelectItem>
                    {reportTemplateOptions.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                        {t.is_default ? " (padrão)" : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldShell>
              <Button type="button" variant="link" size="sm" className="mt-7 justify-self-start" asChild>
                <Link href="/dashboard/report-templates">
                  <LayoutTemplateIcon data-icon="inline-start" />
                  Ver meus modelos
                </Link>
              </Button>
            </div>
          </FormCard>

          <FormCard id="valores" title="Valores e procedimentos" description="Preenchem a cobrança ao encerrar a consulta.">
            <div className="grid grid-cols-2 gap-4">
              <TextField
                form={form}
                name="consultation_price_cents"
                label="Valor da consulta"
                placeholder="Ex.: 250,00"
                inputMode="decimal"
                help="Deixe em branco se cada consulta tem um valor diferente."
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-label font-medium">Procedimentos</span>
              <ProcedureCatalogCard items={procedureCatalogItems} />
              <span className="text-caption text-subtle-foreground">Cada procedimento é salvo na hora, sem o botão de salvar.</span>
            </div>
          </FormCard>

          <FormCard id="whatsapp" title="WhatsApp" description="Use o assistente do Falaped pelo seu WhatsApp.">
            {profile.phone ? (
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-success-soft text-success-text">
                  <MessageCircleIcon className="size-5" aria-hidden />
                </span>
                <div className="flex-1">
                  <div className="font-medium num">{formatLinkedPhone(profile.phone)}</div>
                  {profile.whatsapp_linked_at ? (
                    <div className="text-caption text-subtle-foreground num">Vinculado em {formatDate(profile.whatsapp_linked_at)}</div>
                  ) : null}
                </div>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button type="button" variant="ghost" size="sm" className="text-danger-text">
                      Desvincular
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="max-w-md">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Desvincular o WhatsApp?</AlertDialogTitle>
                      <AlertDialogDescription>
                        O assistente para de responder neste número. Para usar de novo, é só vincular outra vez.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={unlinking}>Cancelar</AlertDialogCancel>
                      <Button type="button" variant="destructive" disabled={unlinking} onClick={handleUnlinkWhatsApp}>
                        {unlinking ? "Desvinculando…" : "Desvincular"}
                      </Button>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
                  <MessageCircleIcon className="size-5" aria-hidden />
                </span>
                <p className="flex-1 text-muted-foreground">Nenhum número vinculado.</p>
                <Button type="button" variant="outline" size="sm" asChild>
                  <Link href="/dashboard/link-whatsapp">Vincular WhatsApp</Link>
                </Button>
              </div>
            )}
          </FormCard>

          <FormCard id="aparencia" title="Aparência" description="Só muda o app neste aparelho, não os documentos.">
            <div className="flex flex-col gap-1.5">
              <span className="text-label font-medium">Tema</span>
              <div role="radiogroup" aria-label="Tema" className="flex flex-wrap gap-1.5">
                {THEME_OPTIONS.map((opt) => (
                  <SegmentedToggle
                    key={opt.value}
                    active={mounted && theme === opt.value}
                    onClick={() => setTheme(opt.value)}
                  >
                    {opt.label}
                  </SegmentedToggle>
                ))}
              </div>
            </div>
          </FormCard>

          <FormCard id="conta" title="Plano e conta" description="Seu acesso, seu plano e a exclusão da conta.">
            <div className="grid grid-cols-2 gap-4">
              <FieldShell
                htmlFor="email"
                label="E-mail de acesso"
                help="É o seu login. Para trocar, escreva para contato@falaped.com.br."
              >
                <Input id="email" type="email" disabled {...form.register("email")} />
              </FieldShell>
              <div className="flex flex-col gap-1.5">
                <span className="text-label font-medium">Plano</span>
                <div className="flex h-9 items-center gap-2">
                  <Badge variant={plan.trial ? "warning" : plan.tone === "default" ? "success" : plan.tone}>{plan.badge}</Badge>
                </div>
                <span className="text-caption text-subtle-foreground">{plan.text}</span>
              </div>
            </div>
            <div className="flex items-center gap-2 border-t border-border pt-4">
              <Button type="button" variant="outline" size="sm" asChild>
                <a href="mailto:contato@falaped.com.br?subject=Plano%20do%20Falaped">
                  <MessageCircleIcon data-icon="inline-start" />
                  Falar com a gente
                </a>
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="ghost" size="sm" className="ml-auto text-danger-text hover:bg-danger-soft hover:text-danger-text">
                    Excluir conta
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="max-w-md">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir sua conta para sempre?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Seus pacientes, atendimentos, documentos e o vínculo com o WhatsApp serão apagados. Não dá para
                      recuperar depois.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  {deleteError ? (
                    <p className="px-1 text-danger-text" role="alert">
                      {deleteError}
                    </p>
                  ) : null}
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={deleteLoading}>Cancelar</AlertDialogCancel>
                    <Button type="button" variant="destructive" disabled={deleteLoading} onClick={handleConfirmDelete}>
                      {deleteLoading ? <Loader2Icon className="animate-spin" /> : null}
                      {deleteLoading ? "Excluindo…" : "Sim, excluir"}
                    </Button>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </FormCard>

          {/* Barra de salvar do guia: só com mudança, diz o que mudou. */}
          {isDirty || isSubmitting || profileError ? (
            <div className="sticky bottom-6 z-20 flex items-center gap-3 rounded-2xl border border-border bg-popover px-4 py-3 shadow-lg">
              <span
                className={cn("size-2 rounded-full", profileError || errorLabel ? "bg-danger-text" : "bg-warning")}
                aria-hidden
              />
              <span className="flex-1" aria-live="polite">
                {profileError ??
                  (errorLabel
                    ? `Falta corrigir ${errorLabel}`
                    : changed.length
                      ? `Você alterou ${joinPtBr(changed)}`
                      : "Você tem alterações não salvas")}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={isSubmitting}
                onClick={() => {
                  form.reset()
                  setProfileError(null)
                }}
              >
                Descartar
              </Button>
              <Button type="submit" size="sm" disabled={isSubmitting}>
                {isSubmitting ? "Salvando…" : "Salvar alterações"}
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </form>
  )
}
