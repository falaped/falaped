import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  GROQ_API_KEY: z.string().optional(),
  GROQ_ASSISTANT_MODEL: z.string().default("openai/gpt-oss-120b"),
  NEXT_PUBLIC_SUPABASE_URL: z.url("NEXT_PUBLIC_SUPABASE_URL must be a valid URL"),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .min(1, "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is required"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  // books.falaped.com.br: geração de ilustrações (gpt-image-2 via Replicate).
  REPLICATE_API_TOKEN: z.string().optional(),
  // Envio de e-mail transacional dos pedidos (Resend). Sem a chave, o aviso de
  // produção não sai e o gestor vê o erro na tela de pedidos.
  RESEND_API_KEY: z.string().optional(),
  BOOKS_EMAIL_FROM: z.string().default("Falaped Books <livros@contato.falaped.com.br>"),
  // E-mails (separados por vírgula) que veem os pedidos da landing em app.falaped.com.br/books/leads.
  BOOKS_ADMIN_EMAILS: z
    .string()
    .default("")
    .transform((v) => v.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean)),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const details = parsed.error.issues
    .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
    .join("; ");
  throw new Error(`Invalid environment variables: ${details}`);
}

export const env = parsed.data;
