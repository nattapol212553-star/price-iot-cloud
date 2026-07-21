import { useState, useEffect } from 'react';
import { subscribeToPath } from '../firebase/cache';

// How long (ms) without a heartbeat before we consider the board offline.
// Your ESP32 loop should be writing `lastSeen` at an interval comfortably
// shorter than this (e.g. every 10-15s) so a couple of missed beats don't
// flip the badge.
const OFFLINE_TIMEOUT_MS = 35000;

export function useDeviceStatus(projectId: string) {
  const [isOnline, setIsOnline] = useState(false);

  useEffect(() => {
    // Reset immediately when switching projects so a stale "online" from the
    // previous project can't flash before the new snapshot arrives.
    setIsOnline(false);

    if (!projectId) return;

    let lastSeenVal = 0;

    const unsub = subscribeToPath(
      `projects/${projectId}/lastSeen`,
      (val) => {
        lastSeenVal = val || 0;
        // H2 fix: use the constant instead of hardcoded 35000
        setIsOnline(lastSeenVal ? (Date.now() - lastSeenVal < OFFLINE_TIMEOUT_MS) : false);
      }
    );

    // Firebase only pushes updates when the DB value changes, but "going
    // offline" is a function of the clock, not a DB write — so we still need
    // this poll to flip isOnline false once the timeout elapses with no new data.
    const interval = setInterval(() => {
      setIsOnline(lastSeenVal > 0 && Date.now() - lastSeenVal < OFFLINE_TIMEOUT_MS);
    }, 5000);

    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [projectId]);

  return isOnline;
}
