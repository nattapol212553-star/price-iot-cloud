import { useState, useEffect } from 'react';
import { ref, onValue, query, limitToLast } from 'firebase/database';
import { database } from '../firebase/config';
import type { HistoryPoint } from '../types';

export function useHistory(projectId: string, pin: string, limit = 360) {
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId || !pin) { setLoading(false); return; }
    const r = query(ref(database, `history/${projectId}/${pin}`), limitToLast(limit));
    const unsub = onValue(r, (snap) => {
      const val = snap.val();
      const list: HistoryPoint[] = val
        ? Object.values(val).map((d) => d as HistoryPoint)
        : [];
      list.sort((a, b) => a.timestamp - b.timestamp);
      setHistory(list);
      setLoading(false);
    });
    return () => unsub();
  }, [projectId, pin, limit]);

  return { history, loading };
}
