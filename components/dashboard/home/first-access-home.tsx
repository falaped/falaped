import Link from "next/link"
import { ArrowRightIcon, CheckIcon, FileTextIcon, PlusIcon, StethoscopeIcon, UsersIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { isInTrial } from "@/lib/account-status"
import { cn } from "@/lib/utils"

type Step = { done: boolean; title: string; detail: string; href?: string }

export type FirstAccessHomeProps = {
  firstName: string | null
  crm: string | null
  hasLogo: boolean
  trialEndsAt: string | null
  patientsCount: number
  casesCount: number
  documentsCount: number
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Início enquanto o médico ainda não atendeu ninguém (protótipo a12o):
 * uma ação principal, Iniciar consulta, e os passos que mostram o caminho.
 */
export function FirstAccessHome(props: FirstAccessHomeProps) {
  const steps: Step[] = [
    props.crm
      ? { done: true, title: "Conta criada", detail: `CRM ${props.crm} já vai nos documentos.` }
      : { done: true, title: "Conta criada", detail: "Falta o CRM, que sai nos documentos.", href: "/dashboard/profile" },
    { done: props.casesCount > 0, title: "Atenda o primeiro paciente", detail: "Busque ou cadastre a criança e converse com o assistente." },
    { done: props.documentsCount > 0, title: "Emita uma receita ou atestado", detail: "Direto da consulta, sem trocar de tela." },
    { done: props.hasLogo, title: "Personalize o cabeçalho dos documentos", detail: "Logo e endereço do consultório.", href: "/dashboard/profile" },
  ]
  const nextIndex = steps.findIndex((step) => !step.done)
  const trialDaysLeft =
    props.trialEndsAt && isInTrial(props.trialEndsAt)
      ? Math.ceil((new Date(props.trialEndsAt).getTime() - Date.now()) / DAY_MS)
      : null

  const counters = [
    { icon: UsersIcon, label: "Pacientes", value: props.patientsCount },
    { icon: StethoscopeIcon, label: "Consultas", value: props.casesCount },
    { icon: FileTextIcon, label: "Documentos emitidos", value: props.documentsCount },
  ]

  return (
    <div className="mx-auto flex w-full max-w-[1180px] flex-col gap-6">
      <section className="grid items-center gap-8 rounded-xl border border-primary-soft-border bg-highlight p-8 shadow-sm lg:grid-cols-[1.15fr_1fr]">
        <div>
          {trialDaysLeft != null ? (
            <Badge>
              Teste grátis · {trialDaysLeft} {trialDaysLeft === 1 ? "dia" : "dias"}
            </Badge>
          ) : null}
          <h1 className="mt-4 font-display text-display font-semibold">
            {props.firstName ? `Olá, ${props.firstName}.` : "Olá."}
            <br />
            Vamos para a 1ª consulta?
          </h1>
          <p className="mt-3 max-w-[46ch] text-read text-muted-foreground">
            Leva uns 2 minutos. Você pode cadastrar o paciente na hora.
          </p>
          <Button asChild size="lg" className="mt-6">
            <Link href="/dashboard/cases/select-patient">
              <PlusIcon data-icon="inline-start" />
              Iniciar consulta
            </Link>
          </Button>
        </div>

        <ol className="rounded-xl border border-border bg-card p-2 shadow-xs">
          {steps.map((step, i) => {
            const isNext = i === nextIndex
            return (
              <li
                key={step.title}
                aria-current={isNext ? "step" : undefined}
                className={cn("flex items-start gap-3 rounded-lg px-3 py-3", isNext && "bg-primary-soft")}
              >
                <span
                  className={cn(
                    "num mt-0.5 grid size-7 shrink-0 place-items-center rounded-full text-caption font-semibold",
                    step.done
                      ? "bg-success-soft text-success-text"
                      : isNext
                        ? "bg-primary text-primary-foreground"
                        : "border border-border-strong text-muted-foreground",
                  )}
                >
                  {step.done ? <CheckIcon className="size-3.5" aria-label="Feito" /> : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className={cn("font-semibold", step.done && "text-muted-foreground")}>{step.title}</div>
                  <div className="text-caption text-muted-foreground">{step.detail}</div>
                </div>
                {step.href ? (
                  <Button asChild variant="ghost" size="xs" className="mt-0.5">
                    <Link href={step.href}>
                      Perfil
                      <ArrowRightIcon data-icon="inline-end" />
                    </Link>
                  </Button>
                ) : null}
              </li>
            )
          })}
        </ol>
      </section>

      <section className="grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-card">
        {counters.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-center gap-3 px-6 py-4 text-muted-foreground">
            <Icon className="size-4 text-subtle-foreground" aria-hidden />
            <span className="num font-display text-section font-semibold text-foreground">{value}</span>
            {label}
          </div>
        ))}
      </section>
    </div>
  )
}
