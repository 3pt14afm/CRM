import React from 'react';
import SortHeader from '@/Components/SortHeader';
import StatusBadge from '@/Components/proposal/StatusBadge';

/**
 * Every column definition in ArchiveProposals, GeneratedProposals and
 * ApprovedProjects repeated the same shape:
 *   {
 *     key: "...",
 *     header: <SortHeader label="..." sortKey="..." sortBy={sortBy}
 *               sortDirection={sortOrder} onSort={handleSort} align="left" />,
 *     cell: (r) => ...,
 *   }
 *
 * sortableColumn() builds that object for you — pass the sort state once
 * and just describe the label/cell per column.
 *
 * Usage:
 *   sortableColumn({
 *     key: 'company_name',
 *     label: 'CLIENT / COMPANY',
 *     sortBy, sortOrder, onSort: handleSort,
 *     cell: (r) => <span>{r.company_name ?? '—'}</span>,
 *   })
 *
 *   // when the sort key differs from the display key (e.g. ApprovedProjects'
 *   // "APPROVED BY" column actually sorts on "decided_at"):
 *   sortableColumn({ key: 'approved_by_name', sortKey: 'decided_at', label: 'APPROVED BY', ... })
 */
export function sortableColumn({ key, label, sortKey = key, sortBy, sortOrder, onSort, align = 'left', cell }) {
  return {
    key,
    header: (
      <SortHeader label={label} sortKey={sortKey} sortBy={sortBy} sortDirection={sortOrder} onSort={onSort} align={align} />
    ),
    cell,
  };
}

/**
 * The "ACTIONS" column — same header markup and centered cell wrapper
 * everywhere, only the button/dropdown rendered per row differs.
 *
 * Usage:
 *   actionsColumn({ render: (r) => <ViewRecordButton id={r.id} type={activeTab} /> })
 */
export function actionsColumn({ render, headerLabel = 'ACTIONS', cellClassName = 'flex justify-center' }) {
  return {
    key: 'actions',
    header: <span className="block text-center">{headerLabel}</span>,
    cell: (r) => <div className={cellClassName}>{render(r)}</div>,
  };
}

/**
 * The "STATUS" column — was reimplemented 3 times as either a bare pill
 * or, in ApprovedProjects' sprf table, hardcoded to "APPROVED". Now just
 * wraps <StatusBadge>.
 *
 * Usage (non-sortable, as in ApprovedProjects sprf table):
 *   statusColumn({})
 *
 * Usage (sortable, as in ArchiveProposals/GeneratedProposals):
 *   statusColumn({ sortable: true, sortBy, sortOrder, onSort: handleSort })
 */
export function statusColumn({
  key = 'status',
  label = 'STATUS',
  sortable = false,
  sortBy,
  sortOrder,
  onSort,
  variantMap,
  getStatus = (r) => r.status,
} = {}) {
  const cell = (r) => (
    <div className="flex justify-start">
      <StatusBadge status={getStatus(r)} variantMap={variantMap} />
    </div>
  );

  if (sortable) {
    return sortableColumn({ key, label, sortBy, sortOrder, onSort, cell });
  }
  return { key, header: label, cell };
}