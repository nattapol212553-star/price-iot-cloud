import { useState, useEffect } from 'react';
import { ref, push, update, remove } from 'firebase/database';
import { database } from '../firebase/config';
import { subscribeToPath } from '../firebase/cache';
import type { Widget } from '../types';

export function useWidgets(projectId: string) {
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) { setLoading(false); return; }
    const unsub = subscribeToPath(`widgets/${projectId}`, (val) => {
      const list: Widget[] = val
        ? Object.entries(val).map(([id, data]) => ({ id, ...(data as Omit<Widget, 'id'>) }))
        : [];
      list.sort((a, b) => a.createdAt - b.createdAt);
      setWidgets(list);
      setLoading(false);
    });
    return () => unsub();
  }, [projectId]);

  const addWidget = (data: Omit<Widget, 'id' | 'createdAt'>) =>
    push(ref(database, `widgets/${projectId}`), { ...data, createdAt: Date.now() });

  const updateWidget = (id: string, data: Partial<Omit<Widget, 'id' | 'createdAt'>>) =>
    update(ref(database, `widgets/${projectId}/${id}`), data);

  const deleteWidget = (id: string) =>
    remove(ref(database, `widgets/${projectId}/${id}`));

  return { widgets, loading, addWidget, updateWidget, deleteWidget };
}
