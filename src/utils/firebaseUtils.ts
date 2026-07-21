// Utility to generate a Firebase Push ID for a specific timestamp
// This allows us to query by timestamp using orderByKey() without needing custom indexes.

const PUSH_CHARS = '-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz';

export function generatePushIdForTimestamp(now: number): string {
  let timeStampChars = new Array(8);
  for (let i = 7; i >= 0; i--) {
    timeStampChars[i] = PUSH_CHARS.charAt(now % 64);
    now = Math.floor(now / 64);
  }
  return timeStampChars.join('');
}

export function getPushIdStart(timestamp: number): string {
  return generatePushIdForTimestamp(timestamp) + '----------------';
}

export function getPushIdEnd(timestamp: number): string {
  return generatePushIdForTimestamp(timestamp) + 'zzzzzzzzzzzzzzzz';
}
