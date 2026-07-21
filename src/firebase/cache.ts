import { ref, onValue, type Unsubscribe, type Query } from 'firebase/database';
import { database } from './config';

const globalCache = new Map<string, any>();
const activeListeners = new Map<string, Unsubscribe>();
const subscribers = new Map<string, Set<(val: any) => void>>();

/**
 * Subscribes to a Firebase Realtime Database path.
 * Implements a global listener cache: once a listener is established for a path,
 * it is kept alive indefinitely for the session, preventing re-download of data
 * when navigating between pages.
 * 
 * @param path The Firebase database path
 * @param callback The callback to fire when data changes
 * @param queryFn Optional function to apply query modifiers (e.g., limitToLast)
 * @param cacheKey Optional key to identify the cache entry, defaults to path
 * @returns A cleanup function to remove the callback (does NOT kill the Firebase listener)
 */
export function subscribeToPath(
  path: string, 
  callback: (val: any) => void, 
  queryFn?: (dbRef: any) => Query,
  cacheKey: string = path
) {
  if (!subscribers.has(cacheKey)) {
    subscribers.set(cacheKey, new Set());
  }
  subscribers.get(cacheKey)!.add(callback);

  // If this is the first subscriber, attach Firebase listener
  if (!activeListeners.has(cacheKey)) {
    const dbRef = ref(database, path);
    const r = queryFn ? queryFn(dbRef) : dbRef;
    
    const unsub = onValue(r, (snap) => {
      const val = snap.val();
      globalCache.set(cacheKey, val);
      subscribers.get(cacheKey)?.forEach(cb => cb(val));
    });
    activeListeners.set(cacheKey, unsub);
  } else {
    // If listener already exists, immediately call back with cached value
    if (globalCache.has(cacheKey)) {
      callback(globalCache.get(cacheKey));
    }
  }

  // Return a cleanup function for the React component
  return () => {
    const set = subscribers.get(cacheKey);
    if (set) {
      set.delete(callback);
      // We explicitly DO NOT unsubscribe from Firebase here.
      // The listener stays alive globally to cache data for instant reloading.
    }
  };
}
