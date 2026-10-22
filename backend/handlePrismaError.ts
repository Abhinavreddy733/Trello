import { Prisma } from './generated/prisma/client';
import { type Response } from 'express';
import { ResponseStatus, type ResponseStatusType } from './responseStatus';
import { sendResponse } from './middleware';

type Meta = Record<string, unknown> | undefined;

const withMessage = (rs: ResponseStatusType, message: string): ResponseStatusType => ({
  ...rs,
  message,
});

const formatTarget = (target: unknown) =>
  Array.isArray(target) ? target.join(', ') : String(target ?? 'field');

// Known Prisma codes -> response (add new codes here only)
const prismaErrorMap: Record<string, (meta: Meta) => ResponseStatusType> = {
  P2000: () => withMessage(ResponseStatus.BAD_REQUEST, 'A value is too long for its column.'),
  P2002: (meta) =>
    withMessage(ResponseStatus.CONFLICT, `A record with this ${formatTarget(meta?.target)} already exists.`),
  P2003: (meta) =>
    withMessage(ResponseStatus.BAD_REQUEST, `Related record not found for ${meta?.field_name ?? 'a foreign key'}.`),
  P2011: (meta) =>
    withMessage(ResponseStatus.BAD_REQUEST, `${meta?.constraint ?? 'A field'} cannot be null.`),
  P2025: () => withMessage(ResponseStatus.NOT_FOUND, 'The requested record was not found.'),
};

// Connection / infra problems: log them, never expose details to the client
const infraErrorCodes = new Set(['P1000', 'P1001', 'P1002', 'P1008', 'P1017']);

/** Returns true if the error was a Prisma error and a response was sent. */
export function handlePrismaError(error: unknown, res: Response): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (infraErrorCodes.has(error.code)) {
      console.error('Database infrastructure error:', error);
      sendResponse(res, ResponseStatus.SERVICE_UNAVAILABLE);
      return true;
    }

    const build = prismaErrorMap[error.code];
    if (build) {
      sendResponse(res, build(error.meta as Meta));
      return true;
    }

    console.error('Unhandled Prisma error:', error);
    sendResponse(res, withMessage(ResponseStatus.BAD_REQUEST, `Database error (${error.code}).`));
    return true;
  }

  if (error instanceof Prisma.PrismaClientValidationError) {
    sendResponse(res, withMessage(ResponseStatus.BAD_REQUEST, 'Invalid data sent to the database.'));
    return true;
  }

  return false;
}