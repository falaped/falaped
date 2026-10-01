"use client"

import * as React from "react"
import { PlusIcon } from "lucide-react"

import { PaymentForm } from "@/components/dashboard/admin/payment-form"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

/** Botão "Lançar" da Assinatura: abre o formulário de pagamento manual. */
export function PaymentDialog({ profileId, name, defaultAmount }: { profileId: string; name: string; defaultAmount: string }) {
  const [open, setOpen] = React.useState(false)
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <PlusIcon aria-hidden />
          Lançar
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Lançar pagamento</DialogTitle>
          <DialogDescription>{name}: o pagamento marca a conta como paga até a data escolhida.</DialogDescription>
        </DialogHeader>
        <PaymentForm profileId={profileId} defaultAmount={defaultAmount} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  )
}
