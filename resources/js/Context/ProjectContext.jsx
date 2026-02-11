import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const ProjectContext = createContext();

const STORAGE_KEY = 'roi_draft';

// Define the default state outside to keep the component clean
const defaultInitialState = {
    metadata: { projectId: null, lastSaved: null, version: 1 },
    companyInfo: {
        companyName: '',
        contractYears: 0,
        contractType: '',
        reference: '',
        purpose: ''
    },
    interest: {
        annualInterest: 0,
        percentMargin: 0,
    },
    yield: {
        monoAmvpYields: { monthly: 0, annual: 0 },
        colorAmvpYields: { monthly: 0, annual: 0 }
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
        }
    },
    additionalFees: {
        company: [],
        customer: [],
        total: 0,
    },
    yearlyBreakdown: {
        // years will look like: "1": { totalCost: 0, totalSell: 0, profit: 0 },
    },
    totalProjectCost: {
        grandTotalCost: 0,
        grandTotalSelling: 0,
        overallMargin: 0
    }
};

const ProjectDataProvider = ({ children }) => {
    // 1. Initialize state from Local Storage or default
    const [projectData, setProjectData] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : defaultInitialState;
        }
        return defaultInitialState;
    });

    // 2. Automatically save to Local Storage whenever projectData changes
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(projectData));
    }, [projectData]);

    // GENERIC UPDATE: For simple sections like companyInfo
    const updateSection = useCallback((section, newData) => {
        setProjectData(prev => ({
            ...prev,
            [section]: { ...prev[section], ...newData }
        }));
    }, []);

    // SPECIFIC UPDATE: For machine configuration
    const setMachineConfig = useCallback((newConfig) => {
        setProjectData(prev => ({
            ...prev,
            machineConfiguration: {
                ...prev.machineConfiguration,
                ...newConfig
            }
        }));
    }, []);

    // SPECIFIC UPDATE: For yields
    const setYield = useCallback((type, monthly) => {
        setProjectData(prev => ({
            ...prev,
            yield: {
                ...prev.yield,
                [`${type}AmvpYields`]: { 
                    monthly, 
                    annual: monthly * 12 
                }
            }
        }));
    }, []);

    // SPECIFIC UPDATE: For additional fees with live total
    const setAdditionalFees = useCallback((feesObj) => {
        const allRows = [...(feesObj.company || []), ...(feesObj.customer || [])];
        const total = allRows.reduce((sum, row) => sum + (row.total || 0), 0);

        setProjectData(prev => ({
            ...prev,
            additionalFees: {
                ...feesObj,
                total
            }
        }));
    }, []);

    // SPECIFIC UPDATE: Save data for a specific year (1, 2, 3...)
    const setYearlyData = useCallback((yearNumber, data) => {
        setProjectData(prev => ({
            ...prev,
            yearlyBreakdown: {
                ...prev.yearlyBreakdown,
                [yearNumber]: data
            }
        }));
    }, []);

    // NEW: Function to clear everything (useful for the "Clear All" button)
    const resetProject = useCallback(() => {
        setProjectData(defaultInitialState);
        localStorage.removeItem(STORAGE_KEY);
    }, []);

    return (
        <ProjectContext.Provider value={{
            projectData,
            setProjectData,
            updateSection,
            setMachineConfig,
            setYield,
            setAdditionalFees,
            resetProject, // Exported for the Clear All button
            setYearlyData
        }}>
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