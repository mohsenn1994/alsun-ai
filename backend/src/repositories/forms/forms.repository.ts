import type { Transaction } from 'sequelize';
import type { FormStatus } from '../../db/models';
import type { Db } from '../../db';
import type { FormRecord, FormWithQuestionsRecord } from '../records';

/**
 * Data access for forms (and the form↔questions read joins). The only layer that
 * knows about Sequelize; the `Db` handle is injected so this is unit-testable.
 */
export class FormsRepository {
  constructor(private readonly db: Db) {}

  async create(title: string): Promise<FormRecord> {
    return (await this.db.Form.create({ title })).toJSON() as FormRecord;
  }

  async list(): Promise<FormRecord[]> {
    const rows = await this.db.Form.findAll({ order: [['createdAt', 'DESC']] });
    return rows.map((f) => f.toJSON() as FormRecord);
  }

  async findById(id: string): Promise<FormRecord | null> {
    const f = await this.db.Form.findByPk(id);
    return f ? (f.toJSON() as FormRecord) : null;
  }

  async findByIdWithQuestions(id: string): Promise<FormWithQuestionsRecord | null> {
    const f = await this.db.Form.findByPk(id, {
      include: [{ model: this.db.Question, as: 'questions' }],
      order: [[{ model: this.db.Question, as: 'questions' }, 'position', 'ASC']],
    });
    return f ? (f.toJSON() as unknown as FormWithQuestionsRecord) : null;
  }

  async findPublishedByToken(token: string): Promise<FormRecord | null> {
    const f = await this.db.Form.findOne({ where: { publicToken: token, status: 'published' } });
    return f ? (f.toJSON() as FormRecord) : null;
  }

  async findPublishedByTokenWithQuestions(token: string): Promise<FormWithQuestionsRecord | null> {
    const f = await this.db.Form.findOne({
      where: { publicToken: token, status: 'published' },
      include: [{ model: this.db.Question, as: 'questions' }],
      order: [[{ model: this.db.Question, as: 'questions' }, 'position', 'ASC']],
    });
    return f ? (f.toJSON() as unknown as FormWithQuestionsRecord) : null;
  }

  async update(
    id: string,
    fields: Partial<{ title: string; status: FormStatus; publicToken: string | null }>,
  ): Promise<FormRecord | null> {
    await this.db.Form.update(fields, { where: { id } });
    return this.findById(id);
  }

  async remove(id: string): Promise<void> {
    // paranoid model → soft delete (sets deleted_at); reads auto-exclude it.
    await this.db.Form.destroy({ where: { id } });
  }

  transaction<T>(fn: (t: Transaction) => Promise<T>): Promise<T> {
    return this.db.sequelize.transaction(fn);
  }
}
