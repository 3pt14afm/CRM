import { useProjectData } from "@/Context/ProjectContext";
import { get1YrPotential } from "@/utils/calculations/freeuse/get1YrPotential";
import { succeedingYears } from "@/utils/calculations/freeuse/succeedingYears";
import React, { useEffect } from "react";

function CompanyInfo() {
  const { projectData, setProjectData, syncYearlyBreakdown } = useProjectData();


    useEffect(() => {
        const contractYears = Number(projectData?.companyInfo?.contractYears) || 0;

        if (contractYears > 0) {
            const data1stYear = get1YrPotential(projectData);
            const dataSucceeding = succeedingYears(projectData);

            // Sync everything in one state update
            syncYearlyBreakdown(contractYears, data1stYear, dataSucceeding);
        } else {
            // If years is 0, clear the breakdown
            syncYearlyBreakdown(0, null, null);
        }
        
        // Watch specific triggers to avoid infinite loops
    }, [
        projectData.companyInfo.contractYears, 
        projectData.machineConfiguration, 
        projectData.additionalFees,
        syncYearlyBreakdown
    ]);

    
  const handleChange = (field, value) => {
    setProjectData((prev) => ({
      ...prev,
      companyInfo: {
        ...prev.companyInfo,
        [field]: value,
      },
    }));
    console.log(projectData);
  };

  return (
    <div className="flex flex-col bg-lightgreen/5 shadow-md border border-slate-300 rounded-md p-8 gap-1 w-[60%]">
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-1 w-[70%]">
          <p className="font-bold text-[11px] uppercase">
            Company Name
          </p>
          <input
            className="rounded-sm border px-2 text-sm outline-none focus:outline-none focus:ring-0 focus:border-[#289800] border-darkgreen/10 h-10"
            type="text"
            value={projectData.companyInfo.companyName}
            onChange={(e) => handleChange("companyName", e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1">
          <p className="font-bold text-[11px] uppercase">
            Contract Years
          </p>

          <input
            type="number"
            placeholder="0"
            value={
              projectData?.companyInfo?.contractYears === 0
                ? ""
                : projectData?.companyInfo?.contractYears ?? ""
            }
            onChange={(e) => {
              const v = e.target.value; // string
              // store "" when empty so placeholder shows
              handleChange("contractYears", v === "" ? "" : Number(v));
            }}
            className="rounded-sm border px-2 text-sm border-darkgreen/10 h-10 w-32 outline-none focus:outline-none focus:ring-0 focus:border-[#289800] bg-green-50/30 text-center
              [appearance:textfield]
              [&::-webkit-outer-spin-button]:appearance-none
              [&::-webkit-inner-spin-button]:appearance-none"
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-col mt-2 gap-1 w-[70%]">
          <p className="font-bold text-[11px] uppercase ">
            Contract Type
          </p>
          <select
            className={`rounded-sm border px-2 text-sm border-darkgreen/10 h-10 outline-none focus:outline-none focus:ring-0 focus:border-[#289800] bg-white ${!projectData.companyInfo.contractType ? "text-slate-400" : "text-black"}`}
            value={projectData.companyInfo.contractType}
            onChange={(e) => handleChange("contractType", e.target.value)}
          >
            <option value="" disabled>
              Select contract type
            </option>
            <option className="text-black" value="Free Use">Free Use</option>
            <option className="text-black" value="Rental + Click">Rental + Click</option>
            <option className="text-black" value="Fix Click">Fix Click</option>
            <option className="text-black" value="Monthly Rental">Monthly Rental</option>
          </select>
        </div>

        <div className="flex flex-col">
          <p className="font-bold text-[11px] uppercase ">
            Purpose
          </p>
          <input
            className="rounded-sm border px-2 text-sm capitalize border-darkgreen/10 h-10 outline-none focus:outline-none focus:ring-0 focus:border-[#289800]"
            type="text"
            value={projectData.companyInfo.purpose}
            onChange={(e) => handleChange("purpose", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

export default CompanyInfo;
