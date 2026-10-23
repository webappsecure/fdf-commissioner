export type StorageStatus = 'native' | 'persistent' | 'not granted' | 'unsupported';

export async function requestStoragePersistence(): Promise<StorageStatus> {
  if (process.env.EXPO_OS !== 'web') return 'native';
  if (typeof navigator === 'undefined' || !navigator.storage?.persist) return 'unsupported';
  if (await navigator.storage.persisted()) return 'persistent';
  return (await navigator.storage.persist()) ? 'persistent' : 'not granted';
}
