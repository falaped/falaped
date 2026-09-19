import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Camera, Check, ChevronDown, Clock, Lock, MessageCircle, Palette, Sparkles, WandSparkles } from "lucide-react"

import { bkButton, Chip, TINTS } from "@/components/books/books-ui"
import { HeroStage } from "@/components/books/lp/hero-stage"
import { LP_WRAP, LpCard, LpTitle } from "@/components/books/lp/lp-ui"
import { BOOK_PRICE_BRL, BOOKS_WHATSAPP } from "@/modules/books/constants"
import { BOOK_THEMES } from "@/modules/books/themes"
import { cn } from "@/lib/utils"

const STEPS = [
  { icon: Camera, title: "Conte quem é a criança", text: "Nome, menino ou menina e 1 ou 2 fotos do rosto. Leva 1 minuto." },
  { icon: Palette, title: "Escolha a história", text: "Dia da vacina, dormir na própria cama, adeus chupeta e mais 7 histórias." },
  { icon: WandSparkles, title: "Veja a capa na tela", text: "Em cerca de 2 minutos ela aparece com a sua criança. É uma prévia para você decidir: dá para ver, não para baixar." },
  { icon: MessageCircle, title: "Receba o livro completo", text: `Gostou? Pague ${"R$ " + BOOK_PRICE_BRL} por Pix no WhatsApp e o PDF com as 20 páginas chega na hora.` },
]

const FEATURES = [
  "20 páginas em A4, prontas para imprimir ou ler no celular",
  "A sua criança é a protagonista, com o rosto e o nome dela em cada página",
  "Ilustrações em estilo de animação 3D, com o texto dentro da imagem",
  "História que acompanha um momento real: vacina, chupeta, fralda, escola",
  "Dedicatória escrita por você, logo depois da capa",
  "PDF no WhatsApp assim que o Pix é confirmado",
]

const FAQ = [
  {
    q: "Preciso pagar para ver?",
    a: "Não. Você monta o livro, vê a capa pronta na tela com a sua criança e decide depois. Ver não custa nada — a imagem e as 20 páginas em PDF chegam com o pagamento.",
  },
  {
    q: "Posso refazer a capa?",
    a: "Cada cadastro gera uma capa, e ela não pode ser refeita. Por isso vale conferir o nome, o tema e a foto antes de gerar. Se algo saiu errado, fale com a gente no WhatsApp.",
  },
  {
    q: "O que acontece com a foto da criança?",
    a: "Ela fica guardada em área privada, é usada só para ilustrar este livro e é apagada quando você pedir. Nunca vai para anúncios nem para outros clientes.",
  },
  {
    q: "Como eu pago?",
    a: `Por Pix, pelo WhatsApp. Depois de ver a capa, você toca em "Quero o livro completo" e a conversa já abre com o seu pedido escrito. Cupom de indicação dá 10% de desconto.`,
  },
  {
    q: "Quanto tempo leva?",
    a: "A capa aparece em cerca de 2 minutos. O livro completo é montado logo após o pagamento e o PDF chega no seu WhatsApp na hora.",
  },
  {
    q: "Posso imprimir em casa?",
    a: "Pode. O PDF vem em A4, uma página por folha: dá para imprimir em casa, mandar encadernar em uma gráfica ou simplesmente ler no celular e no tablet.",
  },
  {
    q: "Para que idade serve?",
    a: "As histórias são escritas para crianças de 2 a 6 anos, a fase dos marcos que elas contam: fralda, chupeta, vacina, escola. As menores ouvem no colo e se reconhecem nos desenhos.",
  },
]

/** Páginas reais dos livros do Samuel, publicadas com autorização da família. */
const SAMPLE_PAGES = [
  { src: "/books/samples/cama/0.jpg", book: "A Cama do Samuel", page: 1 },
  { src: "/books/samples/cama/4.jpg", book: "A Cama do Samuel", page: 5 },
  { src: "/books/samples/cama/7.jpg", book: "A Cama do Samuel", page: 8 },
  { src: "/books/samples/cama/11.jpg", book: "A Cama do Samuel", page: 12 },
  { src: "/books/samples/cama/15.jpg", book: "A Cama do Samuel", page: 16 },
  { src: "/books/samples/cama/18.jpg", book: "A Cama do Samuel", page: 19 },
  { src: "/books/samples/comer-p7.jpg", book: "O Arco-íris do Samuel", page: 8 },
  { src: "/books/samples/dentes-p10.jpg", book: "O Sorriso do Samuel", page: 11 },
]

export default function BooksLandingPage() {
  const themes = Object.values(BOOK_THEMES)
  return (
    <>
      {/* Hero: 100% da dobra, texto à esquerda, leque de capas à direita. */}
      <HeroStage>
        <Chip className="bg-white uppercase tracking-[.05em] shadow-hard-sm">Livro de história</Chip>
        <h1 className="mt-5 font-display text-[36px] font-extrabold uppercase leading-[0.92] tracking-[-.035em] text-balance sm:text-[56px]">
          O livro que a sua <span className="bk-marker">criança</span> vai pedir para ler de novo.
        </h1>
        <p className="mt-6 max-w-[32em] text-base font-medium leading-relaxed text-[#3f3f46] sm:text-[17.5px]">
          Você manda uma foto e escolhe a história. A gente transforma em um livro ilustrado de 20 páginas onde ela é a protagonista, com o rosto e o nome dela em cada página.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link href="/books/lp/criar" className={bkButton("warning", "h-[58px] px-7 text-base")}>
            <Sparkles className="size-4" strokeWidth={2.4} aria-hidden />
            Criar a história dela
            <ArrowRight className="size-4" strokeWidth={2.6} aria-hidden />
          </Link>
          <Link href="#paginas" className={bkButton("secondary", "h-[58px] px-6 text-base")}>
            Ver páginas de verdade
          </Link>
        </div>
        <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-[13.5px] font-semibold text-[#3f3f46]">
          {["Ninguém além de você vê o livro", "Sem cartão para começar"].map((t) => (
            <li key={t} className="inline-flex items-center gap-2">
              <Check className="size-4 text-ink" strokeWidth={3} aria-hidden />
              {t}
            </li>
          ))}
        </ul>
      </HeroStage>

      {/* Como funciona */}
      <section id="como-funciona" className={cn(LP_WRAP, "lp-rise scroll-mt-24")}>
        <LpTitle text="Como funciona" highlight="funciona" marker="#b8e0f5" className="text-[30px] sm:text-[44px]" />
        <ol className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="relative flex flex-col gap-3 rounded-[18px] border-[3px] border-ink bg-white p-5 shadow-hard">
              <span className="absolute -right-2 -top-3 grid size-9 place-items-center rounded-full border-[3px] border-ink bg-warning font-display text-sm font-extrabold shadow-hard-sm">{i + 1}</span>
              <span className="grid size-11 place-items-center rounded-xl border-2 border-ink" style={{ background: TINTS[i % TINTS.length][0] }}>
                <s.icon className="size-5" strokeWidth={2.2} aria-hidden />
              </span>
              <span className="font-display text-lg font-extrabold leading-tight">{s.title}</span>
              <span className="text-[13.5px] font-medium leading-snug text-[#3f3f46]">{s.text}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* Páginas reais: faixa que arrasta para o lado, sem folhear nada. */}
      <section id="paginas" className="lp-rise mt-14 scroll-mt-24 sm:mt-20">
        <div className={LP_WRAP}>
          <LpTitle text="Páginas de um livro de verdade" highlight="de verdade" marker="#cdebd3" className="max-w-2xl text-[30px] sm:text-[44px]" />
        </div>
        <ul className={cn(LP_WRAP, "lp-strip mt-6 flex gap-4 overflow-x-auto pb-4 sm:gap-6")}>
          {SAMPLE_PAGES.map((p) => (
            <li key={p.src} className="w-[calc(100vw-5.5rem)] shrink-0 sm:w-[300px]">
              <div className="relative aspect-[3/4] overflow-hidden rounded-[14px] border-2 border-ink shadow-hard">
                <Image src={p.src} alt={`${p.book}, página ${p.page}`} fill sizes="(min-width: 640px) 300px, 78vw" className="object-cover" />
              </div>
              <p className="mt-3 text-[13px] font-bold">
                {p.book} <span className="font-medium text-muted-foreground">· página {p.page} de 20</span>
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* Temas */}
      <section id="temas" className={cn(LP_WRAP, "lp-rise mt-14 scroll-mt-24 sm:mt-20")}>
        <LpTitle text="10 histórias para os marcos da infância" highlight="marcos" marker="#f5c4b8" className="max-w-2xl text-[30px] sm:text-[44px]" />
        <ul className="mt-6 grid gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
          {themes.map((t, i) => {
            const [a, b] = TINTS[i % TINTS.length]
            return (
              <li
                key={t.slug}
                className="flex items-center gap-3 rounded-[14px] border-2 border-ink p-4 shadow-hard-xs sm:min-h-[132px] sm:flex-col sm:items-stretch sm:justify-between sm:gap-0"
                style={{ background: `linear-gradient(150deg,${a},${b})` }}
              >
                <span className="font-display text-xs font-extrabold uppercase tracking-[.06em] text-[#3f3f46]">{String(i + 1).padStart(2, "0")}</span>
                <span className="font-display text-[16px] font-extrabold leading-tight text-pretty sm:mt-4">{t.label}</span>
              </li>
            )
          })}
        </ul>
      </section>

      {/* O que vem + preço */}
      <section className={cn(LP_WRAP, "lp-rise mt-14 grid gap-6 sm:mt-20 lg:grid-cols-[1.2fr_.8fr]")}>
        <LpCard className="p-6 sm:p-9">
          <LpTitle text="O que vem no livro" highlight="no livro" marker="#cdebd3" className="text-[28px] sm:text-[38px]" />
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-2.5 text-[14px] font-semibold leading-snug">
                <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2 border-ink bg-success">
                  <Check className="size-3" strokeWidth={3.2} aria-hidden />
                </span>
                {f}
              </li>
            ))}
          </ul>
        </LpCard>
        <LpCard className="flex flex-col justify-between bg-warning p-6 sm:p-9">
          <div>
            <Chip className="bg-white uppercase tracking-[.04em]">Livro completo</Chip>
            <div className="mt-4 font-display text-[56px] font-extrabold leading-none tracking-[-.04em] sm:text-[72px]">R$ {BOOK_PRICE_BRL}</div>
            <p className="mt-2 text-[14px] font-bold">20 páginas em PDF · pagamento por Pix · entrega na hora</p>
            <p className="mt-3 text-[13px] font-medium text-[#3f3f46]">Com cupom de indicação: 10% de desconto. Você vê a capa pronta antes de decidir.</p>
          </div>
          <Link href="/books/lp/criar" className={cn(bkButton("primary", "mt-6 h-[54px] w-full text-base"), "bg-white hover:bg-white")}>
            Criar a história dela
            <ArrowRight className="size-4" strokeWidth={2.6} aria-hidden />
          </Link>
        </LpCard>
      </section>

      {/* Confiança + FAQ */}
      <section className={cn(LP_WRAP, "lp-rise mt-14 sm:mt-20")}>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: Lock, t: "Foto protegida", d: "Área privada, sem acesso público. Apagamos quando você pedir." },
            { icon: Clock, t: "Você vê antes", d: "A capa fica pronta em cerca de 2 minutos, na tela, antes de qualquer pagamento." },
            { icon: MessageCircle, t: "Atendimento humano", d: "Pedido e pagamento pelo WhatsApp, com uma pessoa do outro lado." },
          ].map((c) => (
            <div key={c.t} className="flex items-start gap-3 rounded-[16px] border-2 border-ink bg-white p-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl border-2 border-ink bg-accent">
                <c.icon className="size-4" strokeWidth={2.2} aria-hidden />
              </span>
              <span>
                <span className="block font-display text-[15px] font-extrabold">{c.t}</span>
                <span className="block text-[13px] font-medium leading-snug text-[#3f3f46]">{c.d}</span>
              </span>
            </div>
          ))}
        </div>
        <LpTitle text="Perguntas frequentes" highlight="Perguntas" marker="#b8e0f5" className="mt-12 text-[30px] sm:text-[44px]" />
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          {FAQ.map((f) => (
            <details key={f.q} className="group h-fit rounded-[16px] border-2 border-ink bg-white p-4 open:shadow-hard">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-display text-[15px] font-extrabold marker:content-none">
                {f.q}
                <ChevronDown className="size-4 shrink-0 transition-transform duration-200 group-open:rotate-180" strokeWidth={3} aria-hidden />
              </summary>
              <p className="mt-2 text-[13.5px] font-medium leading-relaxed text-[#3f3f46]">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className={cn(LP_WRAP, "lp-rise mt-14 sm:mt-20")}>
        <LpCard className="flex flex-col items-start gap-5 bg-ink p-7 text-white sm:flex-row sm:items-center sm:justify-between sm:p-10">
          <div>
            <LpTitle text="Mande a foto agora. Hoje mesmo vocês leem juntos." highlight="agora" marker="transparent" className="text-[28px] text-white sm:text-[40px] [&_.bk-marker]:text-warning" />
            <p className="mt-3 text-[14px] font-medium text-[#cfd8e3]">Sem cartão para começar. Dúvidas? Fale com a gente no WhatsApp.</p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <Link href="/books/lp/criar" className={bkButton("warning", "h-[54px] px-7 text-base")}>
              Criar a história dela
              <ArrowRight className="size-4" strokeWidth={2.6} aria-hidden />
            </Link>
            <a href={`https://wa.me/${BOOKS_WHATSAPP}`} target="_blank" rel="noreferrer" className="text-[13px] font-bold underline decoration-warning decoration-2 underline-offset-4">
              Falar no WhatsApp
            </a>
          </div>
        </LpCard>
      </section>
    </>
  )
}
