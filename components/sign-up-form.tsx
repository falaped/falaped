"use client";

import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { createClient } from "@/lib/supabase/client";
import { signUpWithEmail } from "@/modules/supabase/sign-up-with-email";
import {
  signUpSchema,
  type SignUpFormData,
} from "@/lib/schemas/auth";
import { parsePhone } from "@/lib/parsers";
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
import { PhoneInput } from "@/components/ui/phone-input";
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
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      password: "",
      repeatPassword: "",
    },
  });

  const handleSubmit = async (data: SignUpFormData) => {
    const supabase = createClient();
    setApiError(null);

    try {
      await signUpWithEmail(supabase, {
        email: data.email,
        password: data.password,
        fullName: `${data.firstName.trim()} ${data.lastName.trim()}`,
        phone: parsePhone(data.phone),
        emailRedirectTo: `${window.location.origin}/dashboard`,
      });
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
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Field data-invalid={!!form.formState.errors.firstName}>
                  <FieldLabel htmlFor="firstName">Nome</FieldLabel>
                  <FieldContent>
                    <Input
                      id="firstName"
                      type="text"
                      placeholder="Nome"
                      aria-invalid={!!form.formState.errors.firstName}
                      {...form.register("firstName")}
                    />
                    <FieldError errors={form.formState.errors.firstName ? [form.formState.errors.firstName] : undefined} />
                  </FieldContent>
                </Field>
                <Field data-invalid={!!form.formState.errors.lastName}>
                  <FieldLabel htmlFor="lastName">Sobrenome</FieldLabel>
                  <FieldContent>
                    <Input
                      id="lastName"
                      type="text"
                      placeholder="Sobrenome"
                      aria-invalid={!!form.formState.errors.lastName}
                      {...form.register("lastName")}
                    />
                    <FieldError errors={form.formState.errors.lastName ? [form.formState.errors.lastName] : undefined} />
                  </FieldContent>
                </Field>
              </div>

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

              <Field data-invalid={!!form.formState.errors.phone}>
                <FieldLabel htmlFor="phone">Telefone</FieldLabel>
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
                        aria-invalid={!!form.formState.errors.phone}
                      />
                    )}
                  />
                  <FieldError errors={form.formState.errors.phone ? [form.formState.errors.phone] : undefined} />
                </FieldContent>
              </Field>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
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
              </div>

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
