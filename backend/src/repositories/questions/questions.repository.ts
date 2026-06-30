import type { Transaction } from 'sequelize';
import type { QuestionType } from '../../db/models';
import type { Db } from '../../db';
import type { QuestionRecord } from '../records';

interface CreateQuestionData {
  formId: string;
  type: QuestionType;
  label: string;
  required: boolean;
  position: number;
  config: Record<string, unknown>;
  visibilityRule: Record<string, unknown> | null;
}

/** Data access for questions, including the transactional position rewrite. */
export class QuestionsRepository {
  constructor(private readonly db: Db) {}

  async maxPosition(formId: string): Promise<number | null> {
    return (await this.db.Question.max('position', { where: { formId } })) as number | null;
  }

  async listIdsByForm(formId: string): Promise<string[]> {
    const rows = await this.db.Question.findAll({ where: { formId }, attributes: ['id'] });
    return rows.map((r) => r.id);
  }

  async listByFormOrdered(formId: string): Promise<QuestionRecord[]> {
    const rows = await this.db.Question.findAll({ where: { formId }, order: [['position', 'ASC']] });
    return rows.map((r) => r.toJSON() as QuestionRecord);
  }

  async findById(id: string): Promise<QuestionRecord | null> {
    const q = await this.db.Question.findByPk(id);
    return q ? (q.toJSON() as QuestionRecord) : null;
  }

  async create(data: CreateQuestionData): Promise<QuestionRecord> {
    const q = await this.db.Question.create({
      formId: data.formId,
      type: data.type,
      label: data.label,
      required: data.required,
      position: data.position,
      config: data.config,
      visibilityRule: data.visibilityRule,
    });
    return q.toJSON() as QuestionRecord;
  }

  async update(
    id: string,
    fields: {
      label: string;
      required: boolean;
      config: Record<string, unknown>;
      visibilityRule: Record<string, unknown> | null;
    },
  ): Promise<QuestionRecord | null> {
    await this.db.Question.update(fields, { where: { id } });
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    await this.db.Question.destroy({ where: { id } });
  }

  // Full position rewrite (0..n-1) in a single transaction.
  async reorder(formId: string, orderedIds: string[]): Promise<void> {
    await this.db.sequelize.transaction(async (t: Transaction) => {
      await Promise.all(
        orderedIds.map((qid, idx) =>
          this.db.Question.update({ position: idx }, { where: { id: qid, formId }, transaction: t }),
        ),
      );
    });
  }
}
