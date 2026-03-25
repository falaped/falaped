"use client"

import { useState, useRef, useEffect } from "react"
import { useForm } from "react-hook-form"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import { getFriendlyToastMessage } from "@/lib/get-friendly-toast-message"
import {
  UserIcon,
  AlertTriangleIcon,
  ImageIcon,
  CreditCardIcon,
  Sun,
  Moon,
  Laptop,
  Trash2Icon,
  MapPin,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
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
  FieldError,
  FieldGroup,
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
import { deleteMyAccountAction, updateStatusAction, updateProfileAction, uploadProfileLogoAction, clearProfileLogoAction } from "@/actions"
import type { AuthenticatedUserStatus } from "@/modules/authenticated-users/update-authenticated-user-status"
import type { AuthenticatedUserResult } from "@/modules/supabase/get-authenticated-user"
import type { ReportTemplateOption } from "@/modules/report-templates/get-report-templates-by-profile-id"
import { z } from "zod"
import {
  updateProfileSchema,
  type UpdateProfileFormValues,
} from "@/lib/schemas/profile"

const STATUS_OPTIONS: { value: AuthenticatedUserStatus; label: string }[] = [
  { value: "paid", label: "Pago" },
  { value: "unpaid", label: "Não pago" },
  { value: "blocked", label: "Bloqueado" },
]

const THEME_OPTIONS: { value: "light" | "dark" | "system"; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Laptop },
]

/** Sentinel for "no template" in Select (Radix does not allow value=""). */
const REPORT_TEMPLATE_NONE_VALUE = "__none__"

type ProfileContentProps = AuthenticatedUserResult & {
  reportTemplateOptions: ReportTemplateOption[]
}

export function ProfileContent({ profile, reportTemplateOptions }: ProfileContentProps) {
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [statusValue, setStatusValue] = useState<AuthenticatedUserStatus>(
    (profile.status as AuthenticatedUserStatus) ?? "unpaid"
  )
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [logoFullLoading, setLogoFullLoading] = useState(false)
  const [logoShortLoading, setLogoShortLoading] = useState(false)
  const [logoClearLoading, setLogoClearLoading] = useState<"full" | "short" | null>(null)
  const [logoError, setLogoError] = useState<string | null>(null)
  const [geoLoading, setGeoLoading] = useState(false)
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
    },
  })

  async function handleStatusChange(newStatus: AuthenticatedUserStatus) {
    setStatusError(null)
    setStatusUpdating(true)
    try {
      const result = await updateStatusAction(newStatus)
      if (result.ok) {
        setStatusValue(newStatus)
        toast.success("Status atualizado.")
        return
      }
      setStatusError(result.error)
      toast.error(getFriendlyToastMessage(result.error))
    } finally {
      setStatusUpdating(false)
    }
  }

  async function handleUseGeolocation() {
    if (!navigator.geolocation) {
      toast.error("Geolocalização não é suportada neste navegador.")
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
          const state = data.address?.state?.trim()
          const city =
            data.address?.city?.trim() ||
            data.address?.town?.trim() ||
            data.address?.village?.trim() ||
            data.address?.municipality?.trim()
          if (state) form.setValue("default_location_state", state)
          if (city) form.setValue("default_location_city", city ?? "")
          if (state || city) toast.success("Estado e cidade preenchidos pela sua localização.")
          else toast.error("Não foi possível identificar estado ou cidade para esta localização.")
        } catch {
          toast.error("Não foi possível obter o endereço. Tente novamente.")
        } finally {
          setGeoLoading(false)
        }
      },
      () => {
        setGeoLoading(false)
        toast.error("Permissão de localização negada ou localização indisponível.")
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
      return
    }
    const result = await updateProfileAction(parsed.data)
    if (result.ok) {
      toast.success("Perfil atualizado.")
      router.refresh()
      return
    }
    setProfileError(result.error)
    toast.error(getFriendlyToastMessage(result.error))
  }

  async function handleLogoChange(
    kind: "full" | "short",
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0]
    if (!file) return
    setLogoError(null)
    if (kind === "full") setLogoFullLoading(true)
    else setLogoShortLoading(true)
    try {
      const formData = new FormData()
      formData.set("kind", kind)
      formData.set("file", file)
      const result = await uploadProfileLogoAction(formData)
      if (result.ok) {
        toast.success("Logo enviada.")
      } else {
        setLogoError(result.error)
        toast.error(getFriendlyToastMessage(result.error))
      }
    } finally {
      if (kind === "full") setLogoFullLoading(false)
      else setLogoShortLoading(false)
      e.target.value = ""
    }
  }

  async function handleClearLogo(kind: "full" | "short") {
    setLogoError(null)
    setLogoClearLoading(kind)
    try {
      const result = await clearProfileLogoAction(kind)
      if (result.ok) {
        toast.success("Logo removida.")
        router.refresh()
        return
      }
      setLogoError(result.error)
      toast.error(getFriendlyToastMessage(result.error))
    } finally {
      setLogoClearLoading(null)
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
      setDeleteError(result.error)
      toast.error(getFriendlyToastMessage(result.error))
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-8 max-w-4xl w-full">

      {/* Informações do perfil */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserIcon className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Informações do perfil</CardTitle>
          </div>
          <CardDescription>
            Nome, e-mail e dados profissionais. Todos os campos são opcionais.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={form.handleSubmit(handleProfileSubmit)}
            className="space-y-4"
          >
            <FieldGroup>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field data-invalid={!!form.formState.errors.first_name}>
                  <FieldLabel htmlFor="first_name">Nome</FieldLabel>
                  <FieldContent>
                    <Input
                      id="first_name"
                      type="text"
                      placeholder="Nome"
                      aria-invalid={!!form.formState.errors.first_name}
                      {...form.register("first_name")}
                    />
                    <FieldError
                      errors={
                        form.formState.errors.first_name
                          ? [form.formState.errors.first_name]
                          : undefined
                      }
                    />
                  </FieldContent>
                </Field>
                <Field data-invalid={!!form.formState.errors.surname}>
                  <FieldLabel htmlFor="surname">Sobrenome</FieldLabel>
                  <FieldContent>
                    <Input
                      id="surname"
                      type="text"
                      placeholder="Sobrenome"
                      aria-invalid={!!form.formState.errors.surname}
                      {...form.register("surname")}
                    />
                    <FieldError
                      errors={
                        form.formState.errors.surname
                          ? [form.formState.errors.surname]
                          : undefined
                      }
                    />
                  </FieldContent>
                </Field>
              </div>
              <Field data-invalid={!!form.formState.errors.email}>
                <FieldLabel htmlFor="email">E-mail</FieldLabel>
                <FieldContent>
                  <Input
                    id="email"
                    type="email"
                    disabled
                    placeholder="seu@email.com"
                    aria-invalid={!!form.formState.errors.email}
                    {...form.register("email")}
                  />
                  <FieldError
                    errors={
                      form.formState.errors.email
                        ? [form.formState.errors.email]
                        : undefined
                    }
                  />
                </FieldContent>
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field data-invalid={!!form.formState.errors.crm}>
                  <FieldLabel htmlFor="crm">CRM</FieldLabel>
                  <FieldContent>
                    <Input
                      id="crm"
                      type="text"
                      placeholder="Ex.: 12345 MG"
                      aria-invalid={!!form.formState.errors.crm}
                      {...form.register("crm")}
                    />
                    <FieldError
                      errors={
                        form.formState.errors.crm
                          ? [form.formState.errors.crm]
                          : undefined
                      }
                    />
                  </FieldContent>
                </Field>
                <Field data-invalid={!!form.formState.errors.rqe}>
                  <FieldLabel htmlFor="rqe">RQE</FieldLabel>
                  <FieldContent>
                    <Input
                      id="rqe"
                      type="text"
                      placeholder="RQE"
                      aria-invalid={!!form.formState.errors.rqe}
                      {...form.register("rqe")}
                    />
                    <FieldError
                      errors={
                        form.formState.errors.rqe
                          ? [form.formState.errors.rqe]
                          : undefined
                      }
                    />
                  </FieldContent>
                </Field>
              </div>
              <Field data-invalid={!!form.formState.errors.social_media_handle}>
                <FieldLabel htmlFor="social_media_handle">
                  Rede social / handle
                </FieldLabel>
                <FieldContent>
                  <Input
                    id="social_media_handle"
                    type="text"
                    placeholder="Ex.: @dr.nome ou link do perfil"
                    aria-invalid={!!form.formState.errors.social_media_handle}
                    {...form.register("social_media_handle")}
                  />
                  <FieldError
                    errors={
                      form.formState.errors.social_media_handle
                        ? [form.formState.errors.social_media_handle]
                        : undefined
                    }
                  />
                </FieldContent>
              </Field>
              <Field data-invalid={!!form.formState.errors.website}>
                <FieldLabel htmlFor="website">Site</FieldLabel>
                <FieldContent>
                  <Input
                    id="website"
                    type="url"
                    placeholder="https://..."
                    aria-invalid={!!form.formState.errors.website}
                    {...form.register("website")}
                  />
                  <FieldError
                    errors={
                      form.formState.errors.website
                        ? [form.formState.errors.website]
                        : undefined
                    }
                  />
                </FieldContent>
              </Field>
              <Field data-invalid={!!form.formState.errors.report_template_id}>
                <FieldLabel htmlFor="report_template_id">
                  Template de relatório
                </FieldLabel>
                <FieldContent>
                  <Select
                    value={
                      (form.watch("report_template_id") as string) ||
                      REPORT_TEMPLATE_NONE_VALUE
                    }
                    onValueChange={(v) =>
                      form.setValue(
                        "report_template_id",
                        v === REPORT_TEMPLATE_NONE_VALUE ? "" : v
                      )
                    }
                  >
                    <SelectTrigger
                      id="report_template_id"
                      aria-invalid={
                        !!form.formState.errors.report_template_id
                      }
                    >
                      <SelectValue placeholder="Nenhum (usar padrão)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={REPORT_TEMPLATE_NONE_VALUE}>
                        Nenhum (usar padrão)
                      </SelectItem>
                      {reportTemplateOptions.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                          {t.is_default ? " (padrão do projeto)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FieldError
                    errors={
                      form.formState.errors.report_template_id
                        ? [form.formState.errors.report_template_id]
                        : undefined
                    }
                  />
                  </FieldContent>
              </Field>
              <div className="border-t border-border pt-4 mt-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Localização padrão</p>
                      <p className="text-xs text-muted-foreground">
                        Será utilizada nos relatórios, atestados e receitas (ex.: São Paulo - Osasco).
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleUseGeolocation}
                    disabled={geoLoading}
                    aria-label="Usar minha localização para preencher estado e cidade"
                  >
                    <MapPin className="mr-2 h-4 w-4" />
                    {geoLoading ? "Obtendo…" : "Usar minha localização"}
                  </Button>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field data-invalid={!!form.formState.errors.default_location_state}>
                    <FieldLabel htmlFor="default_location_state">Estado</FieldLabel>
                    <FieldContent>
                      <Input
                        id="default_location_state"
                        type="text"
                        placeholder="Ex.: São Paulo"
                        aria-invalid={!!form.formState.errors.default_location_state}
                        {...form.register("default_location_state")}
                      />
                      <FieldError
                        errors={
                          form.formState.errors.default_location_state
                            ? [form.formState.errors.default_location_state]
                            : undefined
                        }
                      />
                    </FieldContent>
                  </Field>
                  <Field data-invalid={!!form.formState.errors.default_location_city}>
                    <FieldLabel htmlFor="default_location_city">Cidade</FieldLabel>
                    <FieldContent>
                      <Input
                        id="default_location_city"
                        type="text"
                        placeholder="Ex.: Osasco"
                        aria-invalid={!!form.formState.errors.default_location_city}
                        {...form.register("default_location_city")}
                      />
                      <FieldError
                        errors={
                          form.formState.errors.default_location_city
                            ? [form.formState.errors.default_location_city]
                            : undefined
                        }
                      />
                    </FieldContent>
                  </Field>
                </div>
              </div>
            </FieldGroup>
            {profileError && (
              <p className="text-sm text-destructive" role="alert">
                {profileError}
              </p>
            )}
            <Button
              type="submit"
              disabled={form.formState.isSubmitting}
            >
              {form.formState.isSubmitting ? "Salvando…" : "Salvar"}
            </Button>
          </form>
        </CardContent>
      </Card>
      {/* Logos */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Logos</CardTitle>
          </div>
          <CardDescription>
            Opcional. PNG, JPEG ou WebP, até 2 MB.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-6 sm:grid-cols-4">
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">
              Logo completa
            </p>
            <div className="flex flex-col gap-3">
              <div className="aspect-square max-w-[200px] w-full rounded-lg border border-border bg-muted/30 overflow-hidden flex items-center justify-center">
                <input
                  ref={fullInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  aria-hidden
                  onChange={(e) => handleLogoChange("full", e)}
                />
                {logoFullLoading ? (
                  <span className="text-sm text-muted-foreground">
                    Enviando…
                  </span>
                ) : profile.logo_url_full ? (
                  <img
                    src={profile.logo_url_full}
                    alt="Logo completa"
                    className="h-full w-full object-contain p-3"
                  />
                ) : (
                  <ImageIcon className="h-10 w-10 text-muted-foreground" />
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fullInputRef.current?.click()}
                  disabled={logoFullLoading}
                >
                  Alterar
                </Button>
                {profile.logo_url_full && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => handleClearLogo("full")}
                    disabled={logoClearLoading === "full"}
                  >
                    <Trash2Icon className="h-4 w-4 mr-1" />
                    Remover
                  </Button>
                )}
              </div>
            </div>
          </div>
          <div className="space-y-3">
            <p className="text-sm font-medium text-muted-foreground">
              Logo curta
            </p>
            <div className="flex flex-col gap-3">
              <div className="aspect-square max-w-[200px] w-full rounded-lg border border-border bg-muted/30 overflow-hidden flex items-center justify-center">
                <input
                  ref={shortInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  aria-hidden
                  onChange={(e) => handleLogoChange("short", e)}
                />
                {logoShortLoading ? (
                  <span className="text-sm text-muted-foreground">
                    Enviando…
                  </span>
                ) : profile.logo_url_short ? (
                  <img
                    src={profile.logo_url_short}
                    alt="Logo curta"
                    className="h-full w-full object-contain p-3"
                  />
                ) : (
                  <ImageIcon className="h-10 w-10 text-muted-foreground" />
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => shortInputRef.current?.click()}
                  disabled={logoShortLoading}
                >
                  Alterar
                </Button>
                {profile.logo_url_short && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground hover:text-destructive"
                    onClick={() => handleClearLogo("short")}
                    disabled={logoClearLoading === "short"}
                  >
                    <Trash2Icon className="h-4 w-4 mr-1" />
                    Remover
                  </Button>
                )}
              </div>
            </div>
          </div>
          {logoError && (
            <p className="text-sm text-destructive col-span-full" role="alert">
              {logoError}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Aparência */}
      <Card>
        <CardHeader>
          <CardTitle>Aparência</CardTitle>
          <CardDescription>
            Escolha como o dashboard aparece: tema claro, escuro ou conforme o sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {mounted ? (
            <fieldset className="space-y-3">
              <legend className="text-sm font-medium text-muted-foreground sr-only">
                Modo de tema
              </legend>
              <div
                role="radiogroup"
                aria-label="Modo de tema"
                className="grid grid-cols-3 gap-3"
              >
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
                      className={`flex flex-col items-center gap-2 rounded-lg border p-4 text-sm transition-colors hover:bg-muted/50 ${isSelected
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border"
                        }`}
                    >
                      <Icon className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">{opt.label}</span>
                    </button>
                  )
                })}
              </div>
            </fieldset>
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-[72px] rounded-lg border border-border bg-muted/30 animate-pulse"
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plano (status atual; futuro: upgrade / gestão de assinatura) */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CreditCardIcon className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Plano</CardTitle>
          </div>
          <CardDescription>
            Status da sua assinatura. Em breve você poderá fazer upgrade e
            gerenciar seu plano aqui.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Select
            value={statusValue}
            onValueChange={(value) =>
              handleStatusChange(value as AuthenticatedUserStatus)
            }
            disabled={statusUpdating}
          >
            <SelectTrigger id="account-status" className="w-full max-w-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {statusError && (
            <p className="text-sm text-destructive" role="alert">
              {statusError}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Zona de perigo */}
      <section className="space-y-2">
        <h2 className="text-xl font-semibold tracking-tight">
          Zona de perigo
        </h2>
        <p className="text-sm text-muted-foreground">
          Exclua permanentemente sua conta e todos os seus dados.
        </p>
        <Card className="border-destructive/50 bg-destructive/5">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertTriangleIcon className="h-5 w-5 text-destructive" />
              <CardTitle className="text-destructive">
                Solicitar exclusão da conta
              </CardTitle>
            </div>
            <CardDescription>
              Excluir sua conta é irreversível. Todos os seus dados serão
              removidos: casos, mensagens, pacientes e vínculos com WhatsApp.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {deleteError && (
              <p className="text-sm text-destructive" role="alert">
                {deleteError}
              </p>
            )}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  Solicitar exclusão da conta
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Excluir conta permanentemente?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Você perderá todos os seus casos, mensagens de atendimento,
                    pacientes cadastrados e o vínculo com o WhatsApp. Esta ação
                    não pode ser desfeita.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                {deleteError && (
                  <p
                    className="text-sm text-destructive px-1"
                    role="alert"
                  >
                    {deleteError}
                  </p>
                )}
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={deleteLoading}>
                    Cancelar
                  </AlertDialogCancel>
                  <Button
                    variant="destructive"
                    disabled={deleteLoading}
                    onClick={handleConfirmDelete}
                  >
                    {deleteLoading
                      ? "Excluindo…"
                      : "Sim, excluir minha conta"}
                  </Button>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
