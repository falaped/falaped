import { TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Suspense } from "react";

async function ErrorContent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  // O `error` da URL vem cru do Supabase (em inglês); só serve para escolher a frase.
  const isExpired = /expired|invalid/i.test(params?.error ?? "");

  return (
    <p className="mt-2 text-read text-muted-foreground">
      {isExpired
        ? "O link expirou ou já foi usado. Peça um novo e abra em seguida."
        : "Não foi possível concluir agora. Tente de novo em instantes."}
    </p>
  );
}

export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-8 shadow-sm">
      <span className="grid size-12 place-items-center rounded-full bg-danger-soft text-danger-text">
        <TriangleAlert className="size-6" />
      </span>
      <h1 className="mt-5 font-display text-page font-semibold">Algo deu errado</h1>
      <Suspense fallback={<p className="mt-2 text-read text-muted-foreground">Carregando…</p>}>
        <ErrorContent searchParams={searchParams} />
      </Suspense>
      <Button asChild size="lg" className="mt-6 w-full">
        <Link href="/auth/login">Voltar para o login</Link>
      </Button>
    </section>
  );
}
