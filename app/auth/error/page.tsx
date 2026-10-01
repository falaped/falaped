import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <p className="text-sm text-muted-foreground">
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
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Algo deu errado.
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Suspense fallback={<p className="text-sm text-muted-foreground">Carregando...</p>}>
            <ErrorContent searchParams={searchParams} />
          </Suspense>
          <Button asChild variant="default" className="w-full">
            <Link href="/auth/login">Voltar ao login</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
