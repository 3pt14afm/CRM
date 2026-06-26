import { useProjectData } from "@/Context/ProjectContext";
import { get1YrPotential } from "@/utils/roi/calculations/get1YrPotential";
import { succeedingYears } from "@/utils/roi/calculations/succeedingYears";
import React, { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import { debounce } from "lodash";

function CompanyInfo({ readOnly, showErrors = false }) {
  const { projectData, updateSection, syncYearlyBreakdown } = useProjectData();

  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [potentialMatchFound, setPotentialMatchFound] = useState(null);

  const abortControllerRef = useRef(null);

  const isExistingType = Number(projectData?.companyInfo?.type) === 1;
  const isPotentialType = Number(projectData?.companyInfo?.type) === 0;
  const isCompanyLocked = isExistingType && !!projectData?.companyInfo?.companySapCode;

  // --- Calculation Sync ---
  useEffect(() => {
    const contractYears = Number(projectData?.companyInfo?.contractYears) || 0;
    if (contractYears > 0) {
      const data1stYear = get1YrPotential(projectData);
      const dataSucceeding = succeedingYears(projectData);
      syncYearlyBreakdown(contractYears, data1stYear, dataSucceeding);
    } else {
      syncYearlyBreakdown(0, null, null);
    }
  }, [
    projectData.companyInfo.contractYears,
    projectData.companyInfo.contractType,
    projectData.machineConfiguration,
    projectData.additionalFees,
    syncYearlyBreakdown,
  ]);

  const handleChange = (field, value) => {
    let updates = { [field]: value };
    if (field === "contractType" && value === "Outright Only (1 year)") {
      updates.contractYears = 1;
    }
    updateSection("companyInfo", updates);
  };

  const fetchSuggestions = useCallback(
    debounce(async (query, type) => {
      if (query.length < 1) {
        setSuggestions([]);
        return;
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();
      setIsSearching(true);
      setHasSearched(true);

      const routeName = type === "existing" ? "companies.search" : "potentials.search";

      try {
        const response = await axios.get(route(routeName), {
          params: { search: query },
          signal: abortControllerRef.current.signal,
        });
        setSuggestions(response.data);
      } catch (error) {
        if (!axios.isCancel(error)) {
          console.error("Suggestion fetch error:", error);
        }
      } finally {
        setIsSearching(false);
      }
    }, 250),
    []
  );

  const currentType = projectData?.companyInfo?.type ?? null;
  const typeNotSelected = currentType === null || currentType === undefined;
  const companyNameVal = String(projectData?.companyInfo?.companyName ?? "");

  const handleNameChange = (e) => {
    const value = e.target.value;
    const trimmed = value.trim();

    if (isExistingType) {
      if (trimmed === "") {
        updateSection("companyInfo", { 
          companyName: "", 
          companySapCode: null,
          potentialCompanyId: null 
        });
        setShowDropdown(false);
        setSuggestions([]);
        setHasSearched(false);
        return;
      }
      updateSection("companyInfo", { 
        companyName: value, 
        companySapCode: null,
        potentialCompanyId: null 
      });
      setShowDropdown(true);
      fetchSuggestions(trimmed, "existing");
      return;
    }

    if (isPotentialType) {
      updateSection("companyInfo", {
        companyName: value,
        companySapCode: null,
        potentialCompanyId: null,
      });
      setPotentialMatchFound(null);

      if (trimmed.length >= 1) {
        setShowDropdown(true);
        fetchSuggestions(trimmed, "potential");
      } else {
        setShowDropdown(false);
        setSuggestions([]);
        setHasSearched(false);
      }
    }
  };

  const handleBlur = () => {
    setTimeout(async () => {
      setShowDropdown(false);
      const trimmed = companyNameVal.trim();
      if (!trimmed) return;

      if (isExistingType) {
        try {
          const response = await axios.get(route("companies.search"), {
            params: { search: trimmed },
          });
          const match = response.data.find(
            (item) => item.company_name.trim().toLowerCase() === trimmed.toLowerCase()
          );
          if (match) {
            updateSection("companyInfo", {
              companyName: match.company_name,
              companySapCode: match.company_sap_code,
              potentialCompanyId: null, // Ensure potential ID is cleaned out
            });
          } else {
            updateSection("companyInfo", { companySapCode: null });
          }
        } catch (error) {
          if (!axios.isCancel(error)) console.error("Company verification error:", error);
        }
      }

      if (isPotentialType) {
        try {
          const response = await axios.get(route("potentials.search"), {
            params: { search: trimmed },
          });
          const match = response.data.find(
            (item) => item.company_name.trim().toLowerCase() === trimmed.toLowerCase()
          );
          if (match) {
            updateSection("companyInfo", { 
              potentialCompanyId: match.id,
              companySapCode: null // Ensure SAP code is cleaned out 
            });
            setPotentialMatchFound(true);
          } else {
            updateSection("companyInfo", { potentialCompanyId: null });
            setPotentialMatchFound(false);
          }
        } catch (error) {
          if (!axios.isCancel(error)) console.error("Potential verification error:", error);
        }
      }
    }, 200);
  };

  const selectSuggestion = (item) => {
    if (isExistingType) {
      updateSection("companyInfo", {
        companyName: item.company_name,
        companySapCode: item.company_sap_code,
        potentialCompanyId: null, // Explicitly clear potential ID
      });
    }

    if (isPotentialType) {
      updateSection("companyInfo", {
        companyName: item.company_name,
        potentialCompanyId: item.id ?? null,
        companySapCode: null, // Explicitly clear SAP code
      });
      setPotentialMatchFound(true);
    }

    setShowDropdown(false);
    setSuggestions([]);
  };

  const handleTypeSelectChange = (e) => {
    const val = e.target.value;
    if (readOnly) return;
    
    // Forcefully reset both conflicting foreign keys upon switching type
    updateSection("companyInfo", {
      type: val === "" ? null : Number(val),
      companyName: "",
      companySapCode: null,
      potentialCompanyId: null,
    });
    
    setSuggestions([]);
    setShowDropdown(false);
    setHasSearched(false);
    setPotentialMatchFound(null);
  };

  const baseInput =
    "rounded-xl border px-2 text-sm outline-none focus:outline-none focus:ring-0 h-10 transition-all duration-200";

  const isNameInvalid = !readOnly && showErrors && companyNameVal.trim().length === 0;
  const isTypeInvalid = !readOnly && showErrors && typeNotSelected;
  const wrapperInvalid = isNameInvalid || isTypeInvalid;
  const nameInputDisabled = readOnly || typeNotSelected || isCompanyLocked;

  const shouldShowDropdown =
    showDropdown &&
    companyNameVal.length >= 1 &&
    !isCompanyLocked &&
    (isExistingType || isPotentialType);

  return (
    <div className="flex flex-col bg-[#FBFFFA] shadow-md border border-[#2c2c2e]/15 border-b-[#2c2c2e]/25 rounded-xl p-8 gap-1 w-full lg:w-[60%] min-w-96">
      <div className="flex justify-between items-end">
        <div className="flex flex-col gap-1 w-full relative">
          <p className="font-bold text-[11px] uppercase">Company Name</p>

          <div
            className={`flex items-center rounded-xl border h-10 bg-white transition-all duration-200 overflow-hidden ${
              wrapperInvalid ? "border-red-500 bg-red-50/30" : "border-gray-200"
            }`}
          >
            <select
              className={`h-full text-[14px] -ml-4 font-medium bg-transparent outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 border-none appearance-none transition-colors duration-200 text-center ${
                isTypeInvalid
                  ? "text-red-400"
                  : typeNotSelected
                  ? "text-slate-400"
                  : "text-slate-600"
              } ${readOnly ? "cursor-not-allowed opacity-70" : "cursor-pointer"}`}
              style={{ width: "20%", paddingLeft: "0px", paddingRight: "0px", textIndent: "0px" }}
              value={currentType === null || currentType === undefined ? "" : String(currentType)}
              onChange={handleTypeSelectChange}
              disabled={readOnly}
            >
              <option value="">Type</option>
              <option value="1">Existing</option>
              <option value="0">Potential</option>
            </select>

            <div className="w-[1px] h-6 bg-gray-200" aria-hidden="true" />

            <input
              className={`h-full px-4 text-sm outline-none focus:ring-0 focus:border-none focus-visible:outline-none focus-visible:ring-0 bg-white transition-colors duration-200 border-none ${
                isCompanyLocked ? "opacity-70 cursor-not-allowed" : ""
              }`}
              style={{ width: isPotentialType && potentialMatchFound === false ? "70%" : "80%" }}
              type="text"
              autoComplete="off"
              placeholder={
                typeNotSelected && !readOnly
                  ? "Select a type first..."
                  : isCompanyLocked
                  ? ""
                  : isExistingType
                  ? "Search existing company..."
                  : "Search or enter company name..."
              }
              value={companyNameVal}
              onChange={handleNameChange}
              onFocus={() => {
                if (!isCompanyLocked && companyNameVal.length >= 1 && !typeNotSelected) {
                  setShowDropdown(true);
                }
              }}
              onBlur={handleBlur}
              disabled={nameInputDisabled}
            />

            {isPotentialType && potentialMatchFound === false && companyNameVal.trim().length > 0 && (
              <span className="mr-3 shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 border border-amber-200 whitespace-nowrap">
                New
              </span>
            )}
          </div>

          {shouldShowDropdown && (
            <ul className="absolute top-[62px] left-0 z-[100] [&::-webkit-scrollbar]:hidden w-full bg-[#ffffff01] backdrop-blur-lg border border-gray-200 rounded-xl shadow-2xl max-h-64 overflow-y-auto py-1 border-t-0 rounded-t-none">
              {isSearching && suggestions.length === 0 && (
                <li className="px-4 py-3 text-sm text-gray-600 flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-[#289800] border-t-transparent rounded-full animate-spin"></div>
                  Searching database...
                </li>
              )}
              {suggestions.length > 0 ? (
                suggestions.map((item, index) => (
                  <li
                    key={index}
                    className="px-4 py-2 hover:bg-green-50 cursor-pointer text-sm text-gray-800 border-b border-gray-50 last:border-none transition-colors"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      selectSuggestion(item);
                    }}
                  >
                    {item.company_name}
                  </li>
                ))
              ) : (
                !isSearching && hasSearched && (
                  <li className="px-4 py-3 text-sm text-gray-500 italic">
                    {isExistingType
                      ? "Company not found."
                      : "Not in list — will be saved as new on submit."}
                  </li>
                )
              )}
            </ul>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-2 mt-4">
        <div className="flex items-end justify-between">
          <div className="flex flex-col gap-1 w-[60%]">
            <p className="font-bold text-[11px] uppercase">Contract Type</p>
            <select
              className={`w-full ${baseInput} bg-white ${
                !projectData?.companyInfo?.contractType ? "text-slate-400" : "text-black"
              } border-darkgreen/10 focus:border-[#289800]`}
              value={projectData?.companyInfo?.contractType ?? ""}
              onChange={(e) => handleChange("contractType", e.target.value)}
              disabled={readOnly}
            >
              <option value="" disabled>Select contract type</option>
              <option value="Free Use + per Cartridge">Free Use + per Cartridge</option>
              <option value="Rental + Click Charge">Rental + Click Charge</option>
              <option value="Free Use + Click Charge">Free Use + Click Charge</option>
              <option value="Rental + per Cartridge">Rental + per Cartridge</option>
              <option value="Fixed Monthly Only">Fixed Monthly Only</option>
              <option value="Outright + Click Charge">Outright + Click Charge</option>
              <option value="Outright + per Cartridge">Outright + per Cartridge</option>
              <option value="Outright Only (1 year)">Outright Only (1 year)</option>
            </select>
          </div>

          <div className="flex flex-col gap-1 md:w-24 xl:w-32">
            <p className="font-bold text-[11px] uppercase">Contract Years</p>
            <input
              type="number"
              disabled={
                readOnly ||
                projectData?.companyInfo?.contractType === "Outright Only (1 year)"
              }
              value={projectData?.companyInfo?.contractYears || ""}
              onChange={(e) => {
                const val = e.target.value === "" ? 0 : Number(e.target.value);
                handleChange("contractYears", val);
              }}
              className={`${baseInput} w-full bg-green-50/30 text-center border border-gray-200 focus:border-[#289800]
                [&::-webkit-outer-spin-button]:appearance-none
                [&::-webkit-inner-spin-button]:appearance-none ${
                  projectData?.companyInfo?.contractType === "Outright Only (1 year)"
                    ? "opacity-60 cursor-not-allowed"
                    : ""
                }`}
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <p className="font-bold text-[11px] uppercase">Purpose</p>
          <select
            className={`w-full ${baseInput} bg-white border-darkgreen/10 focus:border-[#289800]`}
            value={projectData?.companyInfo?.purpose ?? ""}
            onChange={(e) => handleChange("purpose", e.target.value)}
            disabled={readOnly}
          >
            <option value="" disabled>Select purpose</option>
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