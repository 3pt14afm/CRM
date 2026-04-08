import { useProjectData } from "@/Context/ProjectContext";
import { get1YrPotential } from "@/utils/calculations/freeuse/get1YrPotential";
import { succeedingYears } from "@/utils/calculations/freeuse/succeedingYears";
import React, { useEffect } from "react";

function CompanyInfo({ readOnly, showErrors = false }) {
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
  }, [
    projectData.companyInfo.contractYears,
    projectData.machineConfiguration,
    projectData.additionalFees,
    syncYearlyBreakdown,
  ]);

  const handleChange = (field, value) => {
    setProjectData((prev) => ({
      ...prev,
      companyInfo: {
        ...prev.companyInfo,
        [field]: value,
      },
    }));
  };

  // ✅ Required fields logic
  const companyNameVal = String(projectData?.companyInfo?.companyName ?? "").trim();
  const contractTypeVal = String(projectData?.companyInfo?.contractType ?? "").trim();

  const yearsRaw = projectData?.companyInfo?.contractYears;
  const yearsNum =
    yearsRaw === "" || yearsRaw === null || yearsRaw === undefined
      ? NaN
      : Number(yearsRaw);

  const companyNameInvalid = companyNameVal.length === 0;
  const contractTypeInvalid = contractTypeVal.length === 0;
  const contractYearsInvalid = !(Number.isFinite(yearsNum) && yearsNum > 0);

  const showCompanyNameError = !readOnly && showErrors && companyNameInvalid;
  const showContractYearsError = !readOnly && showErrors && contractYearsInvalid;
  const showContractTypeError = !readOnly && showErrors && contractTypeInvalid;

  const baseInput =
    "rounded-xl border px-2 text-sm outline-none focus:outline-none focus:ring-0 h-10";
  const okBorder = "border-darkgreen/10 focus:border-[#289800]";
  const errBorder = "border-red-500 focus:border-red-500";

  return (
    <div className="flex flex-col bg-[#FBFFFA] shadow border border-[#2c2c2e]/10 border-b-[#2c2c2e]/20 rounded-xl p-8 gap-1 w-full lg:w-[60%] min-w-96">
      <div className="flex justify-between items-center">
        <div className="flex flex-col gap-1 w-[70%]">
          <p className="font-bold text-[11px] uppercase">Company Name</p>
          <input
            className={`${baseInput} ${showCompanyNameError ? errBorder : okBorder}`}
            type="text"
            value={projectData?.companyInfo?.companyName ?? ""}
            onChange={(e) => handleChange("companyName", e.target.value)}
            disabled={readOnly}
          />
        </div>

        <div className="flex flex-col gap-1">
          <p className="font-bold text-[11px] uppercase">Contract Years</p>

          <input
            type="number"
            placeholder="0"
            disabled={readOnly}
            value={
              projectData?.companyInfo?.contractYears === 0
                ? ""
                : projectData?.companyInfo?.contractYears ?? ""
            }
            onChange={(e) => {
              const v = e.target.value;
              handleChange("contractYears", v === "" ? "" : Number(v));
            }}
            className={`${baseInput} md:w-24 xl:w-32 bg-green-50/30 text-center border
              [appearance:textfield]
              [&::-webkit-outer-spin-button]:appearance-none
              [&::-webkit-inner-spin-button]:appearance-none
              ${showContractYearsError ? "border-red-500 focus:border-red-500" : "border-darkgreen/10 focus:border-[#289800]"}
            `}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-col mt-2 gap-1">
          <p className="font-bold text-[11px] uppercase ">Contract Type</p>

          <div className="flex justify-between items-start">
            <div className="w-[70%]">
              <select
                className={`w-full rounded-xl border px-2 text-sm h-10 outline-none focus:outline-none focus:ring-0 bg-white ${
                  !projectData?.companyInfo?.contractType ? "text-slate-400" : "text-black"
                } ${showContractTypeError ? "border-red-500 focus:border-red-500 bg-red-50" : "border-darkgreen/10 focus:border-[#289800]"}`}
                disabled={readOnly}
                value={projectData?.companyInfo?.contractType ?? ""}
                onChange={(e) => {
                  const nextType = e.target.value;
                  handleChange("contractType", nextType);

                  if (nextType !== "Rental + Supplies") {
                    handleChange("bundledStdInk", false);
                  }
                }}
              >
                <option value="" disabled>
                  Select contract type
                </option>
                <option value="Free Use + per Cartridge">Free Use + per Cartridge</option>
                <option value="Rental + Click Charge">Rental + Click Charge</option>
                <option value="Free Use + Click Charge">Free Use + Click Charge</option>
                <option value="Rental + per Cartridge">Rental + per Cartridge</option>
                <option value="Fixed Monthly Only">Fixed Monthly Only</option>
                <option value="Outright + Click Charge">Outright + Click Charge</option>
                <option value=" Outright + per Cartridge">Outright + per Cartridge</option>
                <option value=" Outright Only (1 year)">Outright Only (1 year)</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <p className="font-bold text-[11px] uppercase ">Purpose</p>
          <select
            className={`w-full rounded-xl border px-2 text-sm h-10 outline-none focus:outline-none focus:ring-0 bg-white ${
              !projectData?.companyInfo?.purpose ? "text-slate-400" : "text-black"
            } border-darkgreen/10 focus:border-[#289800]`}
            disabled={readOnly}
            value={projectData?.companyInfo?.purpose ?? ""}
            onChange={(e) => handleChange("purpose", e.target.value)}
          >
            <option value="" disabled>
              Select purpose
            </option>
            <option value="additional">Additional</option>
            <option value="upgrade">Upgrade</option>
            <option value="new deployment">New Deployment</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export default CompanyInfo;