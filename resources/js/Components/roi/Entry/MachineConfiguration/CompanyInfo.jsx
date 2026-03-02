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

  // ✅ Required fields: companyName, contractYears, contractType
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

  const contractType = projectData?.companyInfo?.contractType || "";
  const showBundledInk = contractType === "Monthly Rental";

  const baseInput =
    "rounded-sm border px-2 text-sm outline-none focus:outline-none focus:ring-0 h-10";
  const okBorder = "border-darkgreen/10 focus:border-[#289800]";
  const errBorder = "border-red-500 focus:border-red-500";

  return (
    <div className="flex flex-col bg-lightgreen/5 shadow-md border border-slate-300 rounded-md p-8 gap-1 w-full lg:w-[60%] min-w-96">
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
              const v = e.target.value; // string
              // store "" when empty so placeholder shows
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
        {/* Contract Type + checkbox aligned under Contract Years */}
        <div className="flex flex-col mt-2 gap-1">
          <p className="font-bold text-[11px] uppercase ">Contract Type</p>

          <div className="flex justify-between items-start">
            {/* left column (same width as company name input) */}
            <div className="w-[70%]">
              <select
                className={`w-full rounded-sm border px-2 text-sm h-10 outline-none focus:outline-none focus:ring-0 bg-white ${
                  !projectData?.companyInfo?.contractType ? "text-slate-400" : "text-black"
                } ${showContractTypeError ? "border-red-500 focus:border-red-500 bg-red-50" : "border-darkgreen/10 focus:border-[#289800]"}`}
                disabled={readOnly}
                value={projectData?.companyInfo?.contractType ?? ""}
                onChange={(e) => {
                  const nextType = e.target.value;

                  handleChange("contractType", nextType);

                  // auto-clear when switching away from Monthly Rental
                  if (nextType !== "Monthly Rental") {
                    handleChange("bundledStdInk", false);
                  }
                }}
              >
                <option value="" disabled>
                  Select contract type
                </option>
                <option className="text-black" value="Free Use">
                  Free Use
                </option>
                <option className="text-black" value="Rental + Click">
                  Rental + Click
                </option>
                <option className="text-black" value="Fix Click">
                  Fix Click
                </option>
                <option className="text-black" value="Monthly Rental">
                  Monthly Rental
                </option>
              </select>
            </div>

            {/* right column (matches contract years width) */}
            {/* <div className="w-32 flex justify-start pt-2">
              {showBundledInk && (
                <label className="flex items-center gap-3 select-none">
                  <input
                    type="checkbox"
                    checked={!!projectData.companyInfo.bundledStdInk}
                    onChange={(e) =>
                      handleChange("bundledStdInk", e.target.checked)
                    }
                    className="h-4 w-4 checkboxes cursor-pointer border-darkgreen/15 focus:outline-none focus:ring-0 focus:border-darkgreen/35"
                  />
                  <span className="text-[11px] font-bold uppercase text-slate-700 leading-tight">
                    With bundled std ink bottles
                  </span>
                </label>
              )}
            </div> */}
          </div>
        </div>

        <div className="flex flex-col">
          <p className="font-bold text-[11px] uppercase ">Purpose</p>
          <input
            className="rounded-sm border px-2 text-sm border-darkgreen/10 h-10 outline-none focus:outline-none focus:ring-0 focus:border-[#289800]"
            type="text"
            value={projectData?.companyInfo?.purpose ?? ""}
            disabled={readOnly}
            onChange={(e) => handleChange("purpose", e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}

export default CompanyInfo;