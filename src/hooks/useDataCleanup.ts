import { useEffect } from 'react';
import { ref, get, query, orderByChild, endAt, update } from 'firebase/database';
import { database } from '../firebase/config';

const RETENTION_DAYS = 15;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function useDataCleanup(projectId: string | null) {
  useEffect(() => {
    if (!projectId) return;

    let cancelled = false;

    const cleanupOldData = async () => {
      try {
        const now = Date.now();
        const projectRef = ref(database, `projects/${projectId}`);

        // 1. Check the last cleanup time
        const snapshot = await get(ref(database, `projects/${projectId}/lastCleanupAt`));
        if (cancelled) return;
        const lastCleanupAt = snapshot.val() || 0;

        // If we already cleaned up today (within the last 24 hours), skip.
        if (now - lastCleanupAt < MS_PER_DAY) {
          return;
        }

        // 2. Find all datastreams to get their pin values
        const dsSnapshot = await get(ref(database, `datastreams/${projectId}`));
        if (cancelled) return;
        const datastreams = dsSnapshot.val() || {};
        const cutoffTime = now - (RETENTION_DAYS * MS_PER_DAY);

        // 3. Extract pin values (e.g. "V0", "V1") — NOT the Firebase push-IDs
        //    History is stored under history/${projectId}/${pin}, not by push-ID.
        const pins: string[] = Object.values(datastreams)
          .map((ds: any) => ds?.pin)
          .filter((pin): pin is string => typeof pin === 'string' && pin.length > 0);

        // 4. For each pin, delete history older than RETENTION_DAYS
        for (const pin of pins) {
          if (cancelled) return;
          const historyRef = ref(database, `history/${projectId}/${pin}`);
          const oldDataQuery = query(historyRef, orderByChild('timestamp'), endAt(cutoffTime));

          const oldDataSnapshot = await get(oldDataQuery);
          if (cancelled) return;
          if (oldDataSnapshot.exists()) {
            const updates: Record<string, null> = {};
            oldDataSnapshot.forEach((child) => {
              // Guard against null keys (malformed data)
              if (child.key) {
                updates[child.key] = null;
              }
            });

            if (Object.keys(updates).length > 0) {
              await update(historyRef, updates);
              if (cancelled) return;
            }
          }
        }

        // 5. Update the last cleanup time so we don't run again today
        if (!cancelled) {
          await update(projectRef, { lastCleanupAt: now });
        }

      } catch (error) {
        if (import.meta.env.DEV) {
          console.error('[Cleanup] Failed to clean up old data:', error);
        }
      }
    };

    // Run cleanup asynchronously in the background so it doesn't block UI
    cleanupOldData();

    return () => { cancelled = true; };

  }, [projectId]);
}
