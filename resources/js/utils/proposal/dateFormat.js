/**
 * formatArchivedAt: from ArchiveProposals.jsx — local-time "MM/DD/YY HH:mm".
 */
export function formatArchivedAt(isoStr) {
  if (!isoStr) return '—';
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return '—';

  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');

  return `${mm}/${dd}/${yy} ${hh}:${min}`;
}

/**
 * formatDateLabel: from ApprovedProjects.jsx — UTC "MM/DD/YY", date-only
 * (no time component), used for date-range filter labels.
 */
export function formatDateLabel(dateStr) {
  try {
    if (!dateStr) return '—';
    const datePart = dateStr.split(' ')[0];
    const [year, month, day] = datePart.split('-');
    const date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day)));
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-US', {
      month: '2-digit',
      day: '2-digit',
      year: '2-digit',
      timeZone: 'UTC',
    });
  } catch {
    return '—';
  }
}