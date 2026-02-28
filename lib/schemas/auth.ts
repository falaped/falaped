import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

const phoneRefine = (val: string) => {
  const digits = val.replace(/\D/g, "");
  return digits.length === 10 || digits.length === 11;
};

export const signUpSchema = z
  .object({
    firstName: z.string().min(2, "Nome é obrigatório"),
    lastName: z.string().min(2, "Sobrenome é obrigatório"),
    email: z.string().email("E-mail inválido"),
    phone: z
      .string()
      .min(1, "Telefone é obrigatório")
      .refine(phoneRefine, "Telefone deve ter 10 ou 11 dígitos"),
    password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
    repeatPassword: z.string().min(1, "Confirme sua senha"),
  })
  .refine((data) => data.password === data.repeatPassword, {
    message: "As senhas não coincidem",
    path: ["repeatPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: z.string().email("E-mail inválido"),
});

export const updatePasswordSchema = z.object({
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

export type LoginFormData = z.infer<typeof loginSchema>;
export type SignUpFormData = z.infer<typeof signUpSchema>;
export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;
export type UpdatePasswordFormData = z.infer<typeof updatePasswordSchema>;
