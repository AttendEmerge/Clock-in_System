/**
 * Timezone utilities for organization-local time comparisons.
 * Uses Intl API — no extra dependencies.
 */

const APP_TIMEZONE = process.env.APP_TIMEZONE || 'UTC';

/**
 * Get date/time parts in the organization's timezone.
 */
function getPartsInTz(date, tz = APP_TIMEZONE) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    weekday: 'short',
    hour12: false,
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value;
  return {
    year: parseInt(get('year'), 10),
    month: parseInt(get('month'), 10) - 1,
    day: parseInt(get('day'), 10),
    hour: parseInt(get('hour'), 10),
    minute: parseInt(get('minute'), 10),
    second: parseInt(get('second'), 10),
    weekday: get('weekday'),
  };
}

/**
 * Get UTC offset in minutes for a timezone at a given date (positive = tz ahead of UTC).
 */
function getOffsetMinutes(date, tz = APP_TIMEZONE) {
  const utcParts = new Intl.DateTimeFormat('en', {
    timeZone: 'UTC',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(date);
  const tzParts = new Intl.DateTimeFormat('en', {
    timeZone: tz,
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(date);
  const utcH = parseInt(utcParts.find((p) => p.type === 'hour').value, 10);
  const utcM = parseInt(utcParts.find((p) => p.type === 'minute').value, 10);
  const tzH = parseInt(tzParts.find((p) => p.type === 'hour').value, 10);
  const tzM = parseInt(tzParts.find((p) => p.type === 'minute').value, 10);
  return (tzH - utcH) * 60 + (tzM - utcM);
}

/**
 * Check if a clock-out time is "early" — significantly before expected_end in org timezone.
 * Returns true only when the user clocks out more than thresholdMinutes before expected_end.
 */
function isEarlyDepartureInTz(clockOutTime, expectedEndStr, thresholdMinutes = 60, tz = APP_TIMEZONE) {
  const parts = getPartsInTz(clockOutTime, tz);
  const nowMinutes = parts.hour * 60 + parts.minute + parts.second / 60;

  const [endH, endM] = String(expectedEndStr).split(':').map(Number);
  const expectedEndMinutes = endH * 60 + endM;

  const diffMinutes = expectedEndMinutes - nowMinutes;
  return diffMinutes > thresholdMinutes;
}

module.exports = {
  APP_TIMEZONE,
  getPartsInTz,
  getOffsetMinutes,
  isEarlyDepartureInTz,
};
