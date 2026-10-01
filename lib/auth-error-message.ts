import { isAuthError } from "@supabase/supabase-js"

const GENERIC = "Não foi possível concluir agora. Tente de novo em instantes."

/** Erros do Supabase Auth que o médico pode encontrar nas telas de login/cadastro/senha. */
const BY_CODE: Record<string, string> = {
  invalid_credentials: "E-mail ou senha incorretos.",
  email_not_confirmed: "Confirme seu e-mail antes de entrar. O link está na sua caixa de entrada.",
  user_already_exists: "Já existe uma conta com este e-mail. Entre com ela ou recupere a senha.",
  email_exists: "Já existe uma conta com este e-mail. Entre com ela ou recupere a senha.",
  phone_exists: "Este telefone já está cadastrado em outra conta. Entre com ela ou use outro número.",
  weak_password: "Senha fraca. Use pelo menos 6 caracteres, misturando letras e números.",
  same_password: "A nova senha precisa ser diferente da atual.",
  email_address_invalid: "E-mail inválido. Confira o endereço digitado.",
  over_email_send_rate_limit: "Muitos e-mails enviados em pouco tempo. Aguarde alguns minutos e tente de novo.",
  over_request_rate_limit: "Muitas tentativas seguidas. Aguarde alguns minutos e tente de novo.",
  otp_expired: "O link expirou. Peça um novo e use em seguida.",
  session_expired: "Sua sessão expirou. Entre de novo.",
  session_not_found: "Sua sessão expirou. Entre de novo.",
  user_banned: "Esta conta está bloqueada. Fale com a gente pelo contato@falaped.com.br.",
  signup_disabled: "Cadastros estão pausados no momento. Fale com a gente pelo contato@falaped.com.br.",
}

/**
 * Mensagem em PT-BR para mostrar ao usuário a partir de um erro de auth.
 * Erros do Supabase nunca chegam crus (vêm em inglês e às vezes vazam detalhe
 * do banco); erros nossos (`new Error("...")` já em PT-BR) passam como estão.
 */
export function authErrorMessage(error: unknown): string {
  if (isAuthError(error)) {
    // O trigger handle_new_auth_user só falha na prática pelo telefone único em
    // profiles, e o Supabase devolve isso como erro genérico de banco.
    if (error.message === "Database error saving new user") return BY_CODE.phone_exists
    return (error.code && BY_CODE[error.code]) || GENERIC
  }
  // fetch sem rede lança TypeError ("Failed to fetch"), também em inglês.
  if (error instanceof TypeError) return "Sem conexão com o servidor. Confira sua internet e tente de novo."
  if (error instanceof Error && error.message) return error.message
  return GENERIC
}
