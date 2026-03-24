/** Supabase Storage bucket for profile logos (full and short). */
export const PROFILE_LOGOS_BUCKET = "profile-logos"

/** Supabase Storage bucket for medical certificate PDFs (atestados). Path: {profile_id}/{filename}.pdf */
export const MEDICAL_CERTIFICATES_BUCKET = "medical-certificates"

/** Supabase Storage bucket for prescription PDFs (receitas). Path: {profile_id}/{prescription_id}.pdf */
export const PRESCRIPTIONS_BUCKET = "prescriptions"

export const ASSISTANT_CASE_CHAT_MAX_HISTORY_MESSAGES = 48
export const ASSISTANT_CASE_CHAT_MAX_HISTORY_CHARS = 14_000
export const CASE_CHAT_CHIP_MAX_PER_RESPONSE = 4
export const CASE_CHAT_SUBSTANTIVE_USER_MESSAGE_MIN_CHARS = 16
export const CASE_CHAT_CHIP_AI_MIN_USER_TURNS = 5
/** Minimum time the “Falaped está respondendo…” card stays visible before the reply appears. */
export const ASSISTANT_TYPING_MIN_DISPLAY_MS = 3000
/** After the server returns (typing already visible), wait this long before showing the assistant message. */
export const ASSISTANT_POST_RESPONSE_DELAY_MS = 3000
export const NEW_CASE_TRANSCRIPTION_MAX_DURATION_SECONDS = 600
export const GROQ_TRANSCRIPTION_MAX_FILE_BYTES = 25 * 1024 * 1024

export const DASHBOARD_NEW_CASE_GREETING =
  "Prontuário iniciado. Pode registrar os achados clínicos que vou organizar as informações com você."
