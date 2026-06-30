import type { QuestionType } from '@alsun/schemas';

/** Human-readable labels for each question type, used in badges and selectors. */
export const TYPE_LABEL: Record<QuestionType, string> = {
  text: 'Text',
  multiple_choice: 'Multiple choice',
  file: 'File',
};
