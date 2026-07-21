import { useState, useEffect } from 'react';
import { ref, onValue, set, remove } from 'firebase/database';
import { database } from '../firebase/config';

export interface ProjectSettings {
  ecoMode?: boolean;
  graphContinuous?: boolean;
}

export function useProjectSettings(projectId: string) {
  const [settings, setSettings] = useState<ProjectSettings>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!projectId) {
      setLoading(false);
      return;
    }

    const settingsRef = ref(database, `settings/${projectId}`);
    
    const unsubscribe = onValue(settingsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        setSettings(data);
      } else {
        setSettings({});
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [projectId]);

  const updateEcoMode = async (ecoMode: boolean) => {
    if (!projectId) return;
    try {
      const ecoModeRef = ref(database, `settings/${projectId}/ecoMode`);
      await set(ecoModeRef, ecoMode);
    } catch (err) {
      console.error('Error updating ecoMode:', err);
      throw err;
    }
  };

  const updateGraphMode = async (graphContinuous: boolean) => {
    if (!projectId) return;
    try {
      const graphRef = ref(database, `settings/${projectId}/graphContinuous`);
      await set(graphRef, graphContinuous);
    } catch (err) {
      console.error('Error updating graphMode:', err);
      throw err;
    }
  };

  const pingHandshake = async () => {
    if (!projectId) return false;
    
    const pingId = Date.now().toString();
    const pingRef = ref(database, `pins/${projectId}/_sys_handshake`);
    const pongRef = ref(database, `settings/${projectId}/ecoHandshake/pong`);
    
    try {
      await remove(pongRef);
      
      return await new Promise<boolean>((resolve) => {
        let timeoutId: ReturnType<typeof setTimeout>;
        let unsubscribe: (() => void) | undefined;
        
        const done = (result: boolean) => {
          if (timeoutId) clearTimeout(timeoutId);
          if (unsubscribe) unsubscribe();
          resolve(result);
        };
        
        timeoutId = setTimeout(() => done(false), 3000);
        
        unsubscribe = onValue(pongRef, (snapshot) => {
          if (snapshot.val() === pingId) done(true);
        });
        
        set(pingRef, pingId).catch(() => done(false));
      });
    } catch (err) {
      console.error('Handshake error', err);
      return false;
    }
  };

  return { settings, loading, updateEcoMode, updateGraphMode, pingHandshake };
}
