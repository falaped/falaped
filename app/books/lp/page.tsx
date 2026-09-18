import Image from "next/image"
import Link from "next/link"
import { ArrowRight, Camera, Check, Clock, Lock, MessageCircle, Palette, Sparkles, WandSparkles } from "lucide-react"

import { bkButton, Chip, Sticker, TINTS } from "@/components/books/books-ui"
import { LpCard, LpTitle, Orn } from "@/components/books/lp/lp-ui"
import { BOOK_PRICE_BRL, BOOKS_WHATSAPP } from "@/modules/books/constants"
import { BOOK_THEMES } from "@/modules/books/themes"
import { cn } from "@/lib/utils"

/** Páginas do livro real do Samuel usadas na animação do hero (capa + 5 páginas). */
const HERO_PAGES = ["/books/samples/cama/0.jpg", "/books/samples/cama/4.jpg", "/books/samples/cama/7.jpg", "/books/samples/cama/11.jpg", "/books/samples/cama/15.jpg", "/books/samples/cama/18.jpg"]

/** Coreografia do hero: a entrada roda só na 1ª visita; clique ou rolagem pula; o livro refolheia a cada 9 s. */
const HERO_SCRIPT = `(function(){var s=document.getElementById("bk-hero");if(!s)return;try{if(localStorage.getItem("fpBookHero"))s.classList.remove("bk-intro");else localStorage.setItem("fpBookHero","1")}catch(e){}var skip=function(){s.classList.remove("bk-intro")};["click","wheel","touchstart","keydown"].forEach(function(e){addEventListener(e,skip,{once:true,passive:true})});setInterval(function(){s.classList.remove("bk-play");void s.offsetWidth;s.classList.add("bk-play")},9000)})()`

const STEPS = [
  { icon: Camera, title: "Envie a foto", text: "Nome, menino ou menina e 1 ou 2 fotos do rosto. Leva 1 minuto." },
  { icon: Palette, title: "Escolha o tema", text: "Dia da vacina, dormir na própria cama, adeus chupeta e mais 7 histórias." },
  { icon: WandSparkles, title: "Veja a capa grátis", text: "Em cerca de 2 minutos a capa aparece com a sua criança desenhada." },
  { icon: MessageCircle, title: "Peça o livro completo", text: `Gostou? Pague ${"R$ " + BOOK_PRICE_BRL} por Pix no WhatsApp e receba o PDF na hora.` },
]

const FEATURES = [
  "20 páginas em A4, prontas para imprimir ou ler no celular",
  "A criança é a protagonista, desenhada a partir da foto",
  "Ilustrações em estilo de animação 3D, texto dentro da imagem",
  "História que ajuda em um marco real: vacina, chupeta, fralda, escola",
  "Dedicatória personalizada na primeira página",
  "PDF entregue na hora após a confirmação do pagamento",
]

const FAQ = [
  {
    q: "A capa é grátis mesmo?",
    a: "Sim. Você cria uma capa por cadastro, sem pagar nada. Só paga se quiser o livro completo.",
  },
  {
    q: "O que acontece com a foto do meu filho?",
    a: "Ela fica guardada em área privada, é usada só para desenhar o personagem do livro e é apagada quando você pedir. Nunca vai para anúncios nem para outros clientes.",
  },
  {
    q: "Como eu pago?",
    a: `Por Pix, pelo WhatsApp. Depois de aprovar a capa, você toca em "Quero o livro completo" e a conversa já abre com o seu pedido. Cupom de indicação dá 10% de desconto.`,
  },
  {
    q: "Quanto tempo leva?",
    a: "A capa sai em cerca de 2 minutos. O livro completo é montado logo após o pagamento e o PDF chega no seu WhatsApp na hora.",
  },
]

/** Capas reais (livros do Samuel, com consentimento dos pais) por slug de tema. */
const THEME_COVERS: Record<string, string> = {
  "dormir-na-propria-cama": "/books/samples/cama-capa.jpg",
  "comer-de-tudo": "/books/samples/comer-capa.jpg",
  "escovar-os-dentes": "/books/samples/dentes-capa.jpg",
}

const SAMPLE_PAGES = [
  { src: "/books/samples/cama-p4.jpg", book: "A Cama do Samuel", page: 5 },
  { src: "/books/samples/comer-p7.jpg", book: "O Arco-íris do Samuel", page: 8 },
  { src: "/books/samples/dentes-p10.jpg", book: "O Sorriso do Samuel", page: 11 },
]

export default function BooksLandingPage() {
  const themes = Object.values(BOOK_THEMES)
  return (
    <>
      {/* Hero: 100% da dobra, livro folheando à esquerda, texto à direita. */}
      <section id="bk-hero" suppressHydrationWarning className="bk-intro bk-play mx-auto flex min-h-[calc(100svh-4rem)] max-w-[1100px] items-center overflow-x-clip px-4 py-8 sm:min-h-[calc(100svh-5rem)] sm:px-10 sm:py-12">
        <LpCard className="grid w-full gap-10 px-6 py-9 sm:px-12 sm:py-12 lg:grid-cols-[.8fr_1.2fr] lg:items-center">
          <Orn kind="star" color="#f5c21a" className="-left-4 -top-6 sm:-left-6 sm:-top-8" />
          <Orn kind="ring" color="#f5c4b8" className="-right-3 -top-4 sm:-right-5 sm:-top-5" />
          <Orn kind="plus" color="#b8e0f5" className="-bottom-5 -left-3 sm:-bottom-6 sm:-left-5" />
          <Orn kind="star" color="#cdebd3" className="-bottom-6 -right-4 text-4xl sm:-right-6" />

          {/* Livro do Samuel (livro real, com consentimento dos pais) folheando. */}
          <div className="bk-stage relative order-1 mx-auto w-full max-w-[250px] sm:max-w-[290px]">
            <div className="bk-book">
              {HERO_PAGES.map((src, i) => (
                <div
                  key={src}
                  className="bk-page"
                  style={{ "--i": i, zIndex: HERO_PAGES.length - i } as React.CSSProperties}
                  data-flip={i < HERO_PAGES.length - 1 ? "" : undefined}
                  aria-hidden={i > 0 ? true : undefined}
                >
                  <Image
                    src={src}
                    alt={i === 0 ? "Capa do livro A Cama do Samuel, feito no Falaped Books" : ""}
                    fill
                    sizes="290px"
                    priority={i < 2}
                    className="object-cover"
                  />
                </div>
              ))}
              <div className="bk-page bk-close" style={{ zIndex: 10 }} aria-hidden>
                <Image src={HERO_PAGES[0]} alt="" fill sizes="290px" className="object-cover" />
              </div>
            </div>
            <Sticker className="absolute -right-4 -top-4 rotate-6 bg-warning">Livro real</Sticker>
          </div>

          <div className="bk-reveal order-2">
            <Chip className="max-w-full whitespace-normal bg-secondary uppercase leading-snug tracking-[.04em]">Livro de história onde a sua criança é a protagonista</Chip>
            <h1 className="mt-4 font-display text-[31px] font-extrabold uppercase leading-[0.94] tracking-[-.03em] text-balance sm:text-[50px]">
              O livro que a sua criança vai pedir para ler de novo.
              <span className="mt-2 block text-[24px] sm:text-[34px]">
                Porque é <span className="bk-marker">sobre ela</span>.
              </span>
            </h1>
            <p className="mt-5 max-w-xl text-base font-medium leading-relaxed text-[#3f3f46] sm:text-lg">
              Você manda uma foto e escolhe a história. A gente transforma em um livro ilustrado de 20 páginas onde ela é a protagonista, com o rosto e o nome dela em cada página. Tem
              história para cada fase da infância, e você lê com ela hoje mesmo.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Link href="/books/lp/criar" className={bkButton("warning", "h-[54px] px-7 text-base")}>
                <Sparkles className="size-4" strokeWidth={2.4} aria-hidden />
                Criar a história dela
                <ArrowRight className="size-4" strokeWidth={2.6} aria-hidden />
              </Link>
              <Link href="#paginas" className={bkButton("secondary", "h-[54px] px-6 text-base")}>
                Folhear um exemplo
              </Link>
            </div>
            <ul className="mt-6 flex flex-wrap gap-2 text-[12.5px] font-semibold">
              {["Ninguém além de você vê o livro", "Sem cartão para começar"].map((t) => (
                <li key={t} className="inline-flex items-center gap-1.5 rounded-full border-2 border-ink bg-accent px-[11px] py-1.5">
                  <Check className="size-3" strokeWidth={3} aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </LpCard>
        <script dangerouslySetInnerHTML={{ __html: HERO_SCRIPT }} />
      </section>

      {/* Como funciona */}
      <section id="como-funciona" className="mx-auto max-w-[1100px] scroll-mt-24 px-4 sm:px-10">
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

      {/* Temas */}
      <section id="temas" className="mx-auto mt-14 max-w-[1100px] scroll-mt-24 px-4 sm:mt-20 sm:px-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <LpTitle text="10 histórias para os marcos da infância" highlight="marcos" marker="#f5c4b8" className="max-w-2xl text-[30px] sm:text-[44px]" />
          <span className="text-sm font-medium text-muted-foreground">Cada tema tem 17 páginas de história, escritas com apoio de pediatra.</span>
        </div>
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
          {themes.map((t, i) => {
            const [a, b] = TINTS[i % TINTS.length]
            return (
              <li key={t.slug} className="overflow-hidden rounded-[14px] border-2 border-ink bg-white shadow-hard-xs">
                <span className="relative block aspect-[3/4] overflow-hidden border-b-2 border-ink" style={{ background: `repeating-linear-gradient(135deg,${a} 0 10px,${b} 10px 20px)` }}>
                  {THEME_COVERS[t.slug] && <Image src={THEME_COVERS[t.slug]} alt={`Capa de exemplo do tema ${t.label}`} fill sizes="(min-width: 1024px) 200px, 45vw" className="object-cover" />}
                  <Sticker className={cn("absolute left-2 bg-white px-2 py-1.5 text-[10px]", THEME_COVERS[t.slug] ? "bottom-2" : "top-2")}>{THEME_COVERS[t.slug] ? "Exemplo real" : `Tema ${i + 1}`}</Sticker>
                </span>
                <span className="block px-3 pb-3 pt-2.5 font-display text-sm font-bold leading-tight text-pretty">
                  {t.label}
                  <span className="mt-0.5 block font-sans text-[11.5px] font-medium leading-snug text-muted-foreground">{t.subtitle}</span>
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      {/* Páginas reais */}
      <section id="paginas" className="mx-auto mt-14 max-w-[1100px] scroll-mt-24 px-4 sm:mt-20 sm:px-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <LpTitle text="Páginas de um livro de verdade" highlight="de verdade" marker="#cdebd3" className="max-w-2xl text-[30px] sm:text-[44px]" />
          <span className="text-sm font-medium text-muted-foreground">Três livros do Samuel, feitos a partir de duas fotos. Publicados com autorização da família.</span>
        </div>
        <ul className="mt-6 grid gap-4 sm:grid-cols-3 sm:gap-6">
          {SAMPLE_PAGES.map((p, i) => (
            <li key={p.src} className={cn("relative", i === 1 ? "sm:-translate-y-3" : "")}>
              <div className="relative aspect-[3/4] overflow-hidden rounded-[14px] border-2 border-ink shadow-hard">
                <Image src={p.src} alt={`${p.book}, página ${p.page}`} fill sizes="(min-width: 640px) 33vw, 100vw" className="object-cover" />
              </div>
              <p className="mt-3 text-[13px] font-bold">
                {p.book} <span className="font-medium text-muted-foreground">· página {p.page} de 20</span>
              </p>
            </li>
          ))}
        </ul>
      </section>

      {/* O que vem + preço */}
      <section className="mx-auto mt-14 grid max-w-[1100px] gap-6 px-4 sm:mt-20 sm:px-10 lg:grid-cols-[1.2fr_.8fr]">
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
            <p className="mt-3 text-[13px] font-medium text-[#3f3f46]">Com cupom de indicação: 10% de desconto. A capa você vê antes, sem pagar.</p>
          </div>
          <Link href="/books/lp/criar" className={cn(bkButton("primary", "mt-6 h-[54px] w-full text-base"), "bg-white hover:bg-white")}>
            Começar pela capa grátis
            <ArrowRight className="size-4" strokeWidth={2.6} aria-hidden />
          </Link>
        </LpCard>
      </section>

      {/* Confiança + FAQ */}
      <section className="mx-auto mt-14 max-w-[1100px] px-4 sm:mt-20 sm:px-10">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            { icon: Lock, t: "Foto protegida", d: "Área privada, sem acesso público. Apagamos quando você pedir." },
            { icon: Clock, t: "Capa em 2 minutos", d: "Você vê o resultado antes de decidir." },
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
            <details key={f.q} className="group rounded-[16px] border-2 border-ink bg-white p-4 open:shadow-hard">
              <summary className="cursor-pointer list-none font-display text-[15px] font-extrabold marker:content-none">{f.q}</summary>
              <p className="mt-2 text-[13.5px] font-medium leading-relaxed text-[#3f3f46]">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* CTA final */}
      <section className="mx-auto mt-14 max-w-[1100px] px-4 sm:mt-20 sm:px-10">
        <LpCard className="flex flex-col items-start gap-5 bg-ink p-7 text-white sm:flex-row sm:items-center sm:justify-between sm:p-10">
          <div>
            <LpTitle text="Mande a foto agora. Daqui a pouco ele lê." highlight="agora" marker="transparent" className="text-[28px] text-white sm:text-[40px] [&_.bk-marker]:text-warning" />
            <p className="mt-3 text-[14px] font-medium text-[#cfd8e3]">Capa grátis, sem cartão. Dúvidas? Fale com a gente no WhatsApp.</p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            <Link href="/books/lp/criar" className={bkButton("warning", "h-[54px] px-7 text-base")}>
              Criar a capa grátis
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
