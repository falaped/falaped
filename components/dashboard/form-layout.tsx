"use client"

import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"

/**
 * Peças dos formulários longos da 2.0 (ficha da criança, perfil): card de seção com
 * título e o que ela muda, índice lateral que acompanha a rolagem, e campo com ajuda.
 */
export function FormCard({
  id,
  title,
  description,
  className,
  children,
}: {
  id: string
  title: React.ReactNode
  description: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <section id={id} className={cn("scroll-mt-6 rounded-xl border border-border bg-card", className)}>
      <div className="border-b border-border px-6 py-4">
        <h2 className="font-display text-section font-semibold">{title}</h2>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-col gap-5 px-6 py-5">{children}</div>
    </section>
  )
}

/** Seção do índice que está no topo da tela. */
export function useActiveSection(ids: string[]) {
  const [active, setActive] = useState(ids[0])
  const key = ids.join()
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((entry) => entry.isIntersecting)
        if (visible.length) setActive(visible[0].target.id)
      },
      { rootMargin: "0px 0px -70% 0px" },
    )
    for (const id of key.split(",")) {
      const element = document.getElementById(id)
      if (element) observer.observe(element)
    }
    return () => observer.disconnect()
  }, [key])
  return active
}

/** Índice lateral fixo; a seção com erro ganha um ponto vermelho. */
export function SectionNav({
  label,
  sections,
}: {
  label: string
  sections: Array<{ id: string; title: string; hasError?: boolean }>
}) {
  const active = useActiveSection(sections.map((section) => section.id))
  return (
    <nav aria-label={label} className="sticky top-6 flex flex-col gap-0.5">
      {sections.map((section) => (
        <a
          key={section.id}
          href={`#${section.id}`}
          aria-current={active === section.id ? "true" : undefined}
          className={cn(
            "flex h-9 items-center gap-2 rounded-lg px-3",
            active === section.id
              ? "bg-primary-soft font-semibold text-primary-ink-strong"
              : "text-muted-foreground hover:bg-accent hover:text-foreground",
          )}
        >
          {section.title}
          {section.hasError ? <span className="ml-auto size-2 rounded-full bg-danger-text" aria-label="Tem erro" /> : null}
        </a>
      ))}
    </nav>
  )
}

/** Rótulo em cima, ajuda embaixo; o erro toma o lugar da ajuda e diz o que fazer. */
export function FieldShell({
  htmlFor,
  label,
  help,
  error,
  className,
  children,
}: {
  htmlFor?: string
  label: React.ReactNode
  help?: React.ReactNode
  error?: string
  className?: string
  children: React.ReactNode
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="inline-flex items-center gap-1.5 text-label font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <span role="alert" className="text-caption text-danger-text">
          {error}
        </span>
      ) : help ? (
        <span className="text-caption text-subtle-foreground">{help}</span>
      ) : null}
    </div>
  )
}

/** "a", "a e b", "a, b e c". */
export function joinPtBr(items: string[]): string {
  return items.length <= 1 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} e ${items.at(-1)}`
}
