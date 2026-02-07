import React, { createContext, useContext, useState, useCallback } from 'react';

const ProjectContext = createContext();

export const ProjectDataProvider = ({ children }) => {
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
            monthlyInterest: 0,
            monthlyMarginForContract: 0,
            annualMargin: 0,
            monoAmvpYields: { monthly: 0, annual: 0 },
            colorAmvpYields: { monthly: 0, annual: 0 }
        },
        machineConfiguration: {
              machine: [],
              consumable: [],
              totals: {
                  totalUnitCost: 0, 
                  totalQty: 0,
                  totalCost: 0,
                  totalYields: 0,
                  totalCostCpp: 0,
                  totalSellingPrice: 0,
                  totalSell: 0,
                  totalSellCpp: 0
              }
        }, 
        additionalFees: {
            machine: [],
            consumable: [],
            grandTotal: 0
        },
        totalProjectCost: {
            grandTotalCost: 0,
            grandTotalSelling: 0,
            overallMargin: 0
        }
    });

    // GENERIC UPDATE: Use for simple sections like companyInfo
    const updateSection = useCallback((section, newData) => {
        setProjectData(prev => ({
            ...prev,
            [section]: { ...prev[section], ...newData }
        }));
    }, []);

    // SPECIFIC UPDATE: Prevents overwriting the machineConfiguration object structure
    const setMachineConfig = useCallback((newConfig) => {
        setProjectData(prev => ({
            ...prev,
            machineConfiguration: {
                ...prev.machineConfiguration,
                ...newConfig // This safely merges {machine, consumable, totals}
            }
        }));
    }, []);

    return (
        <ProjectContext.Provider value={{ projectData, setProjectData, updateSection, setMachineConfig }}>
            {children}
        </ProjectContext.Provider>
    );
};

export const useProjectData = () => {
    const context = useContext(ProjectContext);
    if (!context) throw new Error("useProjectData must be used within a ProjectDataProvider");
    return context;
};