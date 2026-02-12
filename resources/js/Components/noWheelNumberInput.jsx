import { useEffect } from "react";

export default function NoWheelNumberInput({ children }) {
  useEffect(() => {
    const onWheel = () => {
      const el = document.activeElement;

      if (
        el instanceof HTMLInputElement &&
        el.type === "number" &&
        !el.disabled &&
        !el.readOnly
      ) {
        el.blur(); // stops scroll increment/decrement
      }
    };

    // capture:true so it works even if nested components stop propagation
    window.addEventListener("wheel", onWheel, { capture: true, passive: true });

    return () => {
      window.removeEventListener("wheel", onWheel, { capture: true });
    };
  }, []);

  return children;
}
