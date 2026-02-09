import React, { createContext, useContext, useState, useCallback } from 'react';

const ProjectContext = createContext();

const ProjectDataProvider = ({ children }) => {
    const [projectData, setProjectData] = useState({
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
                sellCpp: 0
            }
        },
        additionalFees: {
            company: [],
            customer: [],
            total: 0, // ✅ Store total for live display
        },
        totalProjectCost: {
            grandTotalCost: 0,
            grandTotalSelling: 0,
            overallMargin: 0
        }
    });

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
                ...newConfig // merges {machine, consumable, totals}
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

    return (
        <ProjectContext.Provider value={{
            projectData,
            setProjectData,
            updateSection,
            setMachineConfig,
            setYield,
            setAdditionalFees
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

export default ProjectDataProvider; // ✅ default export
