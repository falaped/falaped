import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Page() {
  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Cadastro realizado!
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Verifique seu e-mail para confirmar sua conta.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Cadastro realizado com sucesso. Verifique seu e-mail para confirmar
            sua conta antes de entrar.
          </p>
          <Button asChild variant="default" className="w-full">
            <Link href="/auth/login">Ir para o login</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
