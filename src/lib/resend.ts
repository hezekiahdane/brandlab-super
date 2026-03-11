import { Resend } from 'resend';

let _resend: Resend | null = null;

/** Lazily create Resend client — avoids build-time crash when RESEND_API_KEY is absent. */
export function getResend(): Resend {
  if (!_resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error(
        'RESEND_API_KEY is not set — cannot send emails'
      );
    }
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

export const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || 'notifications@brandlab.app';
