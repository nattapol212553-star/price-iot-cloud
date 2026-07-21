import { useState, useEffect } from 'react';
import { ref, push, update, remove } from 'firebase/database';
import { database } from '../firebase/config';
import { subscribeToPath } from '../firebase/cache';
import type { Datastream } from '../types';

export function useDatastreams(projectId: string) {
  const [datastreams, setDatastreams] = useState<Datastream[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) { setLoading(false); return; }
    const unsub = subscribeToPath(`datastreams/${projectId}`, (val) => {
      const list: Datastream[] = val
        ? Object.entries(val).map(([id, data]) => ({ id, ...(data as Omit<Datastream, 'id'>) }))
        : [];
      list.sort((a, b) => a.createdAt - b.createdAt);
      setDatastreams(list);
      setLoading(false);
    });
    return () => unsub();
  }, [projectId]);

  const createDatastream = (data: Omit<Datastream, 'id' | 'createdAt'>) =>
    push(ref(database, `datastreams/${projectId}`), { ...data, createdAt: Date.now() });

  const updateDatastream = (id: string, data: Partial<Omit<Datastream, 'id' | 'createdAt'>>) =>
    update(ref(database, `datastreams/${projectId}/${id}`), data);

  const deleteDatastream = (id: string) =>
    remove(ref(database, `datastreams/${projectId}/${id}`));

  return { datastreams, loading, createDatastream, updateDatastream, deleteDatastream };
}
