import { IllustratedNotice } from "@/components/illustrated-notice"
import { SendLinkToComputer } from "@/components/dashboard/send-link-to-computer"

const STICKERS = [
  { text: "Escalas filtradas pela idade", className: "-left-2 top-0 -rotate-6 bg-[#FFD66B]", delay: "250ms" },
  { text: "Receita e atestado prontos", className: "-bottom-2 right-0 rotate-2 bg-[#FF8A7A]", delay: "550ms" },
]

/**
 * Tela exibida no lugar do app em telas menores que `lg` (celular e tablet em pé).
 */
export function DesktopOnlyNotice() {
  return (
    <IllustratedNotice
      title="O Falaped pede uma tela maior"
      description="Numa consulta, você vê ao mesmo tempo a ficha da criança, as escalas, os exames e os documentos. É muita coisa para caber numa tela pequena, então, por enquanto, o Falaped funciona só no computador."
      image="/tela-maior.png"
      imageAlt="O painel do Falaped cabe no monitor e transborda da tela do celular"
      stickers={STICKERS}
    >
      <SendLinkToComputer />
    </IllustratedNotice>
  )
}
