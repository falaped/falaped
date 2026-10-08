"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TriangleAlert } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { updatePasswordSchema, type UpdatePasswordFormData } from "@/lib/schemas/auth";
import { authErrorMessage } from "@/lib/auth-error-message";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";

export function UpdatePasswordForm() {
  const [apiError, setApiError] = useState<string | null>(null);
  const router = useRouter();

  const form = useForm<UpdatePasswordFormData>({
    resolver: zodResolver(updatePasswordSchema),
    defaultValues: { password: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const handleSubmit = async (data: UpdatePasswordFormData) => {
    const supabase = createClient();
    setApiError(null);

    try {
      const { error } = await supabase.auth.updateUser({ password: data.password });
      if (error) throw error;
      router.push("/dashboard");
    } catch (error: unknown) {
      setApiError(authErrorMessage(error));
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-8 shadow-sm">
      <h1 className="font-display text-page font-semibold">Crie uma nova senha</h1>
      <p className="mt-1 text-muted-foreground">Depois de salvar, você entra direto no Falaped.</p>

      <form onSubmit={form.handleSubmit(handleSubmit)} noValidate className="mt-6">
        <FieldGroup className="gap-5">
          <Field data-invalid={!!errors.password}>
            <FieldLabel htmlFor="password">Nova senha</FieldLabel>
            <FieldContent>
              <PasswordInput
                id="password"
                autoComplete="new-password"
                aria-invalid={!!errors.password}
                {...form.register("password")}
              />
              {errors.password ? (
                <FieldError errors={[errors.password]} />
              ) : (
                <FieldDescription>Pelo menos 8 caracteres.</FieldDescription>
              )}
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
            {isSubmitting ? "Salvando…" : "Salvar e entrar"}
          </Button>
        </FieldGroup>
      </form>
    </section>
  );
}
