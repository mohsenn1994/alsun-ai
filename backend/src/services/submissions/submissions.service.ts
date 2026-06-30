import { validateAnswerValue, type Question as QuestionShape, type AnswerInput } from '@alsun/schemas';
import type { FormsRepository } from '../../repositories/forms/forms.repository';
import type { QuestionsRepository } from '../../repositories/questions/questions.repository';
import type { FilesRepository } from '../../repositories/files/files.repository';
import type {
  SubmissionsRepository,
  AnswerToStore,
  SubmissionSummaryRow,
} from '../../repositories/submissions/submissions.repository';
import { NotFoundError, ValidationError, type FieldError } from '../../errors';

// "Provided" per type — what required-enforcement keys off (distinct from validity).
function isAnswered(type: string, raw: unknown): boolean {
  if (raw === undefined || raw === null) return false;
  if (type === 'text') return typeof raw === 'string' && raw.trim().length > 0;
  if (type === 'multiple_choice') return Array.isArray(raw) && raw.length > 0;
  if (type === 'file') return typeof raw === 'object' && raw !== null && 'fileId' in raw;
  return false;
}

export class SubmissionsService {
  constructor(
    private readonly forms: FormsRepository,
    private readonly questions: QuestionsRepository,
    private readonly files: FilesRepository,
    private readonly submissions: SubmissionsRepository,
  ) {}

  // Creator: list a form's submissions (ensures the form exists first).
  async listForForm(formId: string): Promise<SubmissionSummaryRow[]> {
    if (!(await this.forms.findById(formId))) throw new NotFoundError('Form not found');
    return this.submissions.listByFormWithCounts(formId);
  }

  // Creator: per-question detail (drives the answers shape from the form's questions).
  async getDetail(id: string) {
    const submission = await this.submissions.findByIdWithAnswersAndFiles(id);
    if (!submission) throw new NotFoundError('Submission not found');
    const form = await this.forms.findByIdWithQuestions(submission.formId);
    if (!form) throw new NotFoundError('Form not found');

    const answerByQuestion = new Map(submission.answers.map((a) => [a.questionId, a]));
    const items = form.questions.map((q) => {
      const answer = answerByQuestion.get(q.id);
      return {
        questionId: q.id,
        label: q.label,
        type: q.type,
        value: answer ? answer.value : null,
        file: answer?.file
          ? { id: answer.file.id, filename: answer.file.filename, size: answer.file.size }
          : null,
      };
    });

    return {
      id: submission.id,
      formId: submission.formId,
      formTitle: form.title,
      createdAt: submission.createdAt,
      items,
    };
  }

  // Public: the validation gate. Walk the form's own questions and re-check
  // required-ness, value validity, and file existence; persist atomically.
  async create(token: string, answers: AnswerInput[]): Promise<{ id: string }> {
    const form = await this.forms.findPublishedByToken(token);
    if (!form) throw new NotFoundError('Form not found');

    const questions = (await this.questions.listByFormOrdered(form.id)) as unknown as QuestionShape[];
    const submitted = new Map(answers.map((a) => [a.questionId, a.value]));
    const errors: FieldError[] = [];
    const toStore: AnswerToStore[] = [];

    for (const question of questions) {
      const raw = submitted.get(question.id);

      if (!isAnswered(question.type, raw)) {
        if (question.required) errors.push({ path: question.id, message: 'This question is required.' });
        continue; // optional + blank → simply not stored
      }

      const result = validateAnswerValue(question, raw);
      if (!result.ok) {
        errors.push({ path: question.id, message: result.error });
        continue;
      }

      // A file answer must reference a real, not-yet-linked upload.
      if (question.type === 'file') {
        const { fileId } = result.value as { fileId: string };
        const file = await this.files.findById(fileId);
        if (!file || file.answerId) {
          errors.push({ path: question.id, message: 'Uploaded file is missing or already used.' });
          continue;
        }
      }

      toStore.push({ questionId: question.id, value: result.value, type: question.type });
    }

    if (errors.length > 0) throw new ValidationError(errors, 'Some answers need attention.');

    const id = await this.submissions.createWithAnswers(form.id, toStore);
    return { id };
  }
}
