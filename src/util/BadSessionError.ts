import { ApolloError } from 'apollo-server-errors';

export class BadSessionError extends ApolloError {
  constructor(message?: string) {
    super(message ?? "Not logged in.", '401');

    Object.defineProperty(this, 'name', { value: 'BadSessionError' });
  }
}
