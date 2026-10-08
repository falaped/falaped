import type { z } from "zod"

import type {
  examReadingFlagSchema,
  examReadingInfoSchema,
  examReadingItemSchema,
} from "@/lib/schemas/exam-reading"

export type ExamReadingFlag = z.infer<typeof examReadingFlagSchema>
export type ExamReadingItem = z.infer<typeof examReadingItemSchema>
export type ExamReadingInfo = z.infer<typeof examReadingInfoSchema>

/** Uma leitura de exame (tabela case_exam_readings). */
export type ExamReading = {
  id: string
  profile_id: string
  patient_id: string
  case_id: string | null
  title: string
  page_paths: string[]
  exam_info: ExamReadingInfo
  items: ExamReadingItem[]
  report_text: string | null
  vision_model: string
  created_at: string
  updated_at: string
}

export type CreateExamReadingPayload = {
  patient_id: string
  case_id: string | null
  title: string
  page_paths: string[]
  exam_info: ExamReadingInfo
  items: ExamReadingItem[]
  vision_model: string
}
