"use client"

import { useEffect, useState } from "react"
import { SparklesIcon } from "lucide-react"

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
import { CHANGELOG, LATEST_RELEASE } from "@/lib/changelog"
import { formatDate } from "@/lib/formatters"
import { cn } from "@/lib/utils"

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
 * Item "Novidades" da barra lateral mais o modal que ele abre. O modal também
 * abre sozinho, uma vez, quando há versão que este navegador ainda não viu.
 */
export function ChangelogMenuItem() {
  const [open, setOpen] = useState(false)
  const [hasUnseen, setHasUnseen] = useState(false)

  // localStorage só no efeito: ler durante a renderização quebraria a
  // hidratação, porque o servidor não tem como saber o que este navegador viu.
  useEffect(() => {
    if (readSeen() === LATEST_RELEASE.id) return
    setHasUnseen(true)
    setOpen(true)
  }, [])

  // Fechar não é ler: sair pelo Esc, pelo X ou clicando fora apenas fecha, e o
  // destaque na barra lateral continua até o médico confirmar no botão.
  function markAsRead() {
    writeSeen(LATEST_RELEASE.id)
    setHasUnseen(false)
    setOpen(false)
  }

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          tooltip={
            hasUnseen
              ? `${LATEST_RELEASE.entries.length} novidades no app`
              : "Novidades"
          }
          onClick={() => setOpen(true)}
          className={cn(
            "relative overflow-hidden",
            hasUnseen &&
              "bg-primary/15 text-primary ring-1 ring-primary/50 shadow-sm hover:bg-primary/20 hover:text-primary",
          )}
        >
          {/* Brilho varrendo a linha. Só enquanto há novidade não vista, e só
              para quem não pediu menos movimento no sistema: insistir com quem
              desligou animação é ignorar a preferência, não chamar atenção. */}
          {hasUnseen ? (
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-primary/30 to-transparent bg-[length:380px_100%] bg-no-repeat motion-safe:animate-shimmer"
            />
          ) : null}

          <SparklesIcon
            className={cn("relative", hasUnseen && "motion-safe:animate-pulse")}
          />
          <span className={cn("relative", hasUnseen && "font-semibold")}>
            Novidades
          </span>

          {hasUnseen ? (
            <span className="relative ml-auto flex shrink-0 items-center gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 motion-safe:animate-ping" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none tracking-wide text-primary-foreground motion-safe:animate-bounce">
                Novo
              </span>
            </span>
          ) : null}
        </SidebarMenuButton>
      </SidebarMenuItem>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <SparklesIcon className="h-5 w-5 text-primary" aria-hidden />
              Novidades do Falaped
            </DialogTitle>
            <DialogDescription>
              O que mudou no app desde a sua última visita.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-8">
            {CHANGELOG.map((release) => (
              <section key={release.id} className="flex flex-col gap-4">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {formatDate(release.date)}
                  </p>
                  <h3 className="mt-1 text-lg font-semibold tracking-tight">
                    {release.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {release.summary}
                  </p>
                </div>

                <ul className="flex flex-col gap-4">
                  {release.entries.map((entry) => (
                    <li
                      key={entry.title}
                      className="rounded-lg border border-border bg-muted/15 px-4 py-3"
                    >
                      <p className="text-sm font-medium text-foreground">
                        {entry.title}
                      </p>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {entry.description}
                      </p>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <div className="flex justify-end">
            <Button type="button" onClick={markAsRead}>
              Entendi
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
