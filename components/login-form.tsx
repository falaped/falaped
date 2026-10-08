"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TriangleAlert } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { loginSchema, type LoginFormData } from "@/lib/schemas/auth";
import { authErrorMessage } from "@/lib/auth-error-message";
import { Button } from "@/components/ui/button";
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";

export function LoginForm() {
  const [apiError, setApiError] = useState<string | null>(null);
  const router = useRouter();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const handleSubmit = async (data: LoginFormData) => {
    const supabase = createClient();
    setApiError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (error) throw error;
      router.push("/dashboard");
    } catch (error: unknown) {
      setApiError(authErrorMessage(error));
    }
  };

  return (
    <>
      <section className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <h1 className="font-display text-page font-semibold">Entrar</h1>
        <p className="mt-1 text-muted-foreground">Bom te ver de novo.</p>

        <form onSubmit={form.handleSubmit(handleSubmit)} noValidate className="mt-6">
          <FieldGroup className="gap-5">
            <Field data-invalid={!!errors.email}>
              <FieldLabel htmlFor="email">E-mail</FieldLabel>
              <FieldContent>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  aria-invalid={!!errors.email}
                  {...form.register("email")}
                />
                <FieldError errors={errors.email ? [errors.email] : undefined} />
              </FieldContent>
            </Field>

            <Field data-invalid={!!errors.password}>
              <div className="flex items-baseline justify-between gap-2">
                <FieldLabel htmlFor="password">Senha</FieldLabel>
                <Link
                  href="/auth/forgot-password"
                  className="text-label font-medium text-primary-ink underline-offset-4 hover:underline"
                >
                  Esqueci minha senha
                </Link>
              </div>
              <FieldContent>
                <PasswordInput
                  id="password"
                  autoComplete="current-password"
                  aria-invalid={!!errors.password}
                  {...form.register("password")}
                />
                <FieldError errors={errors.password ? [errors.password] : undefined} />
              </FieldContent>
            </Field>

            {apiError && (
              <div
                role="alert"
                className="flex items-start gap-2 rounded-lg border border-danger-border bg-danger-soft px-3 py-2.5 text-label text-danger-text"
              >
                <TriangleAlert className="mt-0.5 size-4 shrink-0" />
                {apiError}
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Entrando…" : "Entrar"}
            </Button>
          </FieldGroup>
        </form>
      </section>

      <p className="mt-6 text-center text-muted-foreground">
        Não tem conta?{" "}
        <Link href="/auth/sign-up" className="font-medium text-primary-ink underline-offset-4 hover:underline">
          Criar conta grátis
        </Link>
      </p>
    </>
  );
}
