"use client"

import { Check } from "lucide-react"

import type { BookDetails, RelativeRole } from "@/lib/schemas/book"
import { cn } from "@/lib/utils"

/** Estado do formulário (com caixas ligadas/desligadas). Vira `BookDetails` em `draftToDetails`. */
export type DetailsDraft = {
  pet: { on: boolean; kind: string; name: string }
  relatives: Record<Exclude<RelativeRole, "irmão" | "irmã">, { on: boolean; name: string }>
  sibling: { on: boolean; role: "irmão" | "irmã"; name: string; older: "mais velho" | "mais novo" | "" }
  toy: { on: boolean; name: string }
  extra: { on: boolean; text: string }
}

export const emptyDraft: DetailsDraft = {
  pet: { on: false, kind: "", name: "" },
  relatives: {
    vovó: { on: false, name: "" },
    vovô: { on: false, name: "" },
    madrinha: { on: false, name: "" },
    padrinho: { on: false, name: "" },
  },
  sibling: { on: false, role: "irmão", name: "", older: "" },
  toy: { on: false, name: "" },
  extra: { on: false, text: "" },
}

const RELATIVE_LABEL: Record<keyof DetailsDraft["relatives"], string> = { vovó: "Vovó", vovô: "Vovô", madrinha: "Madrinha", padrinho: "Padrinho" }

/** Só o que está ligado e preenchido. */
export function draftToDetails(d: DetailsDraft): BookDetails {
  const relatives: BookDetails["relatives"] = []
  for (const role of Object.keys(RELATIVE_LABEL) as (keyof DetailsDraft["relatives"])[]) {
    const r = d.relatives[role]
    if (r.on && r.name.trim()) relatives.push({ role, name: r.name.trim(), note: null })
  }
  if (d.sibling.on && d.sibling.name.trim()) {
    const older = d.sibling.older ? `${d.sibling.older === "mais velho" ? (d.sibling.role === "irmã" ? "mais velha" : "mais velho") : d.sibling.role === "irmã" ? "mais nova" : "mais novo"}` : null
    relatives.push({ role: d.sibling.role, name: d.sibling.name.trim(), note: older })
  }
  return {
    pet: d.pet.on && d.pet.name.trim() ? { kind: d.pet.kind.trim() || "animal", name: d.pet.name.trim() } : null,
    relatives,
    favoriteToy: d.toy.on && d.toy.name.trim() ? d.toy.name.trim() : null,
    extra: d.extra.on && d.extra.text.trim() ? d.extra.text.trim() : null,
  }
}

export function hasDetails(details: BookDetails) {
  return Boolean(details.pet || details.relatives?.length || details.favoriteToy || details.extra)
}

/** Resumo em uma linha para a revisão. */
export function describeDetails(details: BookDetails) {
  const parts: string[] = []
  if (details.pet) parts.push(`${details.pet.name} (${details.pet.kind})`)
  for (const r of details.relatives ?? []) parts.push(`${r.role.charAt(0).toUpperCase()}${r.role.slice(1)} ${r.name}${r.note ? `, ${r.note}` : ""}`)
  if (details.favoriteToy) parts.push(`brinquedo: ${details.favoriteToy}`)
  if (details.extra) parts.push("observações")
  return parts.join(" · ")
}

const FIELD = "h-11 w-full rounded-xl border-2 border-ink bg-white px-3.5 text-[15px] font-medium text-ink outline-none focus:shadow-[0_0_0_4px_#b8e0f5]"

function Toggle({ on, label, onChange, children }: { on: boolean; label: string; onChange: (on: boolean) => void; children?: React.ReactNode }) {
  return (
    <li className={cn("rounded-[14px] border-2 border-ink transition-colors", on ? "bg-accent shadow-hard-xs" : "bg-white")}>
      <label className="flex cursor-pointer items-center gap-3 px-3.5 py-3">
        <input type="checkbox" checked={on} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
        <span className={cn("grid size-6 shrink-0 place-items-center rounded-md border-2 border-ink", on ? "bg-ink text-white" : "bg-white")} aria-hidden>
          {on && <Check className="size-3.5" strokeWidth={3.4} />}
        </span>
        <span className="text-[15px] font-bold">{label}</span>
      </label>
      {on && children && <div className="grid gap-2.5 border-t-2 border-dashed border-ink px-3.5 pb-3.5 pt-3 sm:grid-cols-2">{children}</div>}
    </li>
  )
}

/** Caixas dos detalhes que entram na história. Cada uma abre seus campos ao ser marcada. */
export function StoryDetailsFields({ value, onChange }: { value: DetailsDraft; onChange: (next: DetailsDraft) => void }) {
  const set = (patch: Partial<DetailsDraft>) => onChange({ ...value, ...patch })
  return (
    <ul className="grid gap-2.5">
      <Toggle on={value.pet.on} label="Animal de estimação" onChange={(on) => set({ pet: { ...value.pet, on } })}>
        <input value={value.pet.name} onChange={(e) => set({ pet: { ...value.pet, name: e.target.value } })} maxLength={40} placeholder="Nome (Pipoca)" className={FIELD} aria-label="Nome do animal" />
        <input value={value.pet.kind} onChange={(e) => set({ pet: { ...value.pet, kind: e.target.value } })} maxLength={40} placeholder="Tipo ou raça (pug)" className={FIELD} aria-label="Tipo ou raça do animal" />
      </Toggle>
      {(Object.keys(RELATIVE_LABEL) as (keyof DetailsDraft["relatives"])[]).map((role) => (
        <Toggle key={role} on={value.relatives[role].on} label={RELATIVE_LABEL[role]} onChange={(on) => set({ relatives: { ...value.relatives, [role]: { ...value.relatives[role], on } } })}>
          <input
            value={value.relatives[role].name}
            onChange={(e) => set({ relatives: { ...value.relatives, [role]: { ...value.relatives[role], name: e.target.value } } })}
            maxLength={40}
            placeholder={`Nome (${role === "vovó" ? "Nice" : role === "vovô" ? "Geraldinho" : "Gabi"})`}
            className={cn(FIELD, "sm:col-span-2")}
            aria-label={`Nome: ${RELATIVE_LABEL[role]}`}
          />
        </Toggle>
      ))}
      <Toggle on={value.sibling.on} label="Irmão ou irmã" onChange={(on) => set({ sibling: { ...value.sibling, on } })}>
        <div className="flex gap-2">
          {(["irmão", "irmã"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => set({ sibling: { ...value.sibling, role: r } })}
              className={cn("h-11 flex-1 rounded-xl border-2 border-ink text-sm font-bold capitalize", value.sibling.role === r ? "bg-primary" : "bg-white")}
            >
              {r}
            </button>
          ))}
        </div>
        <input value={value.sibling.name} onChange={(e) => set({ sibling: { ...value.sibling, name: e.target.value } })} maxLength={40} placeholder="Nome" className={FIELD} aria-label="Nome do irmão ou irmã" />
        <div className="flex gap-2 sm:col-span-2">
          {(["mais velho", "mais novo"] as const).map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => set({ sibling: { ...value.sibling, older: value.sibling.older === o ? "" : o } })}
              className={cn("h-10 flex-1 rounded-xl border-2 border-ink text-sm font-bold", value.sibling.older === o ? "bg-primary" : "bg-white")}
            >
              {value.sibling.role === "irmã" ? o.replace("velho", "velha").replace("novo", "nova") : o}
            </button>
          ))}
        </div>
      </Toggle>
      <Toggle on={value.toy.on} label="Brinquedo ou pelúcia favorita" onChange={(on) => set({ toy: { ...value.toy, on } })}>
        <input value={value.toy.name} onChange={(e) => set({ toy: { ...value.toy, name: e.target.value } })} maxLength={60} placeholder="Ex.: ursinho Bob, carrinho vermelho" className={cn(FIELD, "sm:col-span-2")} aria-label="Brinquedo favorito" />
      </Toggle>
      <Toggle on={value.extra.on} label="Outra informação" onChange={(on) => set({ extra: { ...value.extra, on } })}>
        <textarea
          value={value.extra.text}
          onChange={(e) => set({ extra: { ...value.extra, text: e.target.value } })}
          maxLength={300}
          rows={3}
          placeholder="Algo que a história pode aproveitar: mora perto da praia, adora dinossauros, chama a avó de Vovó Nini..."
          className={cn(FIELD, "h-auto resize-none py-2.5 sm:col-span-2")}
          aria-label="Outra informação"
        />
      </Toggle>
    </ul>
  )
}
