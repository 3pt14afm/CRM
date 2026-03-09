import { useEffect, useState } from "react";

export default function useDepartments() {
  const [departments, setDepartments] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);

  useEffect(() => {
    setLoadingDepartments(true);

    fetch(route("admin.directory.departments"), {
      headers: { Accept: "application/json" },
      credentials: "same-origin",
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to load departments");
        return r.json();
      })
      .then((data) => setDepartments(Array.isArray(data) ? data : []))
      .catch(() => setDepartments([]))
      .finally(() => setLoadingDepartments(false));
  }, []);

  return { departments, loadingDepartments };
}