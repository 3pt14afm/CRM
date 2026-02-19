import React, {
  createContext,
  useContext,
  useState,
  useCallback,
} from "react";

const ProjectContext = createContext();
const STORAGE_KEY = "roi_draft";

const defaultInitialState = {
  metadata: { projectId: null, lastSaved: null, version: 1 },
  companyInfo: {
    companyName: "",
    contractYears: 0,
    contractType: "",
    reference: "",
    purpose: "",
  },
  interest: {
    annualInterest: 12,
    percentMargin: 0,
  },
  yield: {
    monoAmvpYields: { monthly: 0, annual: 0 },
    colorAmvpYields: { monthly: 0, annual: 0 },
  },
  machineConfiguration: {
    machine: [],
    consumable: [],
    totals: {
      unitCost: 0,
      qty: 0,
      totalCost: 0,
      yields: 0,
      costCpp: 0,
      sellingPrice: 0,
      totalSell: 0,
      sellCpp: 0,
      totalBundledPrice: 0,
    },
  },
  additionalFees: {
    company: [],
    customer: [],
    total: 0,
  },
  yearlyBreakdown: {},
  totalProjectCost: {
    grandTotalCost: 0,
    grandTotalRevenue: 0,
    grandROI: 0,
    grandROIPercentage: 0,
  },
  contractDetails: {
    machine: [],
    consumable: [],
    totalInitial: 0,
  },
};

// ✅ Fresh copy every time
const cloneDefault = () => {
  if (typeof structuredClone === "function") return structuredClone(defaultInitialState);
  return JSON.parse(JSON.stringify(defaultInitialState));
};

const safeParse = (raw) => {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

const ProjectDataProvider = ({ children }) => {
  const [projectData, setProjectData] = useState(() => {
    if (typeof window === "undefined") return cloneDefault();

    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return cloneDefault();

    const parsed = safeParse(saved);
    return parsed ?? cloneDefault();
  });

  const updateSection = useCallback((section, newData) => {
    setProjectData((prev) => ({
      ...prev,
      [section]: { ...prev[section], ...newData },
    }));
  }, []);

  const setContractDetails = useCallback((details) => {
    setProjectData((prev) => ({
      ...prev,
      contractDetails: {
        ...prev.contractDetails,
        ...details,
      },
    }));
  }, []);

  const setMachineConfig = useCallback((newConfig) => {
    setProjectData((prev) => ({
      ...prev,
      machineConfiguration: {
        ...prev.machineConfiguration,
        ...newConfig,
      },
    }));
  }, []);

  const setYield = useCallback((type, monthly) => {
    setProjectData((prev) => ({
      ...prev,
      yield: {
        ...prev.yield,
        [`${type}AmvpYields`]: {
          monthly,
          annual: monthly * 12,
        },
      },
    }));
  }, []);

  const setAdditionalFees = useCallback((feesObj) => {
    const allRows = [...(feesObj.company || []), ...(feesObj.customer || [])];
    const total = allRows.reduce((sum, row) => sum + (row.total || 0), 0);

    setProjectData((prev) => ({
      ...prev,
      additionalFees: {
        ...feesObj,
        total,
      },
    }));
  }, []);

  const setYearlyData = useCallback((yearNumber, data) => {
    setProjectData((prev) => ({
      ...prev,
      yearlyBreakdown: {
        ...prev.yearlyBreakdown,
        [yearNumber]: data,
      },
    }));
  }, []);

  const syncYearlyBreakdown = useCallback((contractYears, firstYearData, recurringData) => {
    setProjectData((prev) => {
      const newBreakdown = {};
      if (contractYears >= 1) newBreakdown[1] = firstYearData;
      for (let i = 2; i <= contractYears; i++) newBreakdown[i] = recurringData;

      return { ...prev, yearlyBreakdown: newBreakdown };
    });
  }, []);

  // ✅ Manual draft save (updates state + persists SAME object)
  const saveDraft = useCallback((updater) => {
    setProjectData((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;

      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        } catch (e) {
          console.error("Failed to save draft:", e);
        }
      }

      return next;
    });
  }, []);

  const resetProject = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
    setProjectData(cloneDefault());
  }, []);

  return (
    <ProjectContext.Provider
      value={{
        projectData,
        setProjectData,
        updateSection,
        setMachineConfig,
        setYield,
        setAdditionalFees,
        setYearlyData,
        syncYearlyBreakdown,
        setContractDetails,
        saveDraft,     // ✅ add this
        resetProject,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProjectData = () => {
  const context = useContext(ProjectContext);
  if (!context) throw new Error("useProjectData must be used within a ProjectDataProvider");
  return context;
};

export default ProjectDataProvider;
