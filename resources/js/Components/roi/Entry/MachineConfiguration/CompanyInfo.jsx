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
  const isExistingCompany = !!projectData?.companyInfo?.companySapCode;
  const abortControllerRef = useRef(null);

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
    debounce(async (query) => {
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
      try {
        const response = await axios.get(route('companies.search'), {
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

  const handleNameChange = (e) => {
    const value = e.target.value;

    // Only reset existing status if the trimmed value actually changed
    // This prevents spaces from flipping an existing company to potential
    const trimmedNew = value.trim();
    const trimmedCurrent = String(projectData?.companyInfo?.companyName ?? "").trim();

    if (trimmedNew !== trimmedCurrent) {
      // Meaningful content changed — no longer a verified selection
      
      updateSection("companyInfo", { companyName: value, companySapCode: null, type: 0 });
    } else {
      // Only whitespace was added/removed — keep existing status intact
      updateSection("companyInfo", { companyName: value });
    }

    if (value.length >= 1) {
      setShowDropdown(true);
      fetchSuggestions(trimmedNew);
    } else {
      setShowDropdown(false);
      setSuggestions([]);
    }
  };

  const verifyCompanyOnBlur = async () => {
    setTimeout(async () => {
      setShowDropdown(false);
      const trimmed = companyNameVal.trim();
      if (!trimmed) return;

      try {
        const response = await axios.get(route('companies.search'), {
          params: { search: trimmed },
        });
        const match = response.data.find(
          (item) => item.company_name.trim().toLowerCase() === trimmed.toLowerCase()
        );
        if (match) {
         
          updateSection("companyInfo", {
            companyName: match.company_name,
            companySapCode: match.company_sap_code,
            type: 1,
          });
        } else {
          setIsExistingCompany(false);
          updateSection("companyInfo", { companySapCode: null, type: 0 });
        }
      } catch (error) {
        if (!axios.isCancel(error)) {
          console.error("Company verification error:", error);
        }
      }
    }, 200);
  };

  const selectSuggestion = (item) => {
   
    updateSection("companyInfo", {
      companyName: item.company_name,
      companySapCode: item.company_sap_code,
      type: 1,
    });
    setShowDropdown(false);
    setSuggestions([]);
  };

  const handleTypeChange = (value) => {
    if (isExistingCompany) return;
    updateSection("companyInfo", { type: value });
  };

  const baseInput = "rounded-xl border px-2 text-sm outline-none focus:outline-none focus:ring-0 h-10 transition-all duration-200";
  const okBorder = "border-darkgreen/10 focus:border-[#289800]";
  const errBorder = "border-red-500 focus:border-red-500 bg-red-50/30";
  const companyNameVal = String(projectData?.companyInfo?.companyName ?? "");
  const isInvalid = !readOnly && showErrors && companyNameVal.trim().length === 0;
  const currentType = projectData?.companyInfo?.type ?? 0;

  const Checkbox = ({ value, label }) => (
    <label className={`flex items-center gap-2 text-[13px] select-none ${isExistingCompany || readOnly ? "cursor-not-allowed opacity-80" : "cursor-pointer"}`}>
      <div
        onClick={() => !readOnly && !isExistingCompany && handleTypeChange(value)}
        className={`w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all duration-150 ${
          currentType === value ? "bg-[#289800] border-[#289800]" : "border-gray-300 bg-white"
        } ${isExistingCompany || readOnly ? "cursor-not-allowed" : "cursor-pointer"}`}
      >
        {currentType === value && (
          <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <span className="text-gray-700">{label}</span>
    </label>
  );

  return (
    <div className="flex flex-col bg-[#FBFFFA] shadow-md border border-[#2c2c2e]/15 border-b-[#2c2c2e]/25 rounded-xl p-8 gap-1 w-full lg:w-[60%] min-w-96">
      <div className="flex justify-between items-center">

        {/* Company Name */}
        <div className="flex flex-col gap-1 w-[70%] relative">
          <p className="font-bold text-[11px] uppercase">Company Name</p>
          <input
            className={`${baseInput} w-full ${isInvalid ? errBorder : okBorder}`}
            type="text"
            autoComplete="off"
            value={companyNameVal}
            onChange={handleNameChange}
            onFocus={() => { if (companyNameVal.length >= 1) setShowDropdown(true); }}
            onBlur={verifyCompanyOnBlur}
            disabled={readOnly}
          />
          {showDropdown && companyNameVal.length >= 1 && (
            <ul className="absolute top-[62px] left-0 z-[100] [&::-webkit-scrollbar]:hidden w-full bg-[#ffffff01] backdrop-blur-lg border border-gray-200 rounded-xl shadow-2xl max-h-64 overflow-y-auto py-1 border-t-0 rounded-t-none">
              {isSearching && suggestions.length === 0 && (
                <li className="px-4 py-3 text-sm text-gray-600 flex items-center gap-2">
                  <div className="w-3 h-3 border-2 border-darkgreen border-t-transparent rounded-full animate-spin"></div>
                  Searching database...
                </li>
              )}
              {suggestions.length > 0 ? (
                suggestions.map((item, index) => (
                  <li
                    key={index}
                    className="px-4 py-2 hover:bg-green-50 cursor-pointer text-sm text-gray-800 border-b border-gray-50 last:border-none transition-colors"
                    onMouseDown={(e) => { e.preventDefault(); selectSuggestion(item); }}
                  >
                    {item.company_name}
                  </li>
                ))
              ) : (
                !isSearching && hasSearched && (
                  <li className="px-4 py-3 text-sm text-gray-600">Company not found.</li>
                )
              )}
            </ul>
          )}
        </div>

        {/* Contract Years */}
        <div className="flex flex-col gap-1">
          <p className="font-bold text-[11px] uppercase">Contract Years</p>
          <input
            type="number"
            disabled={readOnly || projectData?.companyInfo?.contractType === "Outright Only (1 year)"}
            value={projectData?.companyInfo?.contractYears || ""}
            onChange={(e) => {
              const val = e.target.value === "" ? 0 : Number(e.target.value);
              handleChange("contractYears", val);
            }}
            className={`${baseInput} md:w-24 xl:w-32 bg-green-50/30 text-center border border-gray-200 focus:border-[#289800]
              [&::-webkit-outer-spin-button]:appearance-none
              [&::-webkit-inner-spin-button]:appearance-none ... ${
              projectData?.companyInfo?.contractType === "Outright Only (1 year)" ? "opacity-60 cursor-not-allowed" : ""
            }`}
          />
        </div>

      </div>

      <div className="flex flex-col gap-2 mt-4">

        {/* Contract Type + Type checkboxes */}
        <div className="flex items-end justify-between">
          <div className="flex flex-col gap-1 w-[60%]">
            <p className="font-bold text-[11px] uppercase">Contract Type</p>
            <select
              className={`w-full ${baseInput} bg-white ${!projectData?.companyInfo?.contractType ? "text-slate-400" : "text-black"} border-darkgreen/10 focus:border-[#289800]`}
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

          {/* Type */}
          <div className="flex flex-col gap-1 md:w-24 xl:w-44">
            <p className="font-bold text-[11px] uppercase">Type</p>
            <div className="flex flex-row items-center justify-between h-10">
              <Checkbox value={1} label="Existing" />
              <Checkbox value={0} label="Potential" />
            </div>
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