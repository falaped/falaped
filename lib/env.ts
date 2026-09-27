import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  GROQ_API_KEY: z.string().optional(),
  GROQ_ASSISTANT_MODEL: z.string().default("openai/gpt-oss-120b"),
  // Modelo com VISÃO do Groq: transcreve as páginas do exame (leitura de exames).
  // Único modelo de visão do Groq hoje; 3 imagens por chamada, 2.048 tokens cada.
  GROQ_VISION_MODEL: z.string().default("qwen/qwen3.8-27b"),
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
  // Convite da prospecção (painel admin). Remetente com nome de pessoa, não de marca:
  // e-mail frio assinado por alguém recebe mais resposta do que "Falaped <...>".
  // Sai do subdomínio contato.falaped.com.br porque só ele (e update.) está verificado
  // na Resend; o raiz falaped.com.br devolve 403. Reply-to continua contato@falaped.com.br.
  INVITE_EMAIL_FROM: z.string().default("Filipe, CEO do Falaped <filipe@contato.falaped.com.br>"),
  // Segredo (whsec_…) do webhook da Resend em /api/resend/webhook: entrega, bounce e
  // reclamação do convite. Sem ele a rota recusa tudo.
  RESEND_WEBHOOK_SECRET: z.string().optional(),
  // Pix da landing: chave do próprio recebedor, sem intermediário. O QR é
  // montado no app e a confirmação é manual, pelo comprovante no WhatsApp.
  PIX_KEY: z.string().optional(),
  PIX_MERCHANT_NAME: z.string().default("Falaped"),
  PIX_MERCHANT_CITY: z.string().default("Belo Horizonte"),
  // Cobrança Pix da landing (Asaas). O prefixo da chave escolhe o ambiente:
  // $aact_hmlg_ = sandbox, $aact_prod_ = produção.
  ASAAS_API_KEY: z.string().optional(),
  // Token do webhook da Asaas, conferido no header `asaas-access-token`.
  // Sem ele a rota recusa tudo: pagamento não se confirma por engano.
  ASAAS_WEBHOOK_TOKEN: z.string().optional(),
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
