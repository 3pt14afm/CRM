import React, { createContext, useContext, useState, useCallback } from 'react';

const ProjectContext = createContext();

export const ProjectDataProvider = ({ children }) => {
    const [projectData, setProjectData] = useState({
        // --- NEW METADATA SECTION ---
        metadata: {
            projectId: null,
            lastSaved: null, 
            version: 1
        },
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
        machineConfiguration: [], 
                    
            additionalFees: {
                machine: [],      // Rows where checkbox is checked
                consumable: [],   // Rows where checkbox is unchecked
                grandTotal: 0
            },
        totalProjectCost: {
            grandTotalCost: 0,
            grandTotalSelling: 0,
            overallMargin: 0
        }
    });

    const updateSection = useCallback((section, newData) => {
        setProjectData(prev => ({
            ...prev,
            [section]: { ...prev[section], ...newData }
        }));
    }, []);

    const setMachineConfig = useCallback((newList) => {
        setProjectData(prev => ({
            ...prev,
            machineConfiguration: newList
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