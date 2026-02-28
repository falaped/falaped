import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold tracking-tight">FALAPED</h1>
      <p className="text-sm text-muted-foreground text-center max-w-md">
        Dashboard para pediatras. Gerencie casos e pacientes.
      </p>
      <div className="flex gap-2">
        <Button asChild>
          <Link href="/auth/login">Entrar</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/auth/sign-up">Cadastrar</Link>
        </Button>
      </div>
    </main>
  )
}
