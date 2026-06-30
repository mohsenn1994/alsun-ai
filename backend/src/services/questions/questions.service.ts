import type { UpdateQuestionInput } from '@alsun/schemas';
import type { QuestionsRepository } from '../../repositories/questions/questions.repository';
import { NotFoundError, BadRequestError } from '../../errors';

export class QuestionsService {
  constructor(private readonly questions: QuestionsRepository) {}

  // Edit a question. The type is immutable; changing it is a 400.
  async update(id: string, input: UpdateQuestionInput) {
    const existing = await this.questions.findById(id);
    if (!existing) throw new NotFoundError('Question not found');
    if (input.type !== existing.type) {
      throw new BadRequestError('Question type cannot be changed');
    }
    return this.questions.update(id, {
      label: input.label,
      required: input.required,
      config: input.config as Record<string, unknown>,
      visibilityRule: (input.visibilityRule ?? null) as Record<string, unknown> | null,
    });
  }

  async remove(id: string) {
    const existing = await this.questions.findById(id);
    if (!existing) throw new NotFoundError('Question not found');
    await this.questions.remove(id);
  }
}
