// resources/js/Context/SprfProjectContext.jsx
import React, { createContext, useCallback, useContext, useState } from "react";

const SprfProjectContext = createContext();
const STORAGE_KEY = "sprf_draft";

const defaultInitialState = {
  metadata: {
    projectId: null,
    lastSaved: null,
    version: 1,
    status: "draft",
  },

  companyInfo: {
    subCategory: "",
    account: "",
    accountManager: "",
  },

  itemContents: [
    // {
    //   id: crypto.randomUUID?.() ?? String(Date.now()),
    //   itemLot: 1,
    //   productCode: "",
    //   itemDescription: "",
    //   qty: 0,
    //   disty: "",
    //   costPerUnit: 0,
    //   totalCost: 0,
    //   sellingPricePerUnitVatInc: 0,
    //   totalSellingPriceVatInc: 0,
    //   markupValue: 0,
    //   markupPercent: 0,
    // }
  ],

  otherExpenses: [
    // {
    //   id: crypto.randomUUID?.() ?? String(Date.now()),
    //   itemNo: 1,
    //   productCode: "",
    //   itemDescription: "",
    //   qty: 0,
    //   unitPrice: 0,
    //   total: 0,
    // }
  ],

  totals: {
    totalItemCost: 0,
    totalItemSellingVatInc: 0,
    totalMarkupValue: 0,
    totalOtherExpenses: 0,
    grandTotal: 0,
  },
};

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

const mergeWithDefaults = (base, incoming) => {
  if (Array.isArray(base)) return Array.isArray(incoming) ? incoming : base;

  if (base && typeof base === "object") {
    const result = { ...base };
    const source = incoming && typeof incoming === "object" ? incoming : {};

    for (const key of Object.keys(base)) {
      result[key] = mergeWithDefaults(base[key], source[key]);
    }

    for (const key of Object.keys(source)) {
      if (!(key in result)) result[key] = source[key];
    }

    return result;
  }

  return incoming === undefined ? base : incoming;
};

const recalcItemRow = (row) => {
  const qty = Number(row.qty ?? 0);
  const costPerUnit = Number(row.costPerUnit ?? 0);
  // Markup % is user-entered (edited directly in SprfItemsTable) and drives
  // selling price — it must NOT be derived/overwritten here. Mirrors
  // computeItem() in utils/sprf/calculations.js.
  const markupPercent = Number(row.markupPercent ?? 0);

  const totalCost = qty * costPerUnit;
  const sellingPricePerUnitVatInc = costPerUnit * (1 + markupPercent / 100);
  const totalSellingPriceVatInc = qty * sellingPricePerUnitVatInc;
  const markupValue = totalSellingPriceVatInc - totalCost;

  return {
    ...row,
    totalCost,
    sellingPricePerUnitVatInc,
    totalSellingPriceVatInc,
    markupValue,
    markupPercent: row.markupPercent,
  };
};

const recalcOtherExpenseRow = (row) => {
  const qty = Number(row.qty ?? 0);
  const unitPrice = Number(row.unitPrice ?? 0);

  return {
    ...row,
    total: qty * unitPrice,
  };
};

const recalcTotals = (state) => {
  const totalItemCost = state.itemContents.reduce((sum, row) => sum + Number(row.totalCost ?? 0), 0);
  const totalItemSellingVatInc = state.itemContents.reduce((sum, row) => sum + Number(row.totalSellingPriceVatInc ?? 0), 0);
  const totalMarkupValue = state.itemContents.reduce((sum, row) => sum + Number(row.markupValue ?? 0), 0);
  const totalOtherExpenses = state.otherExpenses.reduce((sum, row) => sum + Number(row.total ?? 0), 0);

  return {
    ...state,
    totals: {
      totalItemCost,
      totalItemSellingVatInc,
      totalMarkupValue,
      totalOtherExpenses,
      grandTotal: totalItemSellingVatInc + totalOtherExpenses,
    },
  };
};

export const SprfProjectDataProvider = ({ children }) => {
  const [projectData, setProjectData] = useState(() => {
    if (typeof window === "undefined") return cloneDefault();

    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return cloneDefault();

    const parsed = safeParse(saved);
    if (!parsed) return cloneDefault();

    return mergeWithDefaults(cloneDefault(), parsed);
  });

  const updateCompanyInfo = useCallback((newData) => {
    setProjectData((prev) =>
      recalcTotals({
        ...prev,
        companyInfo: { ...prev.companyInfo, ...newData },
      })
    );
  }, []);

  const setItemContents = useCallback((rows) => {
    setProjectData((prev) =>
      recalcTotals({
        ...prev,
        itemContents: rows.map(recalcItemRow),
      })
    );
  }, []);

  const setOtherExpenses = useCallback((rows) => {
    setProjectData((prev) =>
      recalcTotals({
        ...prev,
        otherExpenses: rows.map(recalcOtherExpenseRow),
      })
    );
  }, []);

  const saveDraft = useCallback((updater) => {
    setProjectData((prev) => {
      const nextRaw = typeof updater === "function" ? updater(prev) : updater;
      const next = recalcTotals(mergeWithDefaults(cloneDefault(), nextRaw));

      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
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
    <SprfProjectContext.Provider
      value={{
        projectData,
        setProjectData,
        updateCompanyInfo,
        setItemContents,
        setOtherExpenses,
        saveDraft,
        resetProject,
      }}
    >
      {children}
    </SprfProjectContext.Provider>
  );
};

export const useSprfProjectData = () => {
  const context = useContext(SprfProjectContext);
  if (!context) {
    throw new Error("useSprfProjectData must be used within a SprfProjectDataProvider");
  }
  return context;
};