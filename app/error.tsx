"use client"

import { useEffect } from "react"
import Link from "next/link"
import { RotateCw } from "lucide-react"
import { IllustratedNotice, noticeButtonClass } from "@/components/illustrated-notice"

export default function ErrorPage({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string }
  unstable_retry: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <IllustratedNotice
      title="Algo saiu do lugar"
      description="Esta tela não carregou como deveria. Tente de novo. Se continuar, escreva para contato@falaped.com.br que a gente resolve."
      image="/ilustra-erro.png"
      imageAlt="Ursinho enrolado no fio, segurando a tomada que desligou o computador"
    >
      <button type="button" onClick={() => unstable_retry()} className={noticeButtonClass}>
        <RotateCw className="size-5" />
        Tentar de novo
      </button>
      <Link href="/dashboard" className="text-sm font-semibold underline underline-offset-4">
        Voltar para o início
      </Link>
    </IllustratedNotice>
  )
}
