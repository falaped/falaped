"use client"

import { useEffect, useState } from "react"
import { MegaphoneIcon, SparklesIcon } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { LATEST_RELEASE } from "@/lib/changelog"
import { formatDate } from "@/lib/formatters"

// v2: antes bastava fechar o modal para marcar como lido, o que apagava o
// destaque de quem só tinha dispensado a janela. A chave mudou de nome para
// que todo mundo volte a ver as novidades uma vez com a regra nova.
const SEEN_KEY = "falaped:changelog:seen:v2"

/**
 * Lê e grava qual versão o médico já viu. É conveniência por navegador, não
 * dado clínico: em aba anônima ou com armazenamento bloqueado o acesso lança, e
 * aí o modal simplesmente não abre sozinho — o item da barra lateral continua
 * funcionando.
 */
function readSeen(): string | null {
  try {
    return window.localStorage.getItem(SEEN_KEY)
  } catch {
    return null
  }
}

function writeSeen(id: string) {
  try {
    window.localStorage.setItem(SEEN_KEY, id)
  } catch {
    // Sem armazenamento: o modal reaparece na próxima visita. Aceitável.
  }
}

/**
 * Item "Novidades" da barra lateral mais o modal que ele abre.
 *
 * O item fica destacado e animado SEMPRE — decisão do produto: é a porta das
 * novidades e deve saltar aos olhos o tempo todo, mesmo depois de lidas. O
 * armazenamento local serve só para uma coisa: não reabrir o modal sozinho a
 * cada navegação de quem já o viu.
 */
export function ChangelogMenuItem() {
  const [open, setOpen] = useState(false)

  // localStorage só no efeito: ler durante a renderização quebraria a
  // hidratação, porque o servidor não tem como saber o que este navegador viu.
  useEffect(() => {
    if (readSeen() === LATEST_RELEASE.id) return
    setOpen(true)
  }, [])

  function handleOpenChange(next: boolean) {
    setOpen(next)
    // Fechar de qualquer jeito basta para o modal não abrir sozinho de novo —
    // não apaga o destaque do menu, que é permanente.
    if (!next) writeSeen(LATEST_RELEASE.id)
  }

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          tooltip={`${LATEST_RELEASE.entries.length} novidades no app`}
          onClick={() => setOpen(true)}
        >
          <MegaphoneIcon />
          <span>Novidades</span>
          {/* Guia 2.0: o destaque é só o ponto azul, sem brilho nem pulso. */}
          <span
            aria-hidden
            className="ml-auto size-2 shrink-0 rounded-full bg-primary group-data-[collapsible=icon]:absolute group-data-[collapsible=icon]:top-1.5 group-data-[collapsible=icon]:right-1.5"
          />
        </SidebarMenuButton>
      </SidebarMenuItem>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="flex max-h-[85vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl">
          {/* Protótipo i1: só a versão nova, em destaque, e uma lista curta do que mudou. */}
          <DialogHeader className="m-2 mb-0 rounded-xl border border-primary-soft-border bg-highlight px-6 py-5 text-left">
            <p className="flex items-center gap-2 text-caption font-medium text-primary-ink-strong">
              <SparklesIcon className="size-4" aria-hidden />
              Novidade · {formatDate(LATEST_RELEASE.date)}
            </p>
            <DialogTitle className="font-display text-page font-semibold">{LATEST_RELEASE.title}</DialogTitle>
            <DialogDescription>{LATEST_RELEASE.summary}</DialogDescription>
          </DialogHeader>

          <ul className="flex-1 divide-y divide-border overflow-y-auto px-6">
            {LATEST_RELEASE.entries.map((entry) => (
              <li key={entry.title} className="flex gap-4 py-4">
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-ink-strong">
                  <entry.icon className="size-4" aria-hidden />
                </span>
                <div>
                  <p className="font-semibold">{entry.title}</p>
                  <p className="mt-0.5 text-muted-foreground">{entry.description}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="flex items-center gap-3 border-t border-border px-6 py-4">
            <span className="text-caption text-subtle-foreground">Abre de novo pelo item Novidades no menu.</span>
            <Button type="button" className="ml-auto" onClick={() => handleOpenChange(false)}>
              Entendi
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
