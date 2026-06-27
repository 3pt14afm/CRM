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

  // For existing combobox: tracks what the user is currently typing (display value)
  const [existingInputValue, setExistingInputValue] = useState("");
  // Whether a valid existing company has been committed (locked in)
  const existingLockedRef = useRef(false);

  const abortControllerRef = useRef(null);

  const isExistingType = Number(projectData?.companyInfo?.type) === 1;
  const isPotentialType = Number(projectData?.companyInfo?.type) === 0;
  const isCompanyLocked = isExistingType && !!projectData?.companyInfo?.companySapCode;

  // Keep existingInputValue in sync when projectData changes externally
  useEffect(() => {
    if (isExistingType) {
      setExistingInputValue(projectData?.companyInfo?.companyName ?? "");
      existingLockedRef.current = !!projectData?.companyInfo?.companySapCode;
    }
  }, [isExistingType, projectData?.companyInfo?.companyName, projectData?.companyInfo?.companySapCode]);

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

  // --- Existing combobox handlers ---
  const handleExistingInputChange = (e) => {
    const value = e.target.value;
    setExistingInputValue(value);
    existingLockedRef.current = false;

    // Clear the committed company data while user is typing
    updateSection("companyInfo", {
      companyName: "",
      companySapCode: null,
      potentialCompanyId: null,
    });

    const trimmed = value.trim();
    if (trimmed === "") {
      setSuggestions([]);
      setShowDropdown(false);
      setHasSearched(false);
      return;
    }
    setShowDropdown(true);
    fetchSuggestions(trimmed, "existing");
  };

  const handleExistingBlur = () => {
    // Use a longer delay to ensure onMouseDown on a suggestion fires first
    setTimeout(() => {
      setShowDropdown(false);
      // Only reset if the user didn't successfully select an option
      if (!existingLockedRef.current) {
        setExistingInputValue("");
        updateSection("companyInfo", {
          companyName: "",
          companySapCode: null,
          potentialCompanyId: null,
        });
      }
    }, 300);
  };

  const handleExistingFocus = () => {
    if (typeNotSelected || readOnly) return;
    // Don't clear the lock on focus — only clear it if the user actually
    // starts typing (handleExistingInputChange handles that).
    // Just re-open the dropdown if there's already a search term.
    if (existingInputValue.length >= 1 && !existingLockedRef.current) {
      setShowDropdown(true);
      fetchSuggestions(existingInputValue.trim(), "existing");
    }
  };

  // --- Potential handlers (unchanged logic) ---
  const handleNameChange = (e) => {
    const value = e.target.value;
    const trimmed = value.trim();

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
              companySapCode: null,
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
      // Set lock FIRST before any state updates so blur's setTimeout sees it
      existingLockedRef.current = true;
      setExistingInputValue(item.company_name);
      updateSection("companyInfo", {
        companyName: item.company_name,
        companySapCode: item.company_sap_code,
        potentialCompanyId: null,
      });
    }

    if (isPotentialType) {
      updateSection("companyInfo", {
        companyName: item.company_name,
        potentialCompanyId: item.id ?? null,
        companySapCode: null,
      });
      setPotentialMatchFound(true);
    }

    setShowDropdown(false);
    setSuggestions([]);
  };

  const handleTypeSelectChange = (e) => {
    const val = e.target.value;
    if (readOnly) return;

    updateSection("companyInfo", {
      type: val === "" ? null : Number(val),
      companyName: "",
      companySapCode: null,
      potentialCompanyId: null,
    });

    setExistingInputValue("");
    existingLockedRef.current = false;
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
    (isExistingType ? existingInputValue.length >= 1 : companyNameVal.length >= 1) &&
    !isCompanyLocked &&
    (isExistingType || isPotentialType);

  // Display value for the name input area
  const displayValue = isExistingType ? existingInputValue : companyNameVal;

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

            {/* Existing: combobox — user can type to search but must select from dropdown */}
            {isExistingType ? (
              <div className="relative flex items-center h-full" style={{ width: "80%" }}>
                <input
                  className={`h-full px-4 text-sm outline-none focus:ring-0 focus:border-none focus-visible:outline-none focus-visible:ring-0 bg-white transition-colors duration-200 border-none w-full ${
                    readOnly || typeNotSelected ? "opacity-70 cursor-not-allowed" : ""
                  }`}
                  type="text"
                  autoComplete="off"
                  placeholder={
                    typeNotSelected && !readOnly
                      ? "Select a type first..."
                      : isCompanyLocked
                      ? ""
                      : "Search existing company..."
                  }
                  value={isCompanyLocked ? companyNameVal : existingInputValue}
                  onChange={handleExistingInputChange}
                  onFocus={handleExistingFocus}
                  onBlur={handleExistingBlur}
                  disabled={readOnly || typeNotSelected}
                  readOnly={isCompanyLocked}
                />
                {/* Lock icon when company is committed */}
                {isCompanyLocked && !readOnly && (
                  <button
                    type="button"
                    title="Click to change company"
                    className="absolute right-3 text-gray-400 hover:text-gray-600 transition-colors"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const currentName = companyNameVal;
                      existingLockedRef.current = false;
                      updateSection("companyInfo", {
                        companyName: "",
                        companySapCode: null,
                        potentialCompanyId: null,
                      });
                      // Seed the input with the old name so user can refine search
                      setExistingInputValue(currentName);
                      setSuggestions([]);
                      setHasSearched(false);
                      // Trigger a search immediately with the seeded value
                      if (currentName.trim().length >= 1) {
                        setShowDropdown(true);
                        fetchSuggestions(currentName.trim(), "existing");
                      }
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </button>
                )}
              </div>
            ) : (
              /* Potential: free-text input, unchanged */
              <input
                className={`h-full px-4 text-sm outline-none focus:ring-0 focus:border-none focus-visible:outline-none focus-visible:ring-0 bg-white transition-colors duration-200 border-none`}
                style={{ width: isPotentialType && potentialMatchFound === false ? "70%" : "80%" }}
                type="text"
                autoComplete="off"
                placeholder={
                  typeNotSelected && !readOnly
                    ? "Select a type first..."
                    : isPotentialType
                    ? "Search or enter company name..."
                    : ""
                }
                value={companyNameVal}
                onChange={handleNameChange}
                onFocus={() => {
                  if (!typeNotSelected && companyNameVal.length >= 1) {
                    setShowDropdown(true);
                  }
                }}
                onBlur={handleBlur}
                disabled={readOnly || typeNotSelected}
              />
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
                      : "Company not found — will be saved as potential customer on submit."}
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