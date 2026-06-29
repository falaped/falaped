"use client"

import { useRef, useState } from "react"
import { toast } from "sonner"

import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Field,
  FieldContent,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field"
import { compressPatientPhoto } from "@/lib/compress-image"
import { getPatientInitials } from "@/lib/get-patient-initials"
import { uploadPatientPhotoAction } from "@/actions"

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"]
const MAX_SIZE_BYTES = 2 * 1024 * 1024 // 2 MB

const MSG_INVALID_TYPE =
  "Tipo de arquivo não permitido. Use PNG, JPEG ou WebP."
const MSG_TOO_LARGE = "Arquivo muito grande. Envie uma imagem de até 2 MB."
const MSG_NO_CONSENT =
  "É necessário confirmar o consentimento do responsável para enviar a foto."
const MSG_GENERIC = "Não foi possível enviar a foto. Tente novamente."

type Status = "idle" | "optimizing" | "uploading"

export function PatientFormPhotoField({
  patientId,
  patientName,
  initialPhotoUrl,
}: {
  patientId: string
  patientName: string
  initialPhotoUrl?: string | null
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    initialPhotoUrl ?? null,
  )
  const [hasPhoto, setHasPhoto] = useState(Boolean(initialPhotoUrl))
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [consent, setConsent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>("idle")

  const isBusy = status !== "idle"

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    setError(null)
    if (!file) {
      setSelectedFile(null)
      return
    }

    // Validação cliente espelha o module (a autoritativa é a action/module).
    if (!ALLOWED_TYPES.includes(file.type)) {
      setSelectedFile(null)
      setError(MSG_INVALID_TYPE)
      return
    }
    if (file.size > MAX_SIZE_BYTES) {
      setSelectedFile(null)
      setError(MSG_TOO_LARGE)
      return
    }

    // Preview local imediato.
    setPreviewUrl(URL.createObjectURL(file))
    setSelectedFile(file)
    // Re-exigir consentimento a cada nova foto / substituição (D-06).
    setConsent(false)
  }

  async function handleUpload() {
    setError(null)
    if (!selectedFile) {
      setError("Selecione uma imagem.")
      return
    }
    if (!consent) {
      setError(MSG_NO_CONSENT)
      return
    }

    try {
      setStatus("optimizing")
      const compressed = await compressPatientPhoto(selectedFile)

      setStatus("uploading")
      const formData = new FormData()
      formData.append("file", compressed)
      formData.append("patientId", patientId)
      formData.append("consent", consent ? "true" : "false")

      const result = await uploadPatientPhotoAction(formData)
      if (result.ok) {
        toast.success("Foto atualizada.")
        setHasPhoto(true)
        setSelectedFile(null)
      } else {
        setError(result.error)
        toast.error(result.error)
      }
    } catch {
      setError(MSG_GENERIC)
      toast.error(MSG_GENERIC)
    } finally {
      setStatus("idle")
    }
  }

  const buttonLabel = hasPhoto ? "Trocar foto" : "Enviar foto"
  const statusLabel =
    status === "optimizing"
      ? "Otimizando imagem…"
      : status === "uploading"
        ? "Enviando…"
        : null

  return (
    <Field>
      <FieldLabel htmlFor="patient-photo">Foto do paciente</FieldLabel>
      <FieldContent>
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16 shrink-0 border border-border/80">
            {previewUrl ? (
              <AvatarImage
                src={previewUrl}
                alt={`Foto de ${patientName}`}
              />
            ) : null}
            <AvatarFallback className="bg-primary/10 text-base font-semibold text-primary">
              {getPatientInitials(patientName)}
            </AvatarFallback>
          </Avatar>

          <div className="flex min-w-0 flex-col gap-2">
            <input
              ref={inputRef}
              id="patient-photo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleFileChange}
              disabled={isBusy}
            />
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => inputRef.current?.click()}
                disabled={isBusy}
              >
                {buttonLabel}
              </Button>
              {selectedFile ? (
                <Button
                  type="button"
                  size="sm"
                  onClick={handleUpload}
                  disabled={isBusy || !consent}
                >
                  {status === "uploading" ? "Enviando…" : "Salvar foto"}
                </Button>
              ) : null}
              {statusLabel ? (
                <span className="text-sm text-muted-foreground">
                  {statusLabel}
                </span>
              ) : null}
            </div>
          </div>
        </div>

        <label className="flex items-start gap-2 text-sm">
          <Checkbox
            checked={consent}
            onCheckedChange={(value) => {
              setConsent(value === true)
              if (value === true) setError(null)
            }}
            disabled={isBusy}
            className="mt-0.5"
          />
          <span>
            Confirmo o consentimento do responsável para armazenar esta foto.
          </span>
        </label>

        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <FieldDescription>
          PNG, JPEG ou WebP. A imagem é otimizada automaticamente antes do envio.
        </FieldDescription>
      </FieldContent>
    </Field>
  )
}
