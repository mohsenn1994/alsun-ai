import { sequelize } from './client';
import { Form, Question, Submission, Answer, FileUpload } from './models';

/**
 * Aggregate database handle injected into repositories. Bundling the connection
 * and the models behind one object keeps repositories constructor-injected
 * (testable with a fake `Db`) instead of importing the ORM as a module singleton.
 */
export const db = { sequelize, Form, Question, Submission, Answer, FileUpload };
export type Db = typeof db;
