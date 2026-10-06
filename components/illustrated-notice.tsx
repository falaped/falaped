import Image from "next/image"
import { Lexend_Mega } from "next/font/google"
import { cn } from "@/lib/utils"

const lexendMega = Lexend_Mega({ weight: "900", subsets: ["latin"] })

/** Botão neo-brutalista das telas ilustradas (aplicar em `<button>` ou `<Link>`). */
export const noticeButtonClass =
  "flex h-14 w-full max-w-sm items-center justify-center gap-2.5 rounded-xl border-[3px] border-black bg-[#8AB4EB] text-base font-bold text-black shadow-[5px_5px_0_0_#000] transition-[transform,box-shadow] active:translate-x-[5px] active:translate-y-[5px] active:shadow-none focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-black"

type Sticker = { text: string; className: string; delay: string }

/**
 * Tela cheia com logo, título, ilustração e ação, no estilo da marca (404, erro, celular).
 */
export function IllustratedNotice({
  title,
  description,
  image,
  imageAlt,
  stickers = [],
  children,
}: {
  title: string
  description: string
  image: string
  imageAlt: string
  stickers?: Sticker[]
  children: React.ReactNode
}) {
  return (
    <main className="flex min-h-svh items-center justify-center bg-white px-5 py-6 text-black [background-image:radial-gradient(#8AB4EB_1px,transparent_1px)] [background-size:22px_22px]">
      <div className="flex w-full max-w-xl flex-col items-center gap-5 text-center md:gap-7">
        <Image src="/falaped-logo.svg" alt="Falaped" width={397} height={272} priority className="h-12 w-auto md:h-14" />

        <h1 className={cn(lexendMega.className, "text-[1.7rem] leading-[1.15] tracking-[-0.08em] text-balance md:text-[2.6rem]")}>
          {title}
        </h1>

        <figure className="relative mx-auto w-fit max-w-[90%]">
          <Image
            src={image}
            alt={imageAlt}
            width={800}
            height={600}
            loading="eager"
            className="h-auto max-h-[38svh] w-auto max-w-full mix-blend-multiply"
          />
          {stickers.map((sticker) => (
            <span
              key={sticker.text}
              style={{ animationDelay: sticker.delay }}
              className={cn(
                "absolute rounded-md border-[3px] border-black px-2.5 py-1 text-sm font-bold whitespace-nowrap shadow-[3px_3px_0_0_#000]",
                "motion-safe:animate-in motion-safe:fade-in motion-safe:zoom-in-75 motion-safe:duration-300 [animation-fill-mode:backwards]",
                sticker.className,
              )}
            >
              {sticker.text}
            </span>
          ))}
        </figure>

        <p className="max-w-md text-[0.95rem] leading-relaxed text-black/75 md:text-base">{description}</p>
        {children}
      </div>
    </main>
  )
}
