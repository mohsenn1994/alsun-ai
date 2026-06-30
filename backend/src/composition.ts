import { db, type Db } from './db';
import { FormsRepository } from './repositories/forms/forms.repository';
import { QuestionsRepository } from './repositories/questions/questions.repository';
import { FilesRepository } from './repositories/files/files.repository';
import { SubmissionsRepository } from './repositories/submissions/submissions.repository';
import { AuthService } from './services/auth/auth.service';
import { HealthService } from './services/health/health.service';
import { FormsService } from './services/forms/forms.service';
import { QuestionsService } from './services/questions/questions.service';
import { FilesService } from './services/files/files.service';
import { SubmissionsService } from './services/submissions/submissions.service';
import { AuthController } from './controllers/auth/auth.controller';
import { HealthController } from './controllers/health/health.controller';
import { FormsController } from './controllers/forms/forms.controller';
import { QuestionsController } from './controllers/questions/questions.controller';
import { PublicController } from './controllers/public/public.controller';
import { SubmissionsController } from './controllers/submissions/submissions.controller';
import { FilesController } from './controllers/files/files.controller';

/** The controllers the routes wire to. */
export interface Controllers {
  health: HealthController;
  auth: AuthController;
  forms: FormsController;
  questions: QuestionsController;
  public: PublicController;
  submissions: SubmissionsController;
  files: FilesController;
}

/**
 * Manual composition root: construct the object graph once
 * (repositories ← db, services ← repositories, controllers ← services) and
 * hand back the controllers. No DI framework — just explicit `new`s in one
 * place, so wiring is obvious and tests can build the graph with a fake `Db`.
 */
export function createControllers(database: Db = db): Controllers {
  // repositories (the only layer touching the ORM)
  const formsRepository = new FormsRepository(database);
  const questionsRepository = new QuestionsRepository(database);
  const filesRepository = new FilesRepository(database);
  const submissionsRepository = new SubmissionsRepository(database);

  // services (business logic)
  const authService = new AuthService();
  const healthService = new HealthService(database);
  const formsService = new FormsService(formsRepository, questionsRepository);
  const questionsService = new QuestionsService(questionsRepository);
  const filesService = new FilesService(filesRepository);
  const submissionsService = new SubmissionsService(
    formsRepository,
    questionsRepository,
    filesRepository,
    submissionsRepository,
  );

  // controllers (HTTP boundary)
  return {
    health: new HealthController(healthService),
    auth: new AuthController(authService),
    forms: new FormsController(formsService, submissionsService),
    questions: new QuestionsController(questionsService),
    public: new PublicController(formsService, filesService, submissionsService),
    submissions: new SubmissionsController(submissionsService),
    files: new FilesController(filesService),
  };
}
