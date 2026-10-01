"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { useForm, type UseFormReturn } from "react-hook-form"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import {
  AlertTriangleIcon,
  BadgeCheckIcon,
  ChevronsUpDownIcon,
  BanknoteIcon,
  FileTextIcon,
  ImageIcon,
  ImageUpIcon,
  Laptop,
  Loader2Icon,
  MapPin,
  Moon,
  PaletteIcon,
  ShieldIcon,
  StethoscopeIcon,
  Sun,
  Trash2Icon,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field"
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
import { deleteMyAccountAction, updateProfileAction, uploadProfileLogoAction, clearProfileLogoAction } from "@/actions"
import { isInTrial } from "@/lib/account-status"
import { formatDate } from "@/lib/formatters"
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

const THEME_OPTIONS: { value: "light" | "dark" | "system"; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Igual ao sistema", icon: Laptop },
]

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

/** Cabeçalho de seção: ícone, título e o que aquilo muda na prática. */
function SectionHeader({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Sun
  title: string
  description: React.ReactNode
}) {
  return (
    <CardHeader>
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <CardTitle>{title}</CardTitle>
      </div>
      <CardDescription className="max-w-2xl">{description}</CardDescription>
    </CardHeader>
  )
}

/** Campo de texto ligado ao form do perfil: rótulo, ajuda e erro no mesmo padrão. */
function TextField({
  form,
  name,
  label,
  placeholder,
  description,
  type = "text",
  inputMode,
  disabled,
  className,
}: {
  form: ProfileForm
  name: keyof UpdateProfileFormValues
  label: string
  placeholder?: string
  description?: React.ReactNode
  type?: string
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"]
  disabled?: boolean
  className?: string
}) {
  const error = form.formState.errors[name]
  return (
    <Field data-invalid={!!error} className={className}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <FieldContent>
        <Input
          id={name}
          type={type}
          inputMode={inputMode}
          autoComplete="off"
          placeholder={placeholder}
          disabled={disabled}
          aria-invalid={!!error}
          {...form.register(name)}
        />
        {description ? <FieldDescription className="text-xs text-muted-foreground/80">{description}</FieldDescription> : null}
        <FieldError errors={error ? [error] : undefined} />
      </FieldContent>
    </Field>
  )
}

/** Um espaço de logo: miniatura clicável, estado de envio, ações e o erro logo abaixo. */
function LogoSlot({
  kind,
  title,
  hint,
  url,
  uploading,
  removing,
  error,
  onPick,
  onRemove,
}: {
  kind: LogoKind
  title: string
  hint: string
  url: string | null
  uploading: boolean
  removing: boolean
  error: string | null
  onPick: () => void
  onRemove: () => void
}) {
  const busy = uploading || removing
  return (
    <div className="flex flex-col gap-3">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground/80">{hint}</p>
      </div>
      <button
        type="button"
        onClick={onPick}
        disabled={busy}
        aria-label={url ? `Trocar ${title.toLowerCase()}` : `Enviar ${title.toLowerCase()}`}
        className={cn(
          "relative flex items-center justify-center overflow-hidden rounded-xl border border-dashed bg-muted/30 transition-colors hover:border-primary hover:bg-primary/5 disabled:cursor-wait",
          kind === "full" ? "aspect-[3/1]" : "aspect-square w-full max-w-40",
          url && "border-solid bg-white hover:bg-white dark:bg-white",
        )}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={title} className="h-full w-full object-contain p-3" />
        ) : (
          <span className="flex flex-col items-center gap-1.5 text-muted-foreground">
            <ImageUpIcon className="size-6" />
            <span className="text-xs font-medium">Clique para enviar</span>
          </span>
        )}
        {busy ? (
          <span className="absolute inset-0 flex items-center justify-center gap-2 bg-background/80 text-sm font-medium text-foreground">
            <Loader2Icon className="size-4 animate-spin" />
            {uploading ? "Enviando…" : "Removendo…"}
          </span>
        ) : null}
      </button>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onPick} disabled={busy}>
          {url ? "Trocar" : "Enviar"}
        </Button>
        {url ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
            onClick={onRemove}
            disabled={busy}
          >
            <Trash2Icon className="mr-1 size-4" />
            Remover
          </Button>
        ) : null}
      </div>
      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}
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
  const credentials = [crm && `CRM ${crm}`, rqe && `RQE ${rqe}`].filter(Boolean).join(" · ")
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

  return (
    <form
      onSubmit={form.handleSubmit(handleProfileSubmit)}
      className="flex w-full max-w-4xl flex-col gap-6"
    >
      {/* Identidade: como você aparece no Falaped e a situação da conta. */}
      <Card className="gap-0 overflow-hidden py-0">
        <div className="h-16 bg-gradient-to-r from-primary/25 via-primary/10 to-transparent" />
        <CardContent className="-mt-8 flex flex-col gap-4 pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex min-w-0 items-end gap-4">
            <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-4 border-card bg-white shadow-sm">
              {shortLogo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={shortLogo} alt="" className="h-full w-full object-contain p-1.5" />
              ) : (
                <span className="text-xl font-semibold text-primary">{initials(firstName, surname)}</span>
              )}
            </div>
            <div className="min-w-0 pb-1">
              <p className="truncate text-lg font-semibold leading-tight">
                {fullName || "Seu nome"}
              </p>
              <p className="truncate text-sm text-muted-foreground">
                {credentials || "Pediatria"}
                {profile.email ? ` · ${profile.email}` : ""}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-start gap-1 sm:items-end sm:pb-1">
            <Badge variant={plan.tone}>{plan.badge}</Badge>
            {plan.trial ? (
              <span className="text-xs text-muted-foreground">até {formatDate(profile.trial_ends_at)}</span>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {/* Dados profissionais */}
      <Card>
        <SectionHeader
          icon={StethoscopeIcon}
          title="Dados profissionais"
          description="Seu nome, CRM, RQE e cidade saem impressos em receitas, atestados, pedidos de exame e relatórios. Escreva como estão no seu carimbo."
        />
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <TextField form={form} name="first_name" label="Nome" placeholder="Ex.: Mariana" />
          <TextField form={form} name="surname" label="Sobrenome" placeholder="Ex.: Souza Lima" />
          <TextField form={form} name="crm" label="CRM" placeholder="Ex.: 12345 MG" description="Número e estado, como no carimbo." />
          <TextField form={form} name="rqe" label="RQE" placeholder="Ex.: 6789" description="Registro de especialista. Deixe em branco se não tiver." />
          <div className="rounded-xl border bg-muted/20 p-4 sm:col-span-2">
            <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MapPin className="size-4 text-muted-foreground" />
                <p className="text-sm font-medium">Onde você atende</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleUseGeolocation}
                disabled={geoLoading}
              >
                {geoLoading ? <Loader2Icon className="mr-2 size-4 animate-spin" /> : <MapPin className="mr-2 size-4" />}
                {geoLoading ? "Buscando…" : "Usar minha localização"}
              </Button>
            </div>
            <p className="mb-4 text-xs text-muted-foreground/80">
              A cidade sai junto da data nos documentos.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField form={form} name="default_location_city" label="Cidade" placeholder="Ex.: Belo Horizonte" />
              <TextField form={form} name="default_location_state" label="Estado" placeholder="Ex.: Minas Gerais" />
            </div>
          </div>
          <TextField
            form={form}
            name="email"
            label="E-mail de acesso"
            type="email"
            disabled
            className="sm:col-span-2"
            description="É o seu login e não muda por aqui. Para trocar, escreva para contato@falaped.com.br."
          />
          <TextField form={form} name="social_media_handle" label="Instagram" placeholder="Ex.: @dra.mariana" description="Opcional. Fica guardado no seu perfil." />
          <TextField form={form} name="website" label="Site" type="url" placeholder="https://..." description="Opcional. Fica guardado no seu perfil." />
        </CardContent>
      </Card>

      {/* Sua marca nos documentos */}
      <Card>
        <SectionHeader
          icon={PaletteIcon}
          title="Sua marca nos documentos"
          description="Cada documento que você gera sai com a sua cara. A logo completa vai no cabeçalho de receitas, atestados, pedidos de exame, orientações, encaminhamentos e relatórios. A logo curta aparece no menu do Falaped. Veja as duas prévias logo abaixo."
        />
        <CardContent className="flex flex-col gap-6">
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
          <div className="grid gap-6 sm:grid-cols-[2fr_1fr]">
            <LogoSlot
              kind="full"
              title="Logo completa"
              hint="Horizontal, com fundo transparente de preferência. PNG, JPEG ou WebP até 2 MB."
              url={fullLogo}
              uploading={logoUploading === "full"}
              removing={logoRemoving === "full"}
              error={logoError.full}
              onPick={() => fullInputRef.current?.click()}
              onRemove={() => handleClearLogo("full")}
            />
            <LogoSlot
              kind="short"
              title="Logo curta"
              hint="Quadrada: o símbolo ou as suas iniciais."
              url={shortLogo}
              uploading={logoUploading === "short"}
              removing={logoRemoving === "short"}
              error={logoError.short}
              onPick={() => shortInputRef.current?.click()}
              onRemove={() => handleClearLogo("short")}
            />
          </div>

          {/* Prévias com as logos que existem de verdade: documento usa só a completa, menu só a curta. */}
          <div className="grid gap-6 sm:grid-cols-[2fr_1fr]">
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Nos documentos
              </p>
              <div className="rounded-xl border bg-white p-5 text-neutral-900 shadow-sm">
                <div className="flex items-center justify-between gap-4 border-b border-neutral-200 pb-4">
                  <div className="flex h-12 max-w-[50%] items-center">
                    {fullLogo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={fullLogo} alt="" className="max-h-12 w-auto object-contain" />
                    ) : (
                      <span className="flex items-center gap-1.5 text-xs text-neutral-400">
                        <ImageIcon className="size-4" /> Sem logo
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 text-right">
                    <p className="truncate text-sm font-semibold">{fullName || "Seu nome"}</p>
                    <p className="truncate text-xs text-neutral-500">{credentials || "CRM"}</p>
                  </div>
                </div>
                <div className="space-y-1.5 pt-4" aria-hidden>
                  <div className="h-2 w-3/4 rounded bg-neutral-100" />
                  <div className="h-2 w-2/3 rounded bg-neutral-100" />
                  <div className="h-2 w-1/2 rounded bg-neutral-100" />
                </div>
                <p className="pt-4 text-right text-xs text-neutral-500">
                  {place || "Cidade - Estado"}
                </p>
              </div>
              <p className="mt-2 text-xs text-muted-foreground/80">
                {fullLogo
                  ? "Uma aproximação. A posição de cada item muda um pouco entre os tipos de documento."
                  : shortLogo
                    ? "Os documentos usam a logo completa. Só com a curta, eles saem sem logo no cabeçalho."
                    : "Envie a logo completa para ela aparecer no cabeçalho dos documentos."}
              </p>
            </div>
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                No menu do Falaped
              </p>
              <div className="flex items-center gap-2 rounded-lg border bg-sidebar p-2 text-sidebar-foreground">
                <span className="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white text-sm font-medium text-neutral-900">
                  {shortLogo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={shortLogo} alt="" className="size-6 object-contain" />
                  ) : (
                    initials(firstName, surname)
                  )}
                </span>
                <span className="grid min-w-0 flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{fullName || "Seu nome"}</span>
                  <span className="truncate text-xs text-muted-foreground">{profile.email}</span>
                </span>
                <ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" />
              </div>
              <p className="mt-2 text-xs text-muted-foreground/80">
                {shortLogo ? "Assim você aparece no canto do menu." : "Sem logo curta, o menu mostra suas iniciais."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Relatório da consulta */}
      <Card>
        <SectionHeader
          icon={FileTextIcon}
          title="Relatório da consulta"
          description={
            <>
              O modelo define as seções e a ordem que a IA segue ao escrever o relatório no fim do
              atendimento. Crie e edite modelos em{" "}
              <Link href="/dashboard/report-templates" className="font-medium text-primary underline-offset-4 hover:underline">
                Modelos de relatório
              </Link>
              .
            </>
          }
        />
        <CardContent>
          <Field data-invalid={!!form.formState.errors.report_template_id} className="max-w-md">
            <FieldLabel htmlFor="report_template_id">Modelo usado</FieldLabel>
            <FieldContent>
              <Select
                value={(form.watch("report_template_id") as string) || REPORT_TEMPLATE_NONE_VALUE}
                onValueChange={(v) =>
                  form.setValue("report_template_id", v === REPORT_TEMPLATE_NONE_VALUE ? "" : v, {
                    shouldDirty: true,
                  })
                }
              >
                <SelectTrigger id="report_template_id" aria-invalid={!!form.formState.errors.report_template_id}>
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
              <FieldError
                errors={form.formState.errors.report_template_id ? [form.formState.errors.report_template_id] : undefined}
              />
            </FieldContent>
          </Field>
        </CardContent>
      </Card>

      {/* Valores */}
      <Card>
        <SectionHeader
          icon={BanknoteIcon}
          title="Valores"
          description="Ao encerrar um atendimento, o Falaped já sugere o valor da consulta e lista seus procedimentos para você marcar o que foi feito. Tudo entra no seu financeiro, e dá para ajustar na hora."
        />
        <CardContent className="flex flex-col gap-6">
          <TextField
            form={form}
            name="consultation_price_cents"
            label="Valor da consulta (R$)"
            placeholder="Ex.: 250,00"
            inputMode="decimal"
            className="max-w-xs"
            description="Deixe em branco se cada consulta tem um valor diferente."
          />
          <div className="flex flex-col gap-2">
            <div>
              <p className="text-sm font-medium">Procedimentos</p>
              <p className="text-sm text-muted-foreground">
                O que você cobra além da consulta, como frenectomia ou laserterapia. Cada
                procedimento é salvo na hora, sem precisar do botão de salvar.
              </p>
            </div>
            <ProcedureCatalogCard items={procedureCatalogItems} />
          </div>
        </CardContent>
      </Card>

      {/* Aparência */}
      <Card>
        <SectionHeader
          icon={Sun}
          title="Aparência"
          description="Como o Falaped aparece para você neste aparelho. Os documentos impressos não mudam."
        />
        <CardContent>
          {mounted ? (
            <div role="radiogroup" aria-label="Tema" className="grid grid-cols-3 gap-3">
              {THEME_OPTIONS.map((opt) => {
                const Icon = opt.icon
                const isSelected = theme === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setTheme(opt.value)}
                    className={cn(
                      "flex flex-col items-center gap-2 rounded-xl border p-4 text-sm transition-colors hover:bg-muted/50",
                      isSelected ? "border-primary bg-primary/5 ring-2 ring-primary/20" : "border-border",
                    )}
                  >
                    <Icon className={cn("size-5", isSelected ? "text-primary" : "text-muted-foreground")} />
                    <span className="font-medium">{opt.label}</span>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-[78px] animate-pulse rounded-xl border bg-muted/30" />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conta */}
      <Card>
        <SectionHeader icon={ShieldIcon} title="Conta" description="Seu plano e a exclusão da conta." />
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <BadgeCheckIcon className="mt-0.5 size-5 shrink-0 text-primary" />
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">Plano</p>
                  <Badge variant={plan.tone}>{plan.badge}</Badge>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{plan.text}</p>
              </div>
            </div>
            <Button type="button" variant="outline" size="sm" asChild className="shrink-0">
              <a href="mailto:contato@falaped.com.br?subject=Plano%20do%20Falaped">Falar com a gente</a>
            </Button>
          </div>

          <div className="flex flex-col gap-3 rounded-xl border border-destructive/40 bg-destructive/5 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangleIcon className="mt-0.5 size-5 shrink-0 text-destructive" />
              <div>
                <p className="text-sm font-medium text-destructive">Excluir conta</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Apaga para sempre seus pacientes, atendimentos, documentos e o vínculo com o
                  WhatsApp. Não dá para desfazer.
                </p>
              </div>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button type="button" variant="destructive" size="sm" className="shrink-0">
                  Excluir conta
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir sua conta para sempre?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Seus pacientes, atendimentos, documentos e o vínculo com o WhatsApp serão
                    apagados. Não dá para recuperar depois.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                {deleteError ? (
                  <p className="px-1 text-sm text-destructive" role="alert">
                    {deleteError}
                  </p>
                ) : null}
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleteLoading}>Cancelar</AlertDialogCancel>
                  <Button type="button" variant="destructive" disabled={deleteLoading} onClick={handleConfirmDelete}>
                    {deleteLoading ? <Loader2Icon className="mr-2 size-4 animate-spin" /> : null}
                    {deleteLoading ? "Excluindo…" : "Sim, excluir"}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </CardContent>
      </Card>

      {/* Barra de salvar: aparece com alteração pendente e fica presa no rodapé. */}
      {isDirty || isSubmitting || profileError ? (
        <div className="sticky bottom-4 z-20">
          <div className="flex flex-col gap-3 rounded-xl border bg-card/95 p-3 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
            <p
              className={cn("px-1 text-sm", profileError ? "text-destructive" : "text-muted-foreground")}
              role={profileError ? "alert" : undefined}
            >
              {profileError ?? "Você tem alterações que ainda não foram salvas."}
            </p>
            <div className="flex gap-2">
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
                {isSubmitting ? <Loader2Icon className="mr-2 size-4 animate-spin" /> : null}
                {isSubmitting ? "Salvando…" : "Salvar alterações"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </form>
  )
}
