type UniStorage = {
  getStorageSync?: (key: string) => unknown;
  setStorageSync?: (key: string, value: string) => void;
  removeStorageSync?: (key: string) => void;
};

function getUniStorage(): UniStorage | null {
  const maybeUni = (globalThis as typeof globalThis & { uni?: UniStorage }).uni;
  if (!maybeUni) {
    return null;
  }

  return maybeUni;
}

function getBrowserStorage(): Storage | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function getClientStorageItem(key: string): string {
  const uniStorage = getUniStorage();
  if (uniStorage?.getStorageSync) {
    try {
      const value = uniStorage.getStorageSync(key);
      return typeof value === 'string' ? value : value ? String(value) : '';
    } catch {
      // Fall through to browser storage.
    }
  }

  const browserStorage = getBrowserStorage();
  if (!browserStorage) {
    return '';
  }

  try {
    return browserStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}

export function setClientStorageItem(key: string, value: string): void {
  const uniStorage = getUniStorage();
  if (uniStorage?.setStorageSync) {
    try {
      uniStorage.setStorageSync(key, value);
      return;
    } catch {
      // Fall through to browser storage.
    }
  }

  const browserStorage = getBrowserStorage();
  if (!browserStorage) {
    return;
  }

  try {
    browserStorage.setItem(key, value);
  } catch {
    // Ignore storage failures in the browser preview.
  }
}

export function removeClientStorageItem(key: string): void {
  const uniStorage = getUniStorage();
  if (uniStorage?.removeStorageSync) {
    try {
      uniStorage.removeStorageSync(key);
      return;
    } catch {
      // Fall through to browser storage.
    }
  }

  const browserStorage = getBrowserStorage();
  if (!browserStorage) {
    return;
  }

  try {
    browserStorage.removeItem(key);
  } catch {
    // Ignore storage failures in the browser preview.
  }
}
