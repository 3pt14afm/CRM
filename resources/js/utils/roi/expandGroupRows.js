export function expandGroupRows(rows, expandedGroups) {
  const flattened = [];
  rows.forEach((r) => {
    flattened.push(r);
    if (r.is_group && expandedGroups.has(r.reference)) {
      // Entry 1 = the master row's own data, synthesized since the
      // top-level summary row blanks contract_type/contract_years for groups.
      flattened.push({
        ...r,
        id: `${r.id}-entry-1`,
        is_group: false,
        _isSiblingRow: true,
        _parentReference: r.reference,
        _entryNumber: 1,
      });

      (r.sibling_entries ?? []).forEach((sibling) => {
        flattened.push({
          ...r,
          id: sibling.id,
          contract_type: sibling.contract_type,
          contract_years: sibling.contract_years,
          status: sibling.status,
          is_group: false,
          _isSiblingRow: true,
          _parentReference: r.reference,
          _entryNumber: sibling.sequence,
        });
      });
    }
  });
  return flattened;
}