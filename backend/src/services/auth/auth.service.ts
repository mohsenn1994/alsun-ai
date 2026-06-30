import { checkCredentials } from '../../lib/session';
import { UnauthorizedError } from '../../errors';

/** Single-creator auth. Session cookie management stays in the controller (HTTP). */
export class AuthService {
  // Verify credentials; return the username or throw 401.
  login(username: string, password: string): string {
    if (!checkCredentials(username, password)) {
      throw new UnauthorizedError('Invalid username or password');
    }
    return username;
  }
}
