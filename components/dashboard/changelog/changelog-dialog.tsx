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

const SEEN_KEY = "falaped:changelog:seen"

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

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      writeSeen(LATEST_RELEASE.id)
      setHasUnseen(false)
    }
  }

  return (
    <>
      <SidebarMenuItem>
        <SidebarMenuButton
          tooltip="Novidades"
          onClick={() => setOpen(true)}
          className={cn(hasUnseen && "text-primary hover:text-primary")}
        >
          {/* A animação só roda enquanto há novidade não vista, e só para quem
              não pediu menos movimento no sistema — chamar atenção de quem
              desligou animação é ignorar a preferência, não insistir. */}
          <SparklesIcon className={cn(hasUnseen && "motion-safe:animate-pulse")} />
          <span className={cn(hasUnseen && "font-medium")}>Novidades</span>
          {hasUnseen ? (
            <span
              className="relative ml-auto flex h-2 w-2 shrink-0"
              aria-label="Há novidades que você ainda não viu"
            >
              <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 motion-safe:animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
          ) : null}
        </SidebarMenuButton>
      </SidebarMenuItem>

      <Dialog open={open} onOpenChange={handleOpenChange}>
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
            <Button type="button" onClick={() => handleOpenChange(false)}>
              Entendi
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
