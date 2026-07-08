/**
 * Was reconstructed identically in all 3 files:
 *   const pagination = activeData?.current_page ? {
 *     page: activeData.current_page,
 *     perPage: activeData.per_page,
 *     total: activeData.total,
 *     onPageChange: goToPage,
 *   } : null;
 */
export function buildPagination(pagedData, onPageChange, fallbackPerPage) {
  if (!pagedData || typeof pagedData.current_page !== 'number') return null;
  return {
    page: pagedData.current_page,
    perPage: pagedData.per_page ?? fallbackPerPage,
    total: pagedData.total ?? (pagedData.data?.length ?? 0),
    onPageChange,
  };
}