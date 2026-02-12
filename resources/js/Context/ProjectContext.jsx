import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const ProjectContext = createContext();

const STORAGE_KEY = 'roi_draft';

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
    yearlyBreakdown: {},
    totalProjectCost: {
        grandTotalCost: 0,
        grandTotalSelling: 0,
        overallMargin: 0
    },
    // Ensure this is structured correctly in the state
    contractDetails: {
        machine: [],
        consumable: [],
        totalInitial: 0
    }
};

const ProjectDataProvider = ({ children }) => {
    const [projectData, setProjectData] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : defaultInitialState;
        }
        return defaultInitialState;
    });

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(projectData));
    }, [projectData]);

    const updateSection = useCallback((section, newData) => {
        setProjectData(prev => ({
            ...prev,
            [section]: { ...prev[section], ...newData }
        }));
    }, []);

    // NEW SPECIFIC UPDATE: For contract details
    const setContractDetails = useCallback((details) => {
        setProjectData(prev => ({
            ...prev,
            contractDetails: {
                ...prev.contractDetails,
                ...details
            }
        }));
    }, []);

    const setMachineConfig = useCallback((newConfig) => {
        setProjectData(prev => ({
            ...prev,
            machineConfiguration: {
                ...prev.machineConfiguration,
                ...newConfig
            }
        }));
    }, []);

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

    const setYearlyData = useCallback((yearNumber, data) => {
        setProjectData(prev => ({
            ...prev,
            yearlyBreakdown: {
                ...prev.yearlyBreakdown,
                [yearNumber]: data
            }
        }));
    }, []);

    const syncYearlyBreakdown = useCallback((contractYears, firstYearData, recurringData) => {
        setProjectData(prev => {
            const newBreakdown = {};
            if (contractYears >= 1) newBreakdown[1] = firstYearData;
            for (let i = 2; i <= contractYears; i++) {
                newBreakdown[i] = recurringData;
            }
            return {
                ...prev,
                yearlyBreakdown: newBreakdown
            };
        });
    }, []);

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
            resetProject,
            setYearlyData,
            syncYearlyBreakdown,
            setContractDetails // Added to provider
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