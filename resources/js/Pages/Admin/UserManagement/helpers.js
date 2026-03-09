export const isUserActive = (u) => {
  if (typeof u?.is_banned === "boolean") return u.is_banned === false;
  if (typeof u?.status === "string") return u.status === "Active";
  return true;
};

export const getPrimaryLocationId = (u) => {
  const id = u?.primary_location_id ?? u?.primaryLocationId ?? null;
  return id == null ? null : Number(id);
};

export const ensurePrimaryInLocations = (locIds, primaryId) => {
  const set = new Set((Array.isArray(locIds) ? locIds : []).map((x) => Number(x)));
  if (primaryId) set.add(Number(primaryId));
  return Array.from(set);
};

export const buildLocationNameMap = (locationLookup) => {
  const map = new Map();
  const rows = Array.isArray(locationLookup) ? locationLookup : [];
  rows.forEach((l) => map.set(Number(l.id), l.name));
  return map;
};

export const formatShortDate = (date = new Date()) =>
  new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
}).format(date);

export function buildEditFormFromUser(user) {
  return {
    first_name: user?.first_name ?? "",
    last_name: user?.last_name ?? "",
    employee_id: user?.employee_id ?? "",
    email: user?.email ?? "",
    department_id: user?.department_id ?? "",
    department: user?.department ?? "",
    position: user?.position ?? "",
    primary_location_id: user?.primary_location_id ?? "",
    password: "",
    is_banned: Boolean(user?.is_banned),
  };
}

export const getNextLocationSelection = (currentLocations, targetId, primaryId) => {
  const n = Number(targetId);

  if (primaryId && Number(primaryId) === n) {
    return (currentLocations ?? []).map(Number);
  }

  const current = (currentLocations ?? []).map((x) => Number(x));
  const has = current.includes(n);
  const next = has ? current.filter((x) => x !== n) : [...current, n];

  return ensurePrimaryInLocations(next, primaryId);
};