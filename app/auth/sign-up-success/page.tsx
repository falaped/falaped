import Link from "next/link";
import { MailCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MetaPixelEvent } from "@/components/meta-pixel";

export default function Page() {
  return (
    <section className="rounded-2xl border border-border bg-card p-8 shadow-sm">
      <MetaPixelEvent name="CompleteRegistration" />
      <span className="grid size-12 place-items-center rounded-full bg-primary-soft text-primary-ink-strong">
        <MailCheck className="size-6" />
      </span>
      <h1 className="mt-5 font-display text-page font-semibold">Confira seu e-mail</h1>
      <p className="mt-2 text-read text-muted-foreground">
        Enviamos um link para confirmar sua conta. Abra o e-mail e toque no link: você entra direto no Falaped.
      </p>
      <p className="mt-4 text-label text-subtle-foreground">
        Não chegou em alguns minutos? Veja a caixa de spam ou de promoções.
      </p>
      <Button asChild variant="outline" size="lg" className="mt-6 w-full">
        <Link href="/auth/login">Já confirmei, entrar</Link>
      </Button>
    </section>
  );
}
