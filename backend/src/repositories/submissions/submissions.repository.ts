import type { Db } from '../../db';
import type { SubmissionWithAnswersRecord } from '../records';

export interface SubmissionSummaryRow {
  id: string;
  formId: string;
  createdAt: Date;
  answerCount: number;
}

export interface AnswerToStore {
  questionId: string;
  value: unknown;
  type: string;
}

/** Data access for submissions, answers, and the transactional submit write. */
export class SubmissionsRepository {
  constructor(private readonly db: Db) {}

  // List a form's submissions newest-first, each with its answer count only.
  async listByFormWithCounts(formId: string): Promise<SubmissionSummaryRow[]> {
    const rows = await this.db.Submission.findAll({
      where: { formId },
      order: [['createdAt', 'DESC']],
      include: [{ model: this.db.Answer, as: 'answers', attributes: ['id'] }],
    });
    return rows.map((s) => {
      const json = s.toJSON() as unknown as { id: string; createdAt: Date; answers?: unknown[] };
      return { id: json.id, formId, createdAt: json.createdAt, answerCount: json.answers?.length ?? 0 };
    });
  }

  async findByIdWithAnswersAndFiles(id: string): Promise<SubmissionWithAnswersRecord | null> {
    const s = await this.db.Submission.findByPk(id, {
      include: [{ model: this.db.Answer, as: 'answers', include: [{ model: this.db.FileUpload, as: 'file' }] }],
    });
    return s ? (s.toJSON() as unknown as SubmissionWithAnswersRecord) : null;
  }

  // Create the submission + its answers, linking file answers, in one transaction.
  async createWithAnswers(formId: string, entries: AnswerToStore[]): Promise<string> {
    const created = await this.db.sequelize.transaction(async (transaction) => {
      const submission = await this.db.Submission.create({ formId }, { transaction });
      for (const entry of entries) {
        const answer = await this.db.Answer.create(
          { submissionId: submission.id, questionId: entry.questionId, value: entry.value },
          { transaction },
        );
        if (entry.type === 'file') {
          const { fileId } = entry.value as { fileId: string };
          await this.db.FileUpload.update({ answerId: answer.id }, { where: { id: fileId }, transaction });
        }
      }
      return submission;
    });
    return created.id;
  }
}
