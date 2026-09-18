import type { Metadata } from "next"

import { LpCard, LpTitle } from "@/components/books/lp/lp-ui"
import { BOOKS_WHATSAPP } from "@/modules/books/constants"

export const metadata: Metadata = { title: "Política de privacidade — Falaped Books" }

const WA = `https://wa.me/${BOOKS_WHATSAPP}`
const H = "mt-8 font-display text-[19px] font-extrabold"
const P = "mt-2 text-[14.5px] font-medium leading-relaxed text-[#3f3f46]"

export default function PrivacyPage() {
  return (
    <section className="mx-auto max-w-[800px] px-4 py-10 sm:px-10 sm:py-16">
      <LpTitle as="h1" text="Política de privacidade" highlight="privacidade" marker="#b8e0f5" className="text-[32px] sm:text-[48px]" />
      <p className="mt-3 text-sm font-medium text-muted-foreground">Falaped Books · books.falaped.com.br · atualizada em 17 de setembro de 2026</p>
      <LpCard className="mt-8 p-6 sm:p-9">
        <p className={P}>
          Esta política explica, em linguagem simples, como o Falaped trata os dados que você informa para criar um livro infantil personalizado, em conformidade com a Lei
          Geral de Proteção de Dados (Lei 13.709/2018, LGPD).
        </p>

        <h2 className={H}>1. Quem é o controlador</h2>
        <p className={P}>
          O Falaped, responsável pelo site books.falaped.com.br. Para qualquer assunto sobre seus dados, fale conosco pelo{" "}
          <a href={WA} className="font-bold underline decoration-secondary decoration-2 underline-offset-2">
            WhatsApp
          </a>
          .
        </p>

        <h2 className={H}>2. Quais dados coletamos</h2>
        <ul className={`${P} list-disc space-y-1 pl-5`}>
          <li>Do responsável: nome, sobrenome, e-mail, número de WhatsApp e, se informado, cupom de indicação.</li>
          <li>Da criança: primeiro nome, gênero (menino ou menina) e 1 ou 2 fotos do rosto enviadas por você.</li>
          <li>Técnicos: endereço IP e data de aceite desta política, usados para segurança e para limitar abusos.</li>
        </ul>

        <h2 className={H}>3. Para que usamos</h2>
        <ul className={`${P} list-disc space-y-1 pl-5`}>
          <li>Gerar a capa e, se você comprar, o livro completo: a foto serve de referência para desenhar o personagem.</li>
          <li>Guardar a capa para você retomar de onde parou e entrar em contato sobre o seu pedido, inclusive se ele ficou incompleto.</li>
          <li>Entregar o PDF e atender você pelo WhatsApp.</li>
        </ul>
        <p className={P}>
          Base legal: consentimento (art. 7º, I, e art. 14 da LGPD para dados de crianças, dado por você como responsável) e execução de contrato para a entrega do livro. Não
          usamos as fotos para treinar modelos, para anúncios nem para outros clientes.
        </p>

        <h2 className={H}>4. Com quem compartilhamos</h2>
        <p className={P}>
          Só com fornecedores necessários para o serviço funcionar, sob contrato: hospedagem do site e do banco de dados (Vercel e Supabase), geração das ilustrações por
          inteligência artificial (Replicate/OpenAI, que recebem a foto e o prompt apenas durante a geração) e o WhatsApp para a conversa. Não vendemos dados.
        </p>

        <h2 className={H}>5. Por quanto tempo guardamos</h2>
        <p className={P}>
          Fotos, capa e livro ficam em área privada, sem acesso público, e são apagados a seu pedido a qualquer momento. Dados de contato são mantidos por até 12 meses após o
          último contato para atendimento e follow-up, ou até você pedir a exclusão.
        </p>

        <h2 className={H}>6. Seus direitos</h2>
        <p className={P}>
          Você pode, a qualquer momento, pedir confirmação do tratamento, acesso, correção, exclusão ou portabilidade dos dados, e revogar o consentimento (art. 18 da LGPD).
          Basta nos escrever no{" "}
          <a href={WA} className="font-bold underline decoration-secondary decoration-2 underline-offset-2">
            WhatsApp
          </a>
          . Atendemos em até 15 dias.
        </p>

        <h2 className={H}>7. Cookies</h2>
        <p className={P}>
          Usamos um único cookie estritamente necessário, que identifica o seu cadastro para retomar a capa. Não usamos cookies de publicidade.
        </p>

        <h2 className={H}>8. Segurança</h2>
        <p className={P}>
          Os dados trafegam criptografados (HTTPS) e ficam em banco e armazenamento com acesso restrito ao servidor. Nenhum sistema é infalível; se houver incidente relevante,
          avisaremos você e a ANPD conforme a lei.
        </p>
      </LpCard>
    </section>
  )
}
