"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import {
  signUpSchema,
  type SignUpFormData,
} from "@/lib/schemas/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [apiError, setApiError] = useState<string | null>(null);
  const router = useRouter();

  const form = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: "", password: "", repeatPassword: "" },
  });

  const handleSubmit = async (data: SignUpFormData) => {
    const supabase = createClient();
    setApiError(null);

    try {
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });
      if (error) throw error;
      router.push("/auth/sign-up-success");
    } catch (error: unknown) {
      setApiError(
        error instanceof Error ? error.message : "Ocorreu um erro."
      );
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-semibold tracking-tight">
            Cadastrar
          </CardTitle>
          <CardDescription className="text-sm text-muted-foreground">
            Crie sua conta para começar a usar o FALAPED.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(handleSubmit)}>
            <FieldGroup>
              <Field data-invalid={!!form.formState.errors.email}>
                <FieldLabel htmlFor="email">E-mail</FieldLabel>
                <FieldContent>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    aria-invalid={!!form.formState.errors.email}
                    {...form.register("email")}
                  />
                  <FieldError errors={form.formState.errors.email ? [form.formState.errors.email] : undefined} />
                </FieldContent>
              </Field>
              <Field data-invalid={!!form.formState.errors.password}>
                <FieldLabel htmlFor="password">Senha</FieldLabel>
                <FieldContent>
                  <Input
                    id="password"
                    type="password"
                    aria-invalid={!!form.formState.errors.password}
                    {...form.register("password")}
                  />
                  <FieldError errors={form.formState.errors.password ? [form.formState.errors.password] : undefined} />
                </FieldContent>
              </Field>
              <Field data-invalid={!!form.formState.errors.repeatPassword}>
                <FieldLabel htmlFor="repeat-password">Repetir senha</FieldLabel>
                <FieldContent>
                  <Input
                    id="repeat-password"
                    type="password"
                    aria-invalid={!!form.formState.errors.repeatPassword}
                    {...form.register("repeatPassword")}
                  />
                  <FieldError errors={form.formState.errors.repeatPassword ? [form.formState.errors.repeatPassword] : undefined} />
                </FieldContent>
              </Field>
              {apiError && (
                <p className="text-sm text-destructive" role="alert">
                  {apiError}
                </p>
              )}
              <Button
                type="submit"
                className="w-full"
                disabled={form.formState.isSubmitting}
              >
                {form.formState.isSubmitting ? "Criando conta..." : "Cadastrar"}
              </Button>
            </FieldGroup>
            <div className="mt-4 text-center text-sm text-muted-foreground">
              Já tem uma conta?{" "}
              <Link
                href="/auth/login"
                className="text-foreground underline underline-offset-4 hover:text-primary"
              >
                Entrar
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
