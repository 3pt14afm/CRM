import { useEffect, useState } from "react";

export default function usePositions() {
  const [positions, setPositions] = useState([]);
  const [loadingPositions, setLoadingPositions] = useState(true);

  useEffect(() => {
    setLoadingPositions(true);

    fetch(route("admin.directory.positions"), {
      headers: { Accept: "application/json" },
      credentials: "same-origin",
    })
      .then(async (r) => {
        if (!r.ok) throw new Error("Failed to load positions");
        return r.json();
      })
      .then((data) => setPositions(Array.isArray(data) ? data : []))
      .catch(() => setPositions([]))
      .finally(() => setLoadingPositions(false));
  }, []);

  return { positions, loadingPositions };
}