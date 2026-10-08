"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { CameraIcon } from "lucide-react"
import { toast } from "sonner"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { compressPatientPhoto } from "@/lib/compress-image"
import { getPatientInitials } from "@/lib/get-patient-initials"
import {
  removePatientPhotoAction,
  uploadPatientPhotoAction,
} from "@/actions"

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"]
const MAX_SIZE_BYTES = 2 * 1024 * 1024 // 2 MB

const MSG_INVALID_TYPE =
  "Tipo de arquivo não permitido. Use PNG, JPEG ou WebP."
const MSG_TOO_LARGE = "Arquivo muito grande. Envie uma imagem de até 2 MB."
const MSG_NO_CONSENT =
  "É necessário confirmar o consentimento do responsável para enviar a foto."
const MSG_GENERIC = "Não foi possível enviar a foto. Tente novamente."

type Status = "idle" | "optimizing" | "uploading" | "removing"

/**
 * Foto da criança no cabeçalho do formulário, sempre com o consentimento do responsável.
 * Na edição sobe na hora; no cadastro (sem `patientId`) fica guardada e o formulário envia
 * com `uploadPendingPatientPhoto` depois de criar a criança.
 */
export function PatientFormPhotoField({
  patientId,
  patientName,
  initialPhotoUrl = null,
  onPendingChange,
}: {
  patientId?: string
  patientName: string
  initialPhotoUrl?: string | null
  onPendingChange?: (file: File | null) => void
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  // Object-URLs locais (prévia no modal e foto guardada no cadastro); revogados para não vazar memória.
  const previewRef = useRef<string | null>(null)
  const savedRef = useRef<string | null>(null)
  const [savedUrl, setSavedUrl] = useState<string | null>(initialPhotoUrl)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>("idle")
  const [isDialogOpen, setIsDialogOpen] = useState(false)

  const isBusy = status !== "idle"

  // Depois do refresh do servidor, a signed URL nova é a fonte da verdade.
  useEffect(() => {
    if (patientId) setSavedUrl(initialPhotoUrl)
  }, [patientId, initialPhotoUrl])

  useEffect(
    () => () => {
      for (const ref of [previewRef, savedRef]) if (ref.current) URL.revokeObjectURL(ref.current)
    },
    [],
  )

  function replaceRef(ref: React.RefObject<string | null>, url: string | null) {
    if (ref.current && ref.current !== url) URL.revokeObjectURL(ref.current)
    ref.current = url
  }

  // Fechar sem salvar descarta a imagem; cada foto nova exige o consentimento de novo (D-06).
  function handleDialogOpenChange(open: boolean) {
    if (isBusy || open) return
    setIsDialogOpen(false)
    replaceRef(previewRef, null)
    setPreviewUrl(null)
    setSelectedFile(null)
    setConsent(false)
    setError(null)
  }

  // Clicou na foto: abre direto o seletor do sistema; o modal só aparece com a imagem escolhida.
  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null
    event.target.value = ""
    if (!file) return
    // Validação cliente espelha o module (a autoritativa é a action/module).
    if (!ALLOWED_TYPES.includes(file.type)) return void toast.error(MSG_INVALID_TYPE)
    if (file.size > MAX_SIZE_BYTES) return void toast.error(MSG_TOO_LARGE)
    const url = URL.createObjectURL(file)
    replaceRef(previewRef, url)
    setPreviewUrl(url)
    setSelectedFile(file)
    setConsent(false)
    setError(null)
    setIsDialogOpen(true)
  }

  // A prévia vira a foto mostrada no avatar (o ref passa a ser dono do object-URL).
  function keepPreviewAsSaved() {
    replaceRef(savedRef, previewRef.current)
    previewRef.current = null
    setSavedUrl(savedRef.current)
    setPreviewUrl(null)
    setSelectedFile(null)
    setConsent(false)
    setIsDialogOpen(false)
  }

  async function handleSave() {
    setError(null)
    if (!selectedFile) return setError("Selecione uma imagem.")
    if (!consent) return setError(MSG_NO_CONSENT)
    if (!patientId) {
      onPendingChange?.(selectedFile)
      keepPreviewAsSaved()
      return
    }
    try {
      setStatus("optimizing")
      const compressed = await compressPatientPhoto(selectedFile)
      setStatus("uploading")
      const result = await uploadPatientPhotoAction(buildPhotoFormData(compressed, patientId))
      if (!result.ok) {
        setError(result.error)
        toast.error(result.error)
        return
      }
      toast.success("Foto atualizada.")
      keepPreviewAsSaved()
      router.refresh()
    } catch {
      setError(MSG_GENERIC)
      toast.error(MSG_GENERIC)
    } finally {
      setStatus("idle")
    }
  }

  async function handleRemove() {
    setError(null)
    if (!patientId) {
      onPendingChange?.(null)
      replaceRef(savedRef, null)
      setSavedUrl(null)
      setIsDialogOpen(false)
      return
    }
    try {
      setStatus("removing")
      const result = await removePatientPhotoAction(patientId)
      if (!result.ok) {
        setError(result.error)
        toast.error(result.error)
        return
      }
      toast.success("Foto removida.")
      replaceRef(savedRef, null)
      setSavedUrl(null)
      setIsDialogOpen(false)
      router.refresh()
    } catch {
      setError(MSG_GENERIC)
      toast.error(MSG_GENERIC)
    } finally {
      setStatus("idle")
    }
  }

  const statusLabel =
    status === "optimizing" ? "Otimizando imagem…" : status === "uploading" ? "Enviando…" : status === "removing" ? "Removendo…" : null
  const pick = () => inputRef.current?.click()

  return (
    <div className="flex shrink-0 flex-col items-center gap-1.5">
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={handleFileChange}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
      />
      <button
        type="button"
        onClick={pick}
        disabled={isBusy}
        aria-label={savedUrl ? "Trocar foto" : "Adicionar foto"}
        className="group relative rounded-full focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <Avatar className="size-16">
          {savedUrl ? <AvatarImage src={savedUrl} alt={`Foto de ${patientName}`} className="object-cover" /> : null}
          <AvatarFallback className="bg-primary-soft font-display text-section font-semibold text-primary-ink-strong">
            {patientName.trim() ? getPatientInitials(patientName) : "?"}
          </AvatarFallback>
        </Avatar>
        <span className="absolute -right-1 -bottom-1 grid size-7 place-items-center rounded-full border border-border bg-card shadow-xs group-hover:bg-accent">
          <CameraIcon className="size-3.5" aria-hidden />
        </span>
      </button>
      <div className="flex items-center gap-1.5 text-caption font-medium">
        <button type="button" onClick={pick} disabled={isBusy} className="text-primary-ink hover:underline">
          {savedUrl ? "Trocar" : "Adicionar foto"}
        </button>
        {savedUrl ? (
          <>
            <span className="text-subtle-foreground" aria-hidden>
              ·
            </span>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button type="button" disabled={isBusy} className="text-muted-foreground hover:text-danger-text hover:underline">
                  Remover
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Remover a foto?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {patientId
                      ? "A foto é apagada do armazenamento e a ficha volta a mostrar as iniciais. Não dá para desfazer."
                      : "A foto sai do cadastro e a ficha mostra as iniciais."}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel disabled={isBusy}>Cancelar</AlertDialogCancel>
                  <AlertDialogAction variant="destructive" onClick={handleRemove} disabled={isBusy}>
                    Remover
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        ) : null}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Usar esta foto?</DialogTitle>
            <DialogDescription>Ela aparece na ficha e na consulta de {patientName.trim().split(" ")[0] || "criança"}.</DialogDescription>
          </DialogHeader>
          {previewUrl ? (
            <div className="flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt={`Pré-visualização da foto de ${patientName}`} className="size-40 rounded-full border border-border object-cover" />
            </div>
          ) : null}
          <label className="flex items-start gap-2">
            <Checkbox
              checked={consent}
              onCheckedChange={(value) => {
                setConsent(value === true)
                if (value === true) setError(null)
              }}
              disabled={isBusy}
              className="mt-0.5"
            />
            <span>O responsável autorizou guardar esta foto.</span>
          </label>
          {error ? (
            <p className="text-caption text-danger-text" role="alert">
              {error}
            </p>
          ) : null}
          <div className="flex items-center gap-2">
            {statusLabel ? <span className="text-muted-foreground">{statusLabel}</span> : null}
            <Button type="button" variant="ghost" className="ml-auto" onClick={pick} disabled={isBusy}>
              Escolher outra
            </Button>
            <Button type="button" onClick={handleSave} disabled={isBusy || !consent}>
              {status === "uploading" ? "Enviando…" : "Usar foto"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function buildPhotoFormData(file: File, patientId: string): FormData {
  const formData = new FormData()
  formData.append("file", file)
  formData.append("patientId", patientId)
  // Só chega aqui com o consentimento marcado no modal.
  formData.append("consent", "true")
  return formData
}

/** Envia a foto guardada no cadastro, já com a criança criada. */
export async function uploadPendingPatientPhoto(file: File, patientId: string) {
  return uploadPatientPhotoAction(buildPhotoFormData(await compressPatientPhoto(file), patientId))
}
