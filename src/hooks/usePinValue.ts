import { useState, useEffect, useCallback } from 'react';
import { ref, set } from 'firebase/database';
import { database } from '../firebase/config';
import { subscribeToPath } from '../firebase/cache';

export function usePinValue(projectId: string, pin: string) {
  const [value, setValue] = useState<number | string | boolean | null>(null);

  useEffect(() => {
    if (!projectId || !pin) return;
    const unsub = subscribeToPath(`pins/${projectId}/${pin}`, (val) => {
      setValue(val);
    });
    return () => unsub();
  }, [projectId, pin]);

  const write = useCallback(async (newValue: number | string) => {
    if (!projectId || !pin) return;
    try {
      await set(ref(database, `pins/${projectId}/${pin}`), newValue);
    } catch (err) {
      console.error('Failed to write pin value:', err);
    }
  }, [projectId, pin]);

  return { value, write };
}
