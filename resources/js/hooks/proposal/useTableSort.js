import { useState, useCallback } from 'react';

/**
 * Replaces the copy-pasted sort state + handleSort() pattern:
 *   const [sortBy, setSortBy] = useState(...)
 *   const [sortOrder, setSortOrder] = useState(...)
 *   const handleSort = (key) => { toggle order, persist to LS, refetch }
 *
 * `onChange(nextSortBy, nextSortOrder)` is called after the state updates
 * (e.g. to trigger a refetch and/or persist to storage) so callers keep
 * full control over side effects.
 *
 * Usage:
 *   const { sortBy, sortOrder, handleSort } = useTableSort({
 *     initialSortBy: LS.get('sort_by', 'archived_at'),
 *     initialSortOrder: LS.get('sort_order', 'desc'),
 *     onChange: (sb, so) => {
 *       LS.set('sort_by', sb);
 *       LS.set('sort_order', so);
 *       fetchFiltered({ search, status: statusFilter, sortBy: sb, sortOrder: so });
 *     },
 *   });
 */
export function useTableSort({ initialSortBy = '', initialSortOrder = 'desc', onChange } = {}) {
  const [sortBy, setSortBy] = useState(initialSortBy);
  const [sortOrder, setSortOrder] = useState(initialSortOrder);

  const handleSort = useCallback(
    (key) => {
      const newOrder = sortBy === key && sortOrder === 'desc' ? 'asc' : 'desc';
      setSortBy(key);
      setSortOrder(newOrder);
      onChange?.(key, newOrder);
    },
    [sortBy, sortOrder, onChange]
  );

  return { sortBy, sortOrder, setSortBy, setSortOrder, handleSort };
}