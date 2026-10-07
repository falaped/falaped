"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, MailCheck, TriangleAlert } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { forgotPasswordSchema, type ForgotPasswordFormData } from "@/lib/schemas/auth";
import { authErrorMessage } from "@/lib/auth-error-message";
import { Button } from "@/components/ui/button";
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

export function ForgotPasswordForm() {
  const [apiError, setApiError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const handleSubmit = async (data: ForgotPasswordFormData) => {
    const supabase = createClient();
    setApiError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      });
      if (error) throw error;
      setSentTo(data.email);
    } catch (error: unknown) {
      setApiError(authErrorMessage(error));
    }
  };

  const backToLogin = (
    <p className="mt-6 text-center">
      <Link
        href="/auth/login"
        className="inline-flex items-center gap-1.5 font-medium text-primary-ink underline-offset-4 hover:underline"
      >
        <ArrowLeft className="size-4" />
        Voltar para o login
      </Link>
    </p>
  );

  if (sentTo) {
    return (
      <>
        <section className="rounded-2xl border border-border bg-card p-8 shadow-sm">
          <span className="grid size-12 place-items-center rounded-full bg-primary-soft text-primary-ink-strong">
            <MailCheck className="size-6" />
          </span>
          <h1 className="mt-5 font-display text-page font-semibold">Confira seu e-mail</h1>
          <p className="mt-2 text-read text-muted-foreground">
            Se existir uma conta com <span className="font-medium text-foreground">{sentTo}</span>, enviamos um
            link para criar uma nova senha.
          </p>
          <p className="mt-4 text-label text-subtle-foreground">
            Não chegou em alguns minutos? Veja a caixa de spam ou de promoções.
          </p>
        </section>
        {backToLogin}
      </>
    );
  }

  return (
    <>
      <section className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <h1 className="font-display text-page font-semibold">Esqueceu a senha?</h1>
        <p className="mt-1 text-muted-foreground">Digite seu e-mail e enviamos um link para criar outra.</p>

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
              {isSubmitting ? "Enviando…" : "Enviar link"}
            </Button>
          </FieldGroup>
        </form>
      </section>
      {backToLogin}
    </>
  );
}
