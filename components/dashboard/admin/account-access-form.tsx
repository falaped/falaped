"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { updateAccountAccessAction } from "@/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TRIAL_DAYS, type AuthenticatedUserStatus } from "@/lib/account-status"
import type { ProfileUsageRow } from "@/modules/admin/list-profile-usage"

const STATUS_OPTIONS: { value: AuthenticatedUserStatus; label: string }[] = [
  { value: "unpaid", label: "Não pago (vale o trial)" },
  { value: "paid", label: "Pago" },
  { value: "blocked", label: "Bloqueado" },
]

/** `yyyy-mm-dd` do input date ↔ ISO. O trial vale até o fim do dia escolhido, em Brasília. */
function toDateInput(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" }) : ""
}
function fromDateInput(value: string): string | null {
  return value ? new Date(`${value}T23:59:59-03:00`).toISOString() : null
}

/** Admin define status e fim do teste grátis de uma conta. Só o admin muda isso. */
export function AccountAccessForm({ row }: { row: ProfileUsageRow }) {
  const router = useRouter()
  const [status, setStatus] = React.useState<AuthenticatedUserStatus>(
    (row.status as AuthenticatedUserStatus) ?? "unpaid",
  )
  const [trialEnd, setTrialEnd] = React.useState(toDateInput(row.trial_ends_at))
  const [saving, setSaving] = React.useState(false)

  function extendTrial() {
    const from = Math.max(Date.now(), row.trial_ends_at ? new Date(row.trial_ends_at).getTime() : 0)
    setTrialEnd(toDateInput(new Date(from + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString()))
  }

  async function save() {
    setSaving(true)
    try {
      const result = await updateAccountAccessAction({
        profileId: row.profile_id,
        status,
        trialEndsAt: fromDateInput(trialEnd),
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Acesso atualizado.")
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="access-status">Status</Label>
        <Select value={status} onValueChange={(value) => setStatus(value as AuthenticatedUserStatus)}>
          <SelectTrigger id="access-status" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="access-trial">Teste grátis até</Label>
          <button type="button" onClick={extendTrial} className="text-xs text-primary hover:underline">
            +{TRIAL_DAYS} dias
          </button>
        </div>
        <Input
          id="access-trial"
          type="date"
          value={trialEnd}
          onChange={(event) => setTrialEnd(event.target.value)}
        />
      </div>
      <Button variant="outline" onClick={save} disabled={saving}>
        {saving ? "Salvando…" : "Salvar acesso"}
      </Button>
    </div>
  )
}
