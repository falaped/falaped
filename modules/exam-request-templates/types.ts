export type ExamRequestTemplateSnapshot = {
  exams?: string[]
  hypothesis?: string
  observations?: string
}

export type ExamRequestTemplate = {
  id: string
  profile_id: string
  name: string
  snapshot: ExamRequestTemplateSnapshot
  created_at: string
  updated_at: string
}

export type ExamRequestTemplateOption = {
  id: string
  name: string
  created_at: string
  snapshot: ExamRequestTemplateSnapshot
}
