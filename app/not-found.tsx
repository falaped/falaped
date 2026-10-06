import Link from "next/link"
import { House } from "lucide-react"
import { IllustratedNotice, noticeButtonClass } from "@/components/illustrated-notice"

export default function NotFound() {
  return (
    <IllustratedNotice
      title="Não achamos essa página"
      description="O endereço pode ter mudado ou a página não existe mais. Volte para o início e siga de lá."
      image="/ilustra-404.png"
      imageAlt="Ursinho procurando com uma lupa dentro de uma pasta vazia"
    >
      <Link href="/dashboard" className={noticeButtonClass}>
        <House className="size-5" />
        Voltar para o início
      </Link>
    </IllustratedNotice>
  )
}
