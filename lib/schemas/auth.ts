import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
});

/** Brazilian phone: 10 digits (DDD + 8) or 11 digits (DDD + 9 + 8). DDD = 11–99. */
function isValidBrazilianPhone(val: string): boolean {
  const digits = val.replace(/\D/g, "");
  if (digits.length !== 10 && digits.length !== 11) return false;
  const ddd = parseInt(digits.slice(0, 2), 10);
  if (ddd < 11 || ddd > 99) return false;
  if (digits.length === 11 && digits[2] !== "9") return false; // mobile must start with 9
  return true;
}

const phoneRefine = (val: string) => isValidBrazilianPhone(val);

export const signUpSchema = z.object({
  firstName: z.string().trim().min(2, "Digite seu nome"),
  lastName: z.string().trim().min(2, "Digite seu sobrenome"),
  email: z.email("Confira o e-mail. Ex.: ana@consultorio.com.br"),
  phone: z
    .string()
    .min(1, "Digite seu celular com DDD")
    .refine(phoneRefine, "Confira o número com DDD. Ex.: (31) 99781-5503"),
  // Sem "repetir senha": o campo tem botão de mostrar (guia: só o essencial agora).
  password: z.string().min(6, "A senha precisa de pelo menos 6 caracteres"),
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
