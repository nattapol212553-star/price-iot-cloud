import { useState, useEffect } from 'react';
import { ref, onValue, push, update, remove } from 'firebase/database';
import { database } from '../firebase/config';
import type { Project } from '../types';
import { generateDeviceToken } from '../utils/tokenGenerator';

export function useProjects() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const r = ref(database, 'projects');
    const unsub = onValue(r, (snap) => {
      const val = snap.val();
      const list: Project[] = val
        ? Object.entries(val).map(([id, data]) => ({ id, ...(data as Omit<Project, 'id'>) }))
        : [];
      list.sort((a, b) => b.createdAt - a.createdAt);
      setProjects(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const createProject = (data: Omit<Project, 'id' | 'createdAt' | 'deviceToken' | 'status' | 'lastSeen'>) =>
    push(ref(database, 'projects'), {
      ...data,
      deviceToken: generateDeviceToken(),
      status: 'Offline',
      lastSeen: Date.now(),
      createdAt: Date.now(),
    });

  const deleteProject = async (id: string) => {
    await Promise.all([
      remove(ref(database, `projects/${id}`)),
      remove(ref(database, `widgets/${id}`)),
      remove(ref(database, `datastreams/${id}`)),
      remove(ref(database, `settings/${id}`)),
      remove(ref(database, `pins/${id}`)),
      remove(ref(database, `history/${id}`))
    ]);
  };

  const regenerateToken = (id: string) => {
    const newToken = generateDeviceToken();
    return update(ref(database, `projects/${id}`), { deviceToken: newToken });
  };

  const updateProjectTheme = (id: string, themeId: string) =>
    update(ref(database, `projects/${id}`), { theme: themeId });

  return { projects, loading, createProject, deleteProject, regenerateToken, updateProjectTheme };
}
