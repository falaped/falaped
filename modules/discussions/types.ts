export type DiscussionMessage = {
  id: string
  role: "user" | "assistant"
  content: string
  created_at: string
}

export type DiscussionWithMessages = {
  id: string
  profile_id: string | null
  user_phone: string
  status: "active" | "closed"
  started_at: string
  ended_at: string | null
  awaiting_intent: boolean
  title: string | null
  messages: DiscussionMessage[]
}
