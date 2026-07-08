/**
 * Replaces the copy-pasted `LS` object that appeared, with a different key
 * prefix, in ArchiveProposals.jsx, GeneratedProposals.jsx and
 * ApprovedProjects.jsx.
 *
 * Usage:
 *   const LS = createStorage('archived_proposals');
 *   LS.get('search', '');
 *   LS.set('search', value);
 *   LS.clearAll(); // only needed where a "clear all filters" action exists
 */
export function createStorage(namespace) {
  const prefix = `${namespace}_`;

  return {
    get(key, fallback = '') {
      try {
        return localStorage.getItem(`${prefix}${key}`) ?? fallback;
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(`${prefix}${key}`, value);
      } catch {
        /* storage disabled / quota exceeded — safe to ignore */
      }
    },
    clearAll() {
      try {
        Object.keys(localStorage)
          .filter((k) => k.startsWith(prefix))
          .forEach((k) => localStorage.removeItem(k));
      } catch {
        /* noop */
      }
    },
  };
}