import { ApolloError } from 'apollo-server-errors';

export class ForbiddenError extends ApolloError {
  constructor(message?: string) {
    super(message ?? "Permission denied.", '403');

    Object.defineProperty(this, 'name', { value: 'ForbiddenError' });
  }
}
