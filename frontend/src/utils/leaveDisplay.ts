import { format } from 'date-fns';

/** Human-readable leave status (DB still uses early_return) */
export function formatLeaveStatus(status: string): string {
  if (status === 'early_return') return 'Return logged';
  return status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

/** Compare calendar dates as YYYY-MM-DD strings */
function ymd(s: string | null | undefined): string {
  if (s == null || s === '') return '';
  return String(s).slice(0, 10);
}

/**
 * Report / table cell: Early (dd MMM yyyy), Late (…), On time (…), or empty if no return logged.
 */
export function formatReturnType(
  actual_return_date: string | null | undefined,
  scheduled_end_date: string | null | undefined
): string {
  const actual = ymd(actual_return_date);
  const end = ymd(scheduled_end_date);
  if (!actual) return '';
  let label: string;
  if (end) {
    if (actual < end) label = 'Early';
    else if (actual > end) label = 'Late';
    else label = 'On time';
  } else {
    label = 'Logged';
  }
  try {
    const d = format(new Date(actual + 'T12:00:00'), 'd MMM yyyy');
    return `${label} (${d})`;
  } catch {
    return `${label} (${actual})`;
  }
}

/** Sentence for leave list cards when a return was recorded */
export function formatReturnSummary(
  actual_return_date: string | null | undefined,
  scheduled_end_date: string | null | undefined,
  reason: string | null | undefined
): string {
  const actual = ymd(actual_return_date);
  const end = ymd(scheduled_end_date);
  if (!actual) return '';
  let phrase: string;
  if (end) {
    if (actual < end) phrase = 'Returned early on';
    else if (actual > end) phrase = 'Returned late on';
    else phrase = 'Returned on schedule on';
  } else {
    phrase = 'Return recorded on';
  }
  try {
    const d = format(new Date(actual + 'T12:00:00'), 'd MMM yyyy');
    const r = reason?.trim();
    return r ? `${phrase} ${d}: ${r}` : `${phrase} ${d}`;
  } catch {
    return reason?.trim() ? `${phrase} ${actual}: ${reason.trim()}` : `${phrase} ${actual}`;
  }
}
