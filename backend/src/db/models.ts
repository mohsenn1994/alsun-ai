import {
  DataTypes,
  Model,
  type InferAttributes,
  type InferCreationAttributes,
  type CreationOptional,
  type ForeignKey,
} from 'sequelize';
import { sequelize } from './client';

export type FormStatus = 'draft' | 'published';
export type QuestionType = 'text' | 'multiple_choice' | 'file';

/* ---- Form ---- */
export class Form extends Model<InferAttributes<Form>, InferCreationAttributes<Form>> {
  declare id: CreationOptional<string>;
  declare title: string;
  declare status: CreationOptional<FormStatus>;
  declare publicToken: CreationOptional<string | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  // Soft delete: null = live, a timestamp = soft-deleted (paranoid mode).
  declare deletedAt: CreationOptional<Date | null>;
}
Form.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    title: { type: DataTypes.TEXT, allowNull: false },
    status: {
      type: DataTypes.TEXT,
      allowNull: false,
      defaultValue: 'draft',
      validate: { isIn: [['draft', 'published']] },
    },
    publicToken: { type: DataTypes.TEXT, allowNull: true, unique: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
    deletedAt: DataTypes.DATE,
  },
  // paranoid: DELETE soft-deletes (sets deleted_at); all reads auto-exclude
  // soft-deleted rows. Note: this does NOT cascade to questions/submissions —
  // the form is the aggregate root, so hiding it makes its children unreachable
  // through it, and a future restore() brings the whole form back intact.
  { sequelize, tableName: 'forms', underscored: true, paranoid: true },
);

/* ---- Question ---- */
export class Question extends Model<
  InferAttributes<Question>,
  InferCreationAttributes<Question>
> {
  declare id: CreationOptional<string>;
  declare formId: ForeignKey<Form['id']>;
  declare type: QuestionType;
  declare label: string;
  declare required: CreationOptional<boolean>;
  declare position: number;
  declare config: CreationOptional<Record<string, unknown>>;
  declare visibilityRule: CreationOptional<Record<string, unknown> | null>;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  // Soft delete (paranoid): null = live, timestamp = soft-deleted.
  declare deletedAt: CreationOptional<Date | null>;
}
Question.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    formId: { type: DataTypes.UUID, allowNull: false },
    type: {
      type: DataTypes.TEXT,
      allowNull: false,
      validate: { isIn: [['text', 'multiple_choice', 'file']] },
    },
    label: { type: DataTypes.TEXT, allowNull: false },
    required: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
    position: { type: DataTypes.INTEGER, allowNull: false },
    // Type-specific config (MCQ options, etc.); shape validated by @alsun/schemas.
    config: { type: DataTypes.JSONB, allowNull: false, defaultValue: {} },
    // Bonus (Phase 6): recursive Condition tree. null = always visible.
    visibilityRule: { type: DataTypes.JSONB, allowNull: true },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
    deletedAt: DataTypes.DATE,
  },
  // paranoid: soft delete. A deleted question drops out of the form detail, the
  // public form, and the submission gate automatically (paranoid filters includes
  // and finds), leaving a position gap the next reorder rewrites cleanly.
  { sequelize, tableName: 'questions', underscored: true, paranoid: true },
);

/* ---- Submission ---- */
export class Submission extends Model<
  InferAttributes<Submission>,
  InferCreationAttributes<Submission>
> {
  declare id: CreationOptional<string>;
  declare formId: ForeignKey<Form['id']>;
  declare createdAt: CreationOptional<Date>;
}
Submission.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    formId: { type: DataTypes.UUID, allowNull: false },
    createdAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'submissions', underscored: true, updatedAt: false },
);

/* ---- Answer ---- */
export class Answer extends Model<InferAttributes<Answer>, InferCreationAttributes<Answer>> {
  declare id: CreationOptional<string>;
  declare submissionId: ForeignKey<Submission['id']>;
  declare questionId: ForeignKey<Question['id']>;
  // Shape depends on question type: string | string[] | { fileId }.
  declare value: unknown;
}
Answer.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    submissionId: { type: DataTypes.UUID, allowNull: false },
    questionId: { type: DataTypes.UUID, allowNull: false },
    value: { type: DataTypes.JSONB, allowNull: false },
  },
  { sequelize, tableName: 'answers', underscored: true, timestamps: false },
);

/* ---- FileUpload (named to avoid clashing with the global File type) ---- */
export class FileUpload extends Model<
  InferAttributes<FileUpload>,
  InferCreationAttributes<FileUpload>
> {
  declare id: CreationOptional<string>;
  // Nullable: a file is uploaded first, then linked when the submission is saved.
  declare answerId: CreationOptional<string | null>;
  declare storageKey: string;
  declare filename: string;
  declare mimeType: string;
  declare size: number;
  declare createdAt: CreationOptional<Date>;
}
FileUpload.init(
  {
    id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
    answerId: { type: DataTypes.UUID, allowNull: true },
    storageKey: { type: DataTypes.TEXT, allowNull: false },
    filename: { type: DataTypes.TEXT, allowNull: false },
    mimeType: { type: DataTypes.TEXT, allowNull: false },
    size: { type: DataTypes.INTEGER, allowNull: false },
    createdAt: DataTypes.DATE,
  },
  { sequelize, tableName: 'files', underscored: true, updatedAt: false },
);

/* ---- Associations (keep Phase 4 dashboard/detail queries clean) ---- */
Form.hasMany(Question, { foreignKey: 'formId', onDelete: 'CASCADE', as: 'questions' });
Question.belongsTo(Form, { foreignKey: 'formId', as: 'form' });

Form.hasMany(Submission, { foreignKey: 'formId', onDelete: 'CASCADE', as: 'submissions' });
Submission.belongsTo(Form, { foreignKey: 'formId', as: 'form' });

Submission.hasMany(Answer, { foreignKey: 'submissionId', onDelete: 'CASCADE', as: 'answers' });
Answer.belongsTo(Submission, { foreignKey: 'submissionId', as: 'submission' });

Question.hasMany(Answer, { foreignKey: 'questionId', onDelete: 'CASCADE', as: 'answers' });
Answer.belongsTo(Question, { foreignKey: 'questionId', as: 'question' });

Answer.hasOne(FileUpload, { foreignKey: 'answerId', onDelete: 'CASCADE', as: 'file' });
FileUpload.belongsTo(Answer, { foreignKey: 'answerId', as: 'answer' });
