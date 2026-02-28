"use client"

import { useState } from "react"
import { UserIcon, AlertTriangleIcon } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
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
import { deleteMyAccountAction, updateStatusAction } from "./actions"
import type { Profile } from "@/modules/profiles/get-profile-by-auth-user-id"
import type { AuthenticatedUserStatus } from "@/modules/authenticated-users/update-authenticated-user-status"

function formatPhone(phone: string): string {
  if (!phone || phone.length < 10) return phone
  const ddd = phone.slice(2, 4)
  const rest = phone.slice(4)
  const pre = rest.length === 9 ? `${rest.slice(0, 5)}-${rest.slice(5)}` : rest
  return `(${ddd}) ${pre}`
}

const STATUS_OPTIONS: { value: AuthenticatedUserStatus; label: string }[] = [
  { value: "paid", label: "Pago" },
  { value: "unpaid", label: "Não pago" },
  { value: "blocked", label: "Bloqueado" },
]

function normalizeStatus(
  raw: string
): AuthenticatedUserStatus {
  if (raw === "paid" || raw === "unpaid" || raw === "blocked") return raw
  return "unpaid"
}

type ProfileContentProps = {
  profile: Profile
  status: AuthenticatedUserStatus
}

export function ProfileContent({ profile, status }: ProfileContentProps) {
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [statusValue, setStatusValue] = useState<AuthenticatedUserStatus>(
    normalizeStatus(status)
  )
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [statusError, setStatusError] = useState<string | null>(null)

  const fullName = [profile.first_name, profile.surname].filter(Boolean).join(" ").trim() || "—"
  const email = profile.email?.trim() || "—"
  const phone = profile.phone ? formatPhone(profile.phone) : "—"
  const crm = profile.crm?.trim() || "—"
  const rqe = profile.rqe?.trim() || "—"

  async function handleStatusChange(newStatus: AuthenticatedUserStatus) {
    setStatusError(null)
    setStatusUpdating(true)
    try {
      const result = await updateStatusAction(newStatus)
      if (result.ok) {
        setStatusValue(newStatus)
        return
      }
      setStatusError(result.error)
    } finally {
      setStatusUpdating(false)
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
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="flex flex-col gap-8 max-w-2xl">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserIcon className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Dados da conta</CardTitle>
          </div>
          <CardDescription>
            Informações do seu perfil no dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Nome</p>
            <p className="text-sm">{fullName}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">E-mail</p>
            <p className="text-sm">{email}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">Telefone</p>
            <p className="text-sm font-mono">{phone}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">CRM</p>
            <p className="text-sm">{crm}</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">RQE</p>
            <p className="text-sm">{rqe}</p>
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="account-status" className="text-sm font-medium text-muted-foreground">
              Status da conta
            </Label>
            <Select
              value={statusValue}
              onValueChange={(value) => handleStatusChange(value as AuthenticatedUserStatus)}
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
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangleIcon className="h-5 w-5 text-destructive" />
            <CardTitle className="text-destructive">Zona de exclusão</CardTitle>
          </div>
          <CardDescription>
            Excluir sua conta é irreversível. Todos os seus dados serão removidos: casos, mensagens, pacientes e vínculos com WhatsApp.
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
                Excluir minha conta
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir conta permanentemente?</AlertDialogTitle>
                <AlertDialogDescription>
                  Você perderá todos os seus casos, mensagens de atendimento, pacientes cadastrados e o vínculo com o WhatsApp. Esta ação não pode ser desfeita.
                </AlertDialogDescription>
              </AlertDialogHeader>
              {deleteError && (
                <p className="text-sm text-destructive px-1" role="alert">
                  {deleteError}
                </p>
              )}
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleteLoading}>Cancelar</AlertDialogCancel>
                <Button
                  variant="destructive"
                  disabled={deleteLoading}
                  onClick={handleConfirmDelete}
                >
                  {deleteLoading ? "Excluindo…" : "Sim, excluir minha conta"}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  )
}
