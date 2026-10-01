"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

import { addSubscriptionPaymentAction } from "@/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: "America/Sao_Paulo" })

/** `yyyy-mm-dd` + 1 mês, no mesmo dia (31/01 → 03/03 pelo Date; aceitável para um padrão editável). */
function plusOneMonth(date: string): string {
  const d = new Date(`${date}T12:00:00`)
  d.setMonth(d.getMonth() + 1)
  return d.toISOString().slice(0, 10)
}

/** Lança um pagamento manual: valor, quando pagou e até quando vale. */
export function PaymentForm({ profileId, defaultAmount }: { profileId: string; defaultAmount: string }) {
  const router = useRouter()
  const [amount, setAmount] = React.useState(defaultAmount)
  const [paidAt, setPaidAt] = React.useState(today)
  const [validUntil, setValidUntil] = React.useState(() => plusOneMonth(today()))
  const [note, setNote] = React.useState("")
  const [saving, setSaving] = React.useState(false)

  async function save(event: React.FormEvent) {
    event.preventDefault()
    const cents = Math.round(Number(amount.replace(/\./g, "").replace(",", ".")) * 100)
    if (!Number.isFinite(cents) || cents < 0) {
      toast.error("Valor inválido.")
      return
    }
    setSaving(true)
    try {
      const result = await addSubscriptionPaymentAction({
        profileId,
        amountCents: cents,
        paidAt,
        validUntil,
        note: note.trim() || null,
      })
      if (!result.ok) {
        toast.error(result.error)
        return
      }
      toast.success("Pagamento lançado.")
      setNote("")
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={save} className="grid gap-3 sm:grid-cols-[8rem_1fr_1fr] sm:items-end">
      <div className="grid gap-1.5">
        <Label htmlFor="pay-amount">Valor (R$)</Label>
        <Input id="pay-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="pay-at">Pagou em</Label>
        <Input
          id="pay-at"
          type="date"
          value={paidAt}
          onChange={(e) => {
            setPaidAt(e.target.value)
            if (e.target.value) setValidUntil(plusOneMonth(e.target.value))
          }}
        />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="pay-until">Vale até</Label>
        <Input id="pay-until" type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} />
      </div>
      <Input
        className="sm:col-span-2"
        placeholder="Observação (ex.: Pix, preço de fundador)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        aria-label="Observação"
      />
      <Button type="submit" disabled={saving || !paidAt || !validUntil}>
        {saving ? "Lançando…" : "Lançar pagamento"}
      </Button>
    </form>
  )
}
