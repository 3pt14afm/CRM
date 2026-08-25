/**
 * Regression tests for the saveDraft() / mergeWithDefaults() bug where
 * entryRemarks.attachments (and any other omitted field) was silently
 * reset to its blank default instead of falling back to current state.
 *
 * Fix: mergeWithDefaults(cloneDefault(), nextRaw) -> mergeWithDefaults(prev, nextRaw)
 *
 * Written for @testing-library/react + Jest/Vitest (act/renderHook API is
 * the same across both). Adjust the import path for ProjectDataProvider /
 * useProjectData if your test setup differs, and swap `vi` for `jest` if
 * you're on Jest rather than Vitest.
 */
import React from "react";
import { renderHook, act } from "@testing-library/react";
import ProjectDataProvider, { useProjectData } from "@/Context/ProjectContext";

const wrapper = ({ children }) => (
  <ProjectDataProvider>{children}</ProjectDataProvider>
);

beforeEach(() => {
  // saveDraft persists to localStorage; keep tests isolated.
  window.localStorage.clear();
});

describe("ProjectContext saveDraft / mergeWithDefaults", () => {
  test("omitting entryRemarks in the updater preserves existing attachments", () => {
    const { result } = renderHook(() => useProjectData(), { wrapper });

    // Seed state with an attachment, the way EntryRemarks.jsx would.
    act(() => {
      result.current.setProjectData((prev) => ({
        ...prev,
        entryRemarks: {
          remarks: "Some remarks",
          attachments: [{ id: "att-1", name: "file.pdf", size: 100 }],
        },
      }));
    });

    expect(result.current.projectData.entryRemarks.attachments).toHaveLength(1);

    // Simulate a saveDraft call whose updater/payload does NOT explicitly
    // carry entryRemarks forward (the exact shape of the original bug).
    act(() => {
      result.current.saveDraft((prev) => ({
        ...prev,
        machineConfiguration: {
          ...prev.machineConfiguration,
          machine: [{ id: "m-1" }],
        },
        // entryRemarks intentionally omitted here
      }));
    });

    expect(result.current.projectData.entryRemarks.attachments).toHaveLength(1);
    expect(result.current.projectData.entryRemarks.attachments[0]).toMatchObject({
      id: "att-1",
      name: "file.pdf",
    });
    expect(result.current.projectData.entryRemarks.remarks).toBe("Some remarks");
  });

  test("explicit empty attachments array in the updater still clears attachments", () => {
    const { result } = renderHook(() => useProjectData(), { wrapper });

    act(() => {
      result.current.setProjectData((prev) => ({
        ...prev,
        entryRemarks: {
          remarks: "Some remarks",
          attachments: [{ id: "att-1", name: "file.pdf", size: 100 }],
        },
      }));
    });

    act(() => {
      result.current.saveDraft((prev) => ({
        ...prev,
        entryRemarks: {
          ...prev.entryRemarks,
          attachments: [], // explicit user-initiated removal
        },
      }));
    });

    expect(result.current.projectData.entryRemarks.attachments).toHaveLength(0);
  });

  test("updater with a populated attachments array replaces cleanly (no merge/dedup artifacts)", () => {
    const { result } = renderHook(() => useProjectData(), { wrapper });

    act(() => {
      result.current.setProjectData((prev) => ({
        ...prev,
        entryRemarks: {
          remarks: "Old remarks",
          attachments: [{ id: "att-1", name: "old.pdf", size: 100 }],
        },
      }));
    });

    act(() => {
      result.current.saveDraft((prev) => ({
        ...prev,
        entryRemarks: {
          remarks: "New remarks",
          attachments: [{ id: "att-2", name: "new.pdf", size: 200 }],
        },
      }));
    });

    const { attachments, remarks } = result.current.projectData.entryRemarks;
    expect(attachments).toHaveLength(1);
    expect(attachments[0].id).toBe("att-2");
    expect(remarks).toBe("New remarks");
  });

  test("resetProject still hard-resets to blank defaults regardless of prior state", () => {
    const { result } = renderHook(() => useProjectData(), { wrapper });

    act(() => {
      result.current.setProjectData((prev) => ({
        ...prev,
        entryRemarks: {
          remarks: "Should be wiped",
          attachments: [{ id: "att-1", name: "file.pdf", size: 100 }],
        },
      }));
    });

    act(() => {
      result.current.resetProject();
    });

    expect(result.current.projectData.entryRemarks.attachments).toEqual([]);
    expect(result.current.projectData.entryRemarks.remarks).toBe("");
  });

  test("saveDraft with a full payload (as buildPayload() produces) round-trips attachments unchanged", () => {
    const { result } = renderHook(() => useProjectData(), { wrapper });

    act(() => {
      result.current.setProjectData((prev) => ({
        ...prev,
        entryRemarks: {
          remarks: "High volume note",
          attachments: [
            {
              id: "att-1",
              original_name: "invoice.pdf",
              stored_name: "stored-invoice.pdf",
              path: "roi/attachments/stored-invoice.pdf",
              size: 12345,
            },
          ],
        },
      }));
    });

    // Mirrors useEntryPayload.js buildPayload(): spreads full projectData,
    // explicitly re-declares entryRemarks from current state.
    act(() => {
      result.current.saveDraft((prev) => ({
        ...prev,
        entryRemarks: {
          remarks: prev?.entryRemarks?.remarks ?? "",
          attachments: Array.isArray(prev?.entryRemarks?.attachments)
            ? prev.entryRemarks.attachments
            : [],
        },
      }));
    });

    expect(result.current.projectData.entryRemarks.attachments).toHaveLength(1);
    expect(result.current.projectData.entryRemarks.attachments[0].id).toBe("att-1");
  });
});