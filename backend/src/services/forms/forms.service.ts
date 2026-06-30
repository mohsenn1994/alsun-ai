import { randomBytes } from 'node:crypto';
import type { CreateFormInput, UpdateFormInput, CreateQuestionInput } from '@alsun/schemas';
import type { FormsRepository } from '../../repositories/forms/forms.repository';
import type { QuestionsRepository } from '../../repositories/questions/questions.repository';
import { NotFoundError, BadRequestError } from '../../errors';
import type { FormRecord, FormWithQuestionsRecord, QuestionRecord } from '../../repositories/records';

export class FormsService {
  constructor(
    private readonly forms: FormsRepository,
    private readonly questions: QuestionsRepository,
  ) {}

  // Shared guard: load a form or throw 404.
  private async getFormOr404(id: string): Promise<FormRecord> {
    const form = await this.forms.findById(id);
    if (!form) throw new NotFoundError('Form not found');
    return form;
  }

  create(input: CreateFormInput) {
    return this.forms.create(input.title);
  }

  list() {
    return this.forms.list();
  }

  async get(id: string): Promise<FormWithQuestionsRecord> {
    const form = await this.forms.findByIdWithQuestions(id);
    if (!form) throw new NotFoundError('Form not found');
    return form;
  }

  async update(id: string, input: UpdateFormInput) {
    await this.getFormOr404(id);
    return this.forms.update(id, input);
  }

  async remove(id: string) {
    await this.getFormOr404(id);
    await this.forms.remove(id);
  }

  // Mint a token on first publish; keep it on unpublish so the link stays stable.
  async publish(id: string, published: boolean) {
    const form = await this.getFormOr404(id);
    const fields = published
      ? {
          status: 'published' as const,
          publicToken: form.publicToken ?? randomBytes(16).toString('base64url'),
        }
      : { status: 'draft' as const };
    return this.forms.update(id, fields);
  }

  // New questions are appended (position = current max + 1).
  async addQuestion(formId: string, input: CreateQuestionInput): Promise<QuestionRecord> {
    await this.getFormOr404(formId);
    const maxPos = await this.questions.maxPosition(formId);
    const position = typeof maxPos === 'number' ? maxPos + 1 : 0;
    return this.questions.create({
      formId,
      type: input.type,
      label: input.label,
      required: input.required,
      position,
      config: input.config as Record<string, unknown>,
      visibilityRule: (input.visibilityRule ?? null) as Record<string, unknown> | null,
    });
  }

  // Validate the id set is exactly this form's questions, then rewrite positions.
  async reorderQuestions(formId: string, orderedIds: string[]): Promise<QuestionRecord[]> {
    await this.getFormOr404(formId);
    const existingIds = await this.questions.listIdsByForm(formId);
    const sameSet =
      existingIds.length === orderedIds.length &&
      orderedIds.every((id) => existingIds.includes(id));
    if (!sameSet) {
      throw new BadRequestError("orderedIds must contain exactly this form's question ids");
    }
    await this.questions.reorder(formId, orderedIds);
    return this.questions.listByFormOrdered(formId);
  }

  // Respondent-facing view: only the fields needed to render the published form.
  async getPublicForm(token: string) {
    const form = await this.forms.findPublishedByTokenWithQuestions(token);
    if (!form) throw new NotFoundError('Form not found');
    return {
      id: form.id,
      title: form.title,
      questions: form.questions.map((q) => ({
        id: q.id,
        formId: q.formId,
        type: q.type,
        label: q.label,
        required: q.required,
        position: q.position,
        config: q.config,
        visibilityRule: q.visibilityRule,
      })),
    };
  }
}
