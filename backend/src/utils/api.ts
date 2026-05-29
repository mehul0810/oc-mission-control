import type { Response } from 'express';
import type { ApiEnvelope, ApiErrorEnvelope } from '../types';

export function ok<T>(res: Response<ApiEnvelope<T>>, data: T, status = 200, meta?: Record<string, unknown>) {
  return res.status(status).json(meta ? { data, meta } : { data });
}

export function fail(
  res: Response<ApiErrorEnvelope>,
  status: number,
  code: string,
  message: string,
  details?: unknown[]
) {
  return res.status(status).json({
    error: {
      code,
      message,
      ...(details && details.length ? { details } : {})
    }
  });
}

export function requireNonEmptyString(value: unknown, field: string): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : null;
}
