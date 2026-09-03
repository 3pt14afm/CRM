import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";
import { ProjectContext } from "@/Context/ProjectContext";

const GroupContext = createContext();
const GROUP_STORAGE_KEY = "roi_group_draft";

const defaultEntryState = () => ({
  projectUid: "",
  companyInfo: {
    contractYears: 0,
    contractType: "",
    purpose: "",
    bundledStdInk: false,
  },
  interest: { annualInterest: 0, percentMargin: 0 },
  yield: {
    monoAmvpYields: { monthly: 0, annual: 0 },
    colorAmvpYields: { monthly: 0, annual: 0 },
  },
  entryRemarks: { remarks: "", attachments: [] },
  machineConfiguration: {
    machine: [],
    consumable: [],
    totals: {
      unitCost: 0, qty: 0, totalCost: 0, yields: 0, costCpp: 0,
      sellingPrice: 0, totalSell: 0, sellCpp: 0, totalBundledPrice: 0,
    },
  },
  additionalFees: { company: [], customer: [], total: 0 },
  yearlyBreakdown: {},
  totalProjectCost: {
    grandTotalCost: 0, grandTotalRevenue: 0, grandROI: 0, grandROIPercentage: 0,
  },
  contractDetails: { machine: [], consumable: [], totalInitial: 0 },
});

const defaultGroupState = () => ({
  metadata: { reference: null, lastSaved: null, status: "draft" },
  companyInfo: { companyName: "", companySapCode: "", type: 0 },
  entries: [defaultEntryState()],
});

const cloneDefault = (fn) =>
  typeof structuredClone === "function" ? structuredClone(fn()) : JSON.parse(JSON.stringify(fn()));

const safeParse = (raw) => {
  try { return JSON.parse(raw); } catch { return null; }
};

const GroupProjectProvider = ({ children }) => {
  const [groupData, setGroupData] = useState(() => {
    if (typeof window === "undefined") return cloneDefault(defaultGroupState);
    const saved = localStorage.getItem(GROUP_STORAGE_KEY);
    const parsed = saved ? safeParse(saved) : null;
    return parsed ?? cloneDefault(defaultGroupState);
  });

  const [activeEntryIndex, setActiveEntryIndex] = useState(0);

  const machineConfigGetters = useRef({});

  const registerMachineConfigGetter = useCallback((fn) => {
    machineConfigGetters.current[activeEntryIndex] = fn;
  }, [activeEntryIndex]);

  const getCurrentMachineConfig = useCallback(() => {
    const getter = machineConfigGetters.current[activeEntryIndex];
    return getter ? getter() : null;
  }, [activeEntryIndex]);

  const flushActiveMachineConfig = useCallback(() => {
    const getter = machineConfigGetters.current[activeEntryIndex];
    const latest = getter ? getter() : null;
    if (!latest) return;

    setGroupData((prev) => {
      const entries = [...prev.entries];
      entries[activeEntryIndex] = {
        ...entries[activeEntryIndex],
        machineConfiguration: {
          ...entries[activeEntryIndex].machineConfiguration,
          ...latest,
        },
      };
      return { ...prev, entries };
    });
  }, [activeEntryIndex]);

  const switchActiveEntry = useCallback((index) => {
    flushActiveMachineConfig();
    setActiveEntryIndex(index);
  }, [flushActiveMachineConfig]);

  const addEntry = useCallback(() => {
    flushActiveMachineConfig();
    setGroupData((prev) => {
      const entries = [...prev.entries, cloneDefault(defaultEntryState)];
      setActiveEntryIndex(entries.length - 1);
      return { ...prev, entries };
    });
  }, [flushActiveMachineConfig]);

  const removeEntry = useCallback((index) => {
    setGroupData((prev) => {
      if (prev.entries.length <= 1) return prev;
      return { ...prev, entries: prev.entries.filter((_, i) => i !== index) };
    });
    setActiveEntryIndex((prev) => {
      if (index < prev) return prev - 1;
      if (index === prev) return Math.max(0, prev - 1);
      return prev;
    });
  }, []);

  const updateSharedCompanyInfo = useCallback((newData) => {
    setGroupData((prev) => ({
      ...prev,
      companyInfo: { ...prev.companyInfo, ...newData },
    }));
  }, []);

  const saveGroupDraft = useCallback((updater) => {
    setGroupData((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      if (typeof window !== "undefined") {
        try { localStorage.setItem(GROUP_STORAGE_KEY, JSON.stringify(next)); }
        catch (e) { console.error("Failed to save group draft:", e); }
      }
      return next;
    });
  }, []);

  const resetGroup = useCallback(() => {
    if (typeof window !== "undefined") localStorage.removeItem(GROUP_STORAGE_KEY);
    setGroupData(cloneDefault(defaultGroupState));
    setActiveEntryIndex(0);
  }, []);

  // Loads a group hydrated from a saved server record (useGroupEntryHydration
  // builds groupDataShape via mapEntryProjectToContext per row). Distinct from
  // resetGroup(), which blanks to a fresh single-entry draft.
  const hydrateGroup = useCallback((groupDataShape, initialActiveEntryIndex = 0, persist = true) => {
    setGroupData(groupDataShape);
    const entryCount = groupDataShape?.entries?.length ?? 1;
    const clampedIndex = Math.min(Math.max(initialActiveEntryIndex, 0), entryCount - 1);
    setActiveEntryIndex(clampedIndex);
    if (persist && typeof window !== "undefined") {
      try { localStorage.setItem(GROUP_STORAGE_KEY, JSON.stringify(groupDataShape)); }
      catch (e) { console.error("Failed to persist hydrated group:", e); }
    }
  }, []);

  const activeEntry = groupData.entries[activeEntryIndex] ?? defaultEntryState();

  const bridgedProjectData = useMemo(() => ({
    ...activeEntry,
    metadata: { ...activeEntry.metadata, ...groupData.metadata },
    companyInfo: {
      ...activeEntry.companyInfo,
      companyName: groupData.companyInfo.companyName,
      companySapCode: groupData.companyInfo.companySapCode,
      type: groupData.companyInfo.type,
      reference: groupData.metadata.reference,
      projectUid: activeEntry.projectUid,
    },
  }), [activeEntry, groupData.metadata, groupData.companyInfo]);

  const updateActiveEntry = useCallback((patchFn) => {
    setGroupData((prev) => {
      const entries = [...prev.entries];
      entries[activeEntryIndex] = patchFn(entries[activeEntryIndex]);
      return { ...prev, entries };
    });
  }, [activeEntryIndex]);

  const bridgedSetProjectData = useCallback((updater) => {
    updateActiveEntry(typeof updater === "function" ? (entry) => updater(entry) : () => updater);
  }, [updateActiveEntry]);

  const bridgedUpdateSection = useCallback((section, newData) => {
    if (section === "companyInfo") {
      const { companyName, companySapCode, type, reference, projectUid, ...entryFields } = newData;

      // Forward shared fields to group-level state
      const sharedPatch = {};
      if (companyName !== undefined) sharedPatch.companyName = companyName;
      if (companySapCode !== undefined) sharedPatch.companySapCode = companySapCode;
      if (type !== undefined) sharedPatch.type = type;
      if (Object.keys(sharedPatch).length > 0) {
        updateSharedCompanyInfo(sharedPatch);
      }

      updateActiveEntry((entry) => ({
        ...entry,
        companyInfo: { ...entry.companyInfo, ...entryFields },
      }));
      return;
    }
    updateActiveEntry((entry) => ({ ...entry, [section]: { ...entry[section], ...newData } }));
  }, [updateActiveEntry, updateSharedCompanyInfo]);

  const bridgedSetMachineConfig = useCallback((newConfig) => {
    updateActiveEntry((entry) => ({
      ...entry,
      machineConfiguration: { ...entry.machineConfiguration, ...newConfig },
    }));
  }, [updateActiveEntry]);

  const bridgedSetYield = useCallback((type, monthly) => {
    updateActiveEntry((entry) => ({
      ...entry,
      yield: {
        ...entry.yield,
        [`${type}AmvpYields`]: { monthly, annual: monthly * 12 },
      },
    }));
  }, [updateActiveEntry]);

  const bridgedSetAdditionalFees = useCallback((feesObj) => {
    const allRows = [...(feesObj.company || []), ...(feesObj.customer || [])];
    const total = allRows.reduce((sum, row) => sum + (row.total || 0), 0);
    updateActiveEntry((entry) => ({ ...entry, additionalFees: { ...feesObj, total } }));
  }, [updateActiveEntry]);

  const bridgedSetYearlyData = useCallback((yearNumber, data) => {
    updateActiveEntry((entry) => ({
      ...entry,
      yearlyBreakdown: { ...entry.yearlyBreakdown, [yearNumber]: data },
    }));
  }, [updateActiveEntry]);

  const bridgedSyncYearlyBreakdown = useCallback((contractYears, firstYearData, recurringData) => {
    updateActiveEntry((entry) => {
      const newBreakdown = {};
      if (contractYears >= 1) newBreakdown[1] = firstYearData;
      for (let i = 2; i <= contractYears; i++) newBreakdown[i] = recurringData;
      return { ...entry, yearlyBreakdown: newBreakdown };
    });
  }, [updateActiveEntry]);

  const bridgedSetContractDetails = useCallback((details) => {
    updateActiveEntry((entry) => ({
      ...entry,
      contractDetails: { ...entry.contractDetails, ...details },
    }));
  }, [updateActiveEntry]);

  const bridgedSaveDraft = useCallback((updater) => {
    updateActiveEntry((entry) => (typeof updater === "function" ? updater(entry) : updater));
  }, [updateActiveEntry]);

  const bridgedResetProject = useCallback(() => {
    updateActiveEntry(() => cloneDefault(defaultEntryState));
  }, [updateActiveEntry]);

  const bridgedValue = useMemo(() => ({
    projectData: bridgedProjectData,
    setProjectData: bridgedSetProjectData,
    updateSection: bridgedUpdateSection,
    setMachineConfig: bridgedSetMachineConfig,
    setYield: bridgedSetYield,
    setAdditionalFees: bridgedSetAdditionalFees,
    setYearlyData: bridgedSetYearlyData,
    syncYearlyBreakdown: bridgedSyncYearlyBreakdown,
    setContractDetails: bridgedSetContractDetails,
    saveDraft: bridgedSaveDraft,
    resetProject: bridgedResetProject,
    registerMachineConfigGetter,
    getCurrentMachineConfig,
  }), [
    bridgedProjectData, bridgedSetProjectData, bridgedUpdateSection,
    bridgedSetMachineConfig, bridgedSetYield, bridgedSetAdditionalFees,
    bridgedSetYearlyData, bridgedSyncYearlyBreakdown, bridgedSetContractDetails,
    bridgedSaveDraft, bridgedResetProject, registerMachineConfigGetter,
    getCurrentMachineConfig,
  ]);

  return (
    <GroupContext.Provider
      value={{
        groupData,
        activeEntryIndex,
        switchActiveEntry,
        addEntry,
        removeEntry,
        updateSharedCompanyInfo,
        saveGroupDraft,
        resetGroup,
        hydrateGroup,
        flushActiveMachineConfig,
      }}
    >
      <ProjectContext.Provider value={bridgedValue}>
        {children}
      </ProjectContext.Provider>
    </GroupContext.Provider>
  );
};

export const useGroupProjectData = () => {
  const context = useContext(GroupContext);
  if (!context) throw new Error("useGroupProjectData must be used within a GroupProjectProvider");
  return context;
};

export default GroupProjectProvider;