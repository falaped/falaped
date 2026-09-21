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
          className="relative overflow-hidden bg-primary/15 text-primary ring-1 ring-primary/50 shadow-sm hover:bg-primary/20 hover:text-primary"
        >
          {/* Brilho varrendo a linha, sem condição de "reduzir movimento": o
              dono do produto pediu o item sempre animado. Se algum dia isso
              incomodar, é devolver o prefixo motion-safe: nesta classe. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-transparent via-primary/30 to-transparent bg-[length:380px_100%] bg-no-repeat animate-shimmer"
          />

          <SparklesIcon className="relative animate-pulse" />
          <span className="relative font-semibold">Novidades</span>

          <span className="relative ml-auto flex shrink-0 items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
            {/* Pulso, não salto: a linha precisa de overflow-hidden para o
                brilho não vazar, e qualquer animação que desloque o selo o
                faria ser cortado na borda. Piscar chama atenção sem sair. */}
            <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase leading-none tracking-wide text-primary-foreground animate-pulse">
              Novo
            </span>
          </span>
        </SidebarMenuButton>
      </SidebarMenuItem>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
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
