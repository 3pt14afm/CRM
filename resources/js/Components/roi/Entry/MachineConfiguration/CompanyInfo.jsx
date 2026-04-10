import { useProjectData } from "@/Context/ProjectContext";
import { get1YrPotential } from "@/utils/calculations/freeuse/get1YrPotential";
import { succeedingYears } from "@/utils/calculations/freeuse/succeedingYears";
import React, { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import { debounce } from "lodash";

function CompanyInfo({ readOnly, showErrors = false }) {
  // Switched to use updateSection for centralized state management
  const { projectData, updateSection, syncYearlyBreakdown } = useProjectData();
  
  const [suggestions, setSuggestions] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
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
    projectData.companyInfo.contractType, // Now reacts to contract type changes
    projectData.machineConfiguration,
    projectData.additionalFees,
    syncYearlyBreakdown,
  ]);

  // Using updateSection ensures companyInfo.bundledStdInk stays a boolean
  const handleChange = (field, value) => {
    updateSection("companyInfo", { [field]: value });
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
          signal: abortControllerRef.current.signal 
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
    handleChange("companyName", value);
    
    if (value.length >= 1) {
      setShowDropdown(true);
      fetchSuggestions(value);
    } else {
      setShowDropdown(false);
      setSuggestions([]);
    }
  };

  const selectSuggestion = (name) => {
    handleChange("companyName", name);
    setShowDropdown(false);
    setSuggestions([]);
  };

  const baseInput = "rounded-xl border px-2 text-sm outline-none focus:outline-none focus:ring-0 h-10 transition-all duration-200";
  const okBorder = "border-darkgreen/10 focus:border-[#289800]";
  const errBorder = "border-red-500 focus:border-red-500 bg-red-50/30";
  const companyNameVal = String(projectData?.companyInfo?.companyName ?? "");
  const isInvalid = !readOnly && showErrors && companyNameVal.trim().length === 0;

  return (
    <div className="flex flex-col bg-[#FBFFFA] shadow border border-[#2c2c2e]/10 border-b-[#2c2c2e]/20 rounded-xl p-8 gap-1 w-full lg:w-[60%] min-w-96">
      <div className="flex justify-between items-center">
        
        <div className="flex flex-col gap-1 w-[70%] relative">
          <div className="flex justify-between items-center">
            <p className="font-bold text-[11px] uppercase">Company Name</p>
          </div>
          
          <input
            className={`${baseInput} w-full ${isInvalid ? errBorder : okBorder}`}
            type="text"
            autoComplete="off"
            value={companyNameVal}
            onChange={handleNameChange}
            onFocus={() => { if (companyNameVal.length >= 1) setShowDropdown(true); }}
            onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
            disabled={readOnly}
          />

          {showDropdown && companyNameVal.length >= 1 && (
            <ul className="absolute top-[62px] left-0 z-[100] [&::-webkit-scrollbar]:hidden w-full bg-[#ffffff01]  backdrop-blur-lg border border-gray-200 rounded-xl shadow-2xl max-h-64 overflow-y-auto py-1 border-t-0 rounded-t-none">
              {isSearching && suggestions.length === 0 && (
                <li className="px-4 py-3 text-sm text-gray-600 flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-green-600 border-t-transparent rounded-full animate-spin"></div>
                    Searching database...
                </li>
              )}

              {suggestions.length > 0 ? (
                suggestions.map((item, index) => (
                  <li
                    key={index}
                    className="px-4 py-2 hover:bg-green-50 cursor-pointer text-sm text-gray-800 border-b  border-gray-50 last:border-none transition-colors"
                    onClick={() => selectSuggestion(item.company_name)}
                  >
                    {item.company_name}
                  </li>
                ))
              ) : (
                !isSearching && hasSearched && (
                  <li className="px-4 py-3 text-sm text-gray-600">
                    Company not found.
                  </li>
                )
              )}
            </ul>
          )}
        </div>

        <div className="flex flex-col gap-1">
          <p className="font-bold text-[11px] uppercase">Contract Years</p>
          <input
            type="number"
            value={projectData?.companyInfo?.contractYears || ""}
            onChange={(e) => {
                const val = e.target.value === "" ? 0 : Number(e.target.value);
                handleChange("contractYears", val);
            }}
            className={`${baseInput} md:w-24 xl:w-32 bg-green-50/30 text-center border [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
            disabled={readOnly}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 mt-4">
        <div className="flex flex-col gap-1">
          <p className="font-bold text-[11px] uppercase">Contract Type</p>
          <select
            className={`w-[70%] ${baseInput} bg-white ${!projectData?.companyInfo?.contractType ? "text-slate-400" : "text-black"} border-darkgreen/10 focus:border-[#289800]`}
            value={projectData?.companyInfo?.contractType ?? ""}
            onChange={(e) => {
                handleChange("contractType", e.target.value);
            }}
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