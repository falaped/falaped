"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight, Eye, EyeOff, TriangleAlert } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { signUpWithEmail } from "@/modules/supabase/sign-up-with-email";
import { normalizeCrm, signUpSchema, type SignUpFormData } from "@/lib/schemas/auth";
import { parsePhone } from "@/lib/parsers";
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
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";

export function SignUpForm() {
  const [apiError, setApiError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const form = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { firstName: "", lastName: "", crm: "", email: "", phone: "", password: "" },
  });
  const { errors, isSubmitting } = form.formState;

  const handleSubmit = async (data: SignUpFormData) => {
    const supabase = createClient();
    setApiError(null);

    try {
      await signUpWithEmail(supabase, {
        email: data.email,
        password: data.password,
        firstName: data.firstName.trim(),
        surname: data.lastName.trim(),
        crm: normalizeCrm(data.crm),
        phone: parsePhone(data.phone),
        emailRedirectTo: `${window.location.origin}/dashboard`,
      });
      router.push("/auth/sign-up-success");
    } catch (error: unknown) {
      setApiError(authErrorMessage(error));
    }
  };

  return (
    <>
      <section className="rounded-2xl border border-border bg-card p-8 shadow-sm">
        <h1 className="font-display text-page font-semibold">Crie sua conta</h1>
        <p className="mt-1 text-muted-foreground">15 dias grátis. Sem cartão.</p>

        <form onSubmit={form.handleSubmit(handleSubmit)} noValidate className="mt-6">
          <FieldGroup className="gap-5">
            <div className="grid grid-cols-2 gap-4 *:min-w-0">
              <Field data-invalid={!!errors.firstName}>
                <FieldLabel htmlFor="firstName">Nome</FieldLabel>
                <FieldContent>
                  <Input
                    id="firstName"
                    autoComplete="given-name"
                    aria-invalid={!!errors.firstName}
                    {...form.register("firstName")}
                  />
                  <FieldError errors={errors.firstName ? [errors.firstName] : undefined} />
                </FieldContent>
              </Field>
              <Field data-invalid={!!errors.lastName}>
                <FieldLabel htmlFor="lastName">Sobrenome</FieldLabel>
                <FieldContent>
                  <Input
                    id="lastName"
                    autoComplete="family-name"
                    aria-invalid={!!errors.lastName}
                    {...form.register("lastName")}
                  />
                  <FieldError errors={errors.lastName ? [errors.lastName] : undefined} />
                </FieldContent>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4 *:min-w-0">
              <Field data-invalid={!!errors.crm}>
                <FieldLabel htmlFor="crm">CRM e UF</FieldLabel>
                <FieldContent>
                  <Input
                    id="crm"
                    placeholder="12345 MG"
                    autoComplete="off"
                    aria-invalid={!!errors.crm}
                    {...form.register("crm")}
                  />
                  {errors.crm ? (
                    <FieldError errors={[errors.crm]} />
                  ) : (
                    <FieldDescription>Sai nas receitas e atestados.</FieldDescription>
                  )}
                </FieldContent>
              </Field>
              <Field data-invalid={!!errors.phone}>
                <FieldLabel htmlFor="phone">WhatsApp</FieldLabel>
                <FieldContent>
                  <Controller
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <PhoneInput
                        ref={field.ref}
                        id="phone"
                        value={field.value}
                        onChange={field.onChange}
                        onBlur={field.onBlur}
                        aria-invalid={!!errors.phone}
                        aria-required
                        required
                      />
                    )}
                  />
                  {errors.phone ? (
                    <FieldError errors={[errors.phone]} />
                  ) : (
                    <FieldDescription>Com DDD.</FieldDescription>
                  )}
                </FieldContent>
              </Field>
            </div>

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
              <FieldLabel htmlFor="password">Senha</FieldLabel>
              <FieldContent>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    className="pr-10"
                    aria-invalid={!!errors.password}
                    {...form.register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute inset-y-0 right-0 grid w-10 place-items-center rounded-r-lg text-subtle-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    aria-label={showPassword ? "Esconder senha" : "Mostrar senha"}
                    aria-pressed={showPassword}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
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
              {isSubmitting ? "Criando sua conta…" : "Criar conta e começar"}
              {!isSubmitting && <ArrowRight data-icon="inline-end" />}
            </Button>
          </FieldGroup>
        </form>
      </section>

      <p className="mt-6 text-center text-muted-foreground">
        Já tem conta?{" "}
        <Link href="/auth/login" className="font-medium text-primary-ink underline-offset-4 hover:underline">
          Entrar
        </Link>
      </p>
    </>
  );
}
