import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-2xl">
                Cadastro realizado!
              </CardTitle>
              <CardDescription>Verifique seu e-mail para confirmar</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Cadastro realizado com sucesso. Verifique seu e-mail para
                confirmar sua conta antes de entrar.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
