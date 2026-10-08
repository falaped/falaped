import Link from "next/link"
import {
  ArrowRightIcon,
  CheckIcon,
  FilePlusIcon,
  FileCheckIcon,
  FileTextIcon,
  FilesIcon,
  GiftIcon,
  MessageCircleIcon,
  MicIcon,
  PillIcon,
  PlusIcon,
  ScanTextIcon,
  SearchIcon,
  SparklesIcon,
  SyringeIcon,
  UserPlusIcon,
  VideoIcon,
  type LucideIcon,
} from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { isInTrial } from "@/lib/account-status"
import { cn } from "@/lib/utils"

export type FirstAccessHomeProps = {
  firstName: string | null
  trialEndsAt: string | null
}

const DAY_MS = 24 * 60 * 60 * 1000
// Mesmo WhatsApp do atendimento do Falaped Books (modules/books/constants.ts).
const DEMO_CALL_URL = `https://wa.me/5531997815503?text=${encodeURIComponent("Olá! Acabei de criar minha conta no Falaped e queria marcar uma chamada rápida para conhecer o app.")}`

const MORE: { icon: LucideIcon; title: string; detail: string; href: string }[] = [
  { icon: FilesIcon, title: "Documento avulso", detail: "Receita, atestado ou encaminhamento sem abrir consulta.", href: "/dashboard/services" },
  { icon: SyringeIcon, title: "Vacinas", detail: "Calendário do SUS e da rede particular, para consulta.", href: "/dashboard/vaccines" },
  { icon: FilePlusIcon, title: "Receituário em branco", detail: "Seu papel timbrado, para escrever à mão.", href: "/dashboard/services?novo=em-branco" },
]

/**
 * Início enquanto o médico ainda não atendeu ninguém (protótipo a12o, versão 2):
 * a ação única Iniciar consulta e o que acontece numa consulta, com prévias da interface. Os dados das prévias são de exemplo.
 */
export function FirstAccessHome(props: FirstAccessHomeProps) {
  const trialDaysLeft =
    props.trialEndsAt && isInTrial(props.trialEndsAt)
      ? Math.ceil((new Date(props.trialEndsAt).getTime() - Date.now()) / DAY_MS)
      : null

  return (
    <div className="flex w-full max-w-[1440px] flex-col gap-8">
      <section className="flex flex-col justify-center rounded-xl border border-primary-soft-border bg-highlight p-10 shadow-sm">
        {trialDaysLeft != null ? (
          <Badge className="w-fit">
            <GiftIcon aria-hidden />
            Teste grátis · {trialDaysLeft} {trialDaysLeft === 1 ? "dia" : "dias"}
          </Badge>
        ) : null}
        <h1 className="mt-5 font-display text-[34px] leading-[42px] font-semibold tracking-[-0.02em]">
          {props.firstName ? `Olá, ${props.firstName}.` : "Olá."}
          <br />
          Vamos para a 1ª consulta?
        </h1>
        <p className="mt-3 max-w-[52ch] text-read text-muted-foreground">
          Busque ou cadastre a criança, grave um áudio ou digite o que viu, e o Falaped organiza a consulta e os
          documentos.
        </p>
        <div className="mt-7 flex items-center gap-4">
          <Button asChild size="lg" className="px-5">
            <Link href="/dashboard/cases/select-patient">
              <PlusIcon data-icon="inline-start" />
              Iniciar consulta
            </Link>
          </Button>
          <span className="text-caption text-subtle-foreground">ou use a busca do menu em qualquer tela</span>
        </div>
      </section>

      <section>
        <h2 className="font-display text-section font-semibold">Como é uma consulta no Falaped</h2>
        <p className="mt-0.5 text-muted-foreground">Três passos, numa tela só. Você revisa tudo antes de imprimir.</p>
        <div className="mt-4 grid grid-cols-3 gap-6">
          <FlowCard step={1} title="Ache ou cadastre a criança" detail="Pelo nome, responsável ou telefone. Sem cadastro? Cria na hora.">
            <div className="flex h-8 items-center gap-2 rounded-lg border border-input bg-card px-2.5 text-subtle-foreground">
              <SearchIcon className="size-3.5" aria-hidden />
              <span className="text-foreground">Hel</span>
            </div>
            <div className="mt-2 flex flex-col gap-1">
              <SampleRow initials="HD" name="Helena Duarte" detail="2a 3m · Carla (mãe)" active />
              <SampleRow initials="HM" name="Heitor Martins" detail="8m · Paulo (pai)" />
              <div className="flex items-center gap-2 px-2 py-1.5 text-caption font-medium text-primary-ink">
                <UserPlusIcon className="size-3.5" aria-hidden />
                Cadastrar paciente
              </div>
            </div>
          </FlowCard>

          <FlowCard step={2} title="Grave ou digite, o assistente organiza" detail="Você conta o que viu; ele monta o resumo e sugere as escalas da idade.">
            <div className="ml-auto flex w-fit items-center gap-2 rounded-lg bg-primary px-2.5 py-1.5 text-caption font-medium text-primary-foreground">
              <MicIcon className="size-3.5" aria-hidden />
              Áudio <span className="num">0:42</span>
            </div>
            <div className="mt-2 rounded-lg border border-border bg-card p-2.5 text-caption">
              <div className="mb-1 flex items-center gap-1.5 font-semibold text-foreground">
                <SparklesIcon className="size-3.5 text-primary-ink" aria-hidden />
                Resumo da consulta
              </div>
              <div className="text-muted-foreground">
                <span className="font-medium text-foreground">Queixa:</span> febre há 2 dias, irritada.
              </div>
              <div className="text-muted-foreground">
                <span className="font-medium text-foreground">Exame:</span> otoscopia com hiperemia à direita.
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                <Badge>Escala sugerida · M-CHAT-R</Badge>
                <Badge variant="secondary">
                  <ScanTextIcon aria-hidden />
                  Ler exame por foto
                </Badge>
              </div>
            </div>
          </FlowCard>

          <FlowCard step={3} title="Revise e imprima" detail="Receita, atestado e relatório saem prontos, com o seu cabeçalho.">
            <div className="flex flex-col gap-1.5">
              <SampleDoc icon={PillIcon} title="Receita" detail="Amoxicilina, dose pelo peso" />
              <SampleDoc icon={FileCheckIcon} title="Atestado" detail="Comparecimento, 1 dia" />
              <SampleDoc icon={FileTextIcon} title="Relatório da consulta" detail="Resumo, escalas e conduta" />
            </div>
          </FlowCard>
        </div>
      </section>

      <section>
        <h2 className="font-display text-section font-semibold">Também dá para usar fora da consulta</h2>
        <div className="mt-4 grid grid-cols-3 gap-4">
          {MORE.map(({ icon: Icon, title, detail, href }) => (
            <Link
              key={title}
              href={href}
              className="group flex items-start gap-3 rounded-xl border border-border bg-card p-4 transition-[box-shadow,border-color] hover:border-primary-soft-border hover:shadow-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary-ink-strong">
                <Icon className="size-4" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 font-semibold">
                  {title}
                  <ArrowRightIcon className="size-3.5 text-subtle-foreground transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
                <span className="mt-0.5 block text-caption text-muted-foreground">{detail}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className="flex items-center gap-3 rounded-xl border border-dashed border-border-strong px-5 py-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-success-soft text-success-text">
          <VideoIcon className="size-4" aria-hidden />
        </span>
        <p className="flex-1 text-muted-foreground">
          <span className="font-semibold text-foreground">Prefere que a gente mostre?</span> Uma chamada de vídeo
          rápida, de alguns minutinhos, no horário que for melhor para você.
        </p>
        <Button asChild variant="outline" size="sm">
          <a href={DEMO_CALL_URL} target="_blank" rel="noreferrer">
            <MessageCircleIcon data-icon="inline-start" />
            Marcar pelo WhatsApp
          </a>
        </Button>
      </div>
    </div>
  )
}

function FlowCard({ step, title, detail, children }: { step: number; title: string; detail: string; children: React.ReactNode }) {
  return (
    <article className="flex flex-col overflow-hidden rounded-xl border border-border bg-card">
      <div className="m-2 mb-0 h-[188px] overflow-hidden rounded-lg bg-muted p-4" aria-hidden>
        {children}
      </div>
      <div className="flex gap-3 p-5">
        <span className="num grid size-8 shrink-0 place-items-center rounded-full bg-primary-soft text-label font-semibold text-primary-ink-strong">
          {step}
        </span>
        <div>
          <h3 className="text-title font-semibold">{title}</h3>
          <p className="mt-0.5 text-caption text-muted-foreground">{detail}</p>
        </div>
      </div>
    </article>
  )
}

function SampleRow({ initials, name, detail, active }: { initials: string; name: string; detail: string; active?: boolean }) {
  return (
    <div className={cn("flex items-center gap-2 rounded-md px-2 py-1.5", active && "bg-accent")}>
      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-card text-[10px] font-semibold text-muted-foreground">
        {initials}
      </span>
      <span className="min-w-0 flex-1 truncate text-caption">
        <span className="font-semibold text-foreground">{name}</span>
        <span className="text-subtle-foreground"> · {detail}</span>
      </span>
    </div>
  )
}

function SampleDoc({ icon: Icon, title, detail }: { icon: LucideIcon; title: string; detail: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border bg-card px-2.5 py-2">
      <span className="grid size-7 shrink-0 place-items-center rounded-md bg-primary-soft text-primary-ink-strong">
        <Icon className="size-3.5" />
      </span>
      <div className="min-w-0 flex-1 leading-tight">
        <div className="text-caption font-semibold text-foreground">{title}</div>
        <div className="truncate text-[11px] text-subtle-foreground">{detail}</div>
      </div>
      <Badge variant="success" className="h-5 px-1.5 text-[11px]">
        <CheckIcon aria-hidden />
        Pronto
      </Badge>
    </div>
  )
}
