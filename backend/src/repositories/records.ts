import type { FormStatus, QuestionType } from '../db/models';

/** Plain-object shapes returned by repositories (Sequelize `.toJSON()` results). */
export interface FormRecord {
  id: string;
  title: string;
  status: FormStatus;
  publicToken: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuestionRecord {
  id: string;
  formId: string;
  type: QuestionType;
  label: string;
  required: boolean;
  position: number;
  config: Record<string, unknown>;
  visibilityRule: Record<string, unknown> | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface FormWithQuestionsRecord extends FormRecord {
  questions: QuestionRecord[];
}

export interface FileRecord {
  id: string;
  answerId: string | null;
  storageKey: string;
  filename: string;
  mimeType: string;
  size: number;
  createdAt?: Date;
}

export interface AnswerRecord {
  id: string;
  submissionId: string;
  questionId: string;
  value: unknown;
  file?: FileRecord | null;
}

export interface SubmissionWithAnswersRecord {
  id: string;
  formId: string;
  createdAt: Date;
  answers: AnswerRecord[];
}
