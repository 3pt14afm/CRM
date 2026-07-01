import React, { useEffect, useState, useCallback, useRef } from "react";
import axios from "axios";
import { debounce } from "lodash";

export default function CompanyInfoBlock({ value, onChange, readOnly = false, showErrors = false }) {
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

  const type  = value?.type  ?? null;
  const isExistingType = Number(type ) === 1;
  const isPotentialType = Number(type ) === 0;
  const typeNotSelected = type  === null || type  === undefined || type  === "";
  const isCompanyLocked = isExistingType && !!value?.companySapCode;

  const accountVal = String(value?.account ?? "");

  const updateFields = (updates) => {
    if (typeof onChange !== "function") return;
    onChange((prev) => ({
      ...prev,
      ...updates,
    }));
  };

  // Keep existingInputValue in sync when value changes externally
  useEffect(() => {
    if (isExistingType) {
      setExistingInputValue(value?.account ?? "");
      existingLockedRef.current = !!value?.companySapCode;
    }
  }, [isExistingType, value?.account, value?.companySapCode]);

  const handleFieldChange = (field, fieldValue) => {
    if (readOnly || typeof onChange !== "function") return;
    updateFields({ [field]: fieldValue });
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

  // --- Existing combobox handlers ---
  const handleExistingInputChange = (e) => {
    const val = e.target.value;
    setExistingInputValue(val);
    existingLockedRef.current = false;

    // Clear the committed company data while user is typing
    updateFields({
      account: "",
      companySapCode: null,
      potentialCompanyId: null,
    });

    const trimmed = val.trim();
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
    // Longer delay so onMouseDown on a suggestion fires first
    setTimeout(() => {
      setShowDropdown(false);
      if (!existingLockedRef.current) {
        setExistingInputValue("");
        updateFields({
          account: "",
          companySapCode: null,
          potentialCompanyId: null,
        });
      }
    }, 300);
  };

  const handleExistingFocus = () => {
    if (typeNotSelected || readOnly) return;
    if (existingInputValue.length >= 1 && !existingLockedRef.current) {
      setShowDropdown(true);
      fetchSuggestions(existingInputValue.trim(), "existing");
    }
  };

  // --- Potential handlers ---
  const handlePotentialInputChange = (e) => {
    const val = e.target.value;
    const trimmed = val.trim();

    if (!isPotentialType) return;

    updateFields({
      account: val,
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
  };

  const handlePotentialBlur = () => {
    setTimeout(async () => {
      setShowDropdown(false);
      const trimmed = accountVal.trim();
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
            // Matches an existing potential record — link to it
            updateFields({
              potentialCompanyId: match.id,
              companySapCode: null,
            });
            setPotentialMatchFound(true);
          } else {
            // No match — will be created as a new potential company on submit
            updateFields({ potentialCompanyId: null });
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
      existingLockedRef.current = true;
      setExistingInputValue(item.company_name);
      updateFields({
        account: item.company_name,
        companySapCode: item.company_sap_code,
        potentialCompanyId: null,
      });
    }

    if (isPotentialType) {
      updateFields({
        account: item.company_name,
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

    updateFields({
      type : val === "" ? null : Number(val),
      account: "",
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

  const shouldShowDropdown =
    showDropdown &&
    (isExistingType ? existingInputValue.length >= 1 : accountVal.length >= 1) &&
    !isCompanyLocked &&
    (isExistingType || isPotentialType);

  const isAccountInvalid = !readOnly && showErrors && accountVal.trim().length === 0;
  const isTypeInvalid = !readOnly && showErrors && typeNotSelected;
  const accountWrapperInvalid = isAccountInvalid || isTypeInvalid;

  const otherFields = [
    {
      key: "subCategory",
      label: "SUB CATEGORY",
      placeholder: "Enter Sub Category",
    },
    {
      key: "accountManager",
      label: "ACCOUNT MANAGER",
      placeholder: "Enter Complete AM Name",
    },
  ];

  return (
    <div className="border-[#D6DDD0] bg-[#FBFFFA] px-5 xl:px-7 py-4 shadow-md border border-[#2c2c2e]/15 border-b-[#2c2c2e]/25 rounded-xl">
      <div className="space-y-2">
        {/* SUB CATEGORY */}
        <div className="grid grid-cols-[135px_minmax(0,1fr)] xl:grid-cols-[150px_minmax(0,1fr)] items-center">
          <label className="text-[11px] xl:text-xs font-bold tracking-[0.01em]">SUB CATEGORY</label>
          {readOnly ? (
            <div className="min-h-8 rounded-xl border px-3 py-1.5 text-xs border-gray-200 bg-white flex items-center">
              {value?.subCategory?.trim?.() ? value.subCategory : "—"}
            </div>
          ) : (
            <input
              type="text"
              value={value?.subCategory ?? ""}
              onChange={(e) => handleFieldChange("subCategory", e.target.value)}
              placeholder="Enter Sub Category"
              className="h-8 rounded-xl border px-3 text-xs outline-none border-gray-200 focus:border-[#289800] focus:outline-none focus:ring-0 placeholder:text-slate-300 hover:border-[#28980080]"
            />
          )}
        </div>

    {/* ACCOUNT — existing/potential company combobox */}
 <div className="grid grid-cols-[135px_minmax(0,1fr)] xl:grid-cols-[150px_minmax(0,1fr)] items-center relative">
  <label className="text-[11px] xl:text-xs font-bold tracking-[0.01em]">ACCOUNT</label>
      <div className="relative w-full">
        <div
          className={`flex items-center rounded-xl border h-8 bg-white transition-all duration-200 overflow-hidden ${
            accountWrapperInvalid ? "border-red-500 bg-red-50/30" : "border-gray-200 hover:border-[#28980080]"
          } ${readOnly ? "opacity-70" : ""}`}
        >
          <select
            className={`h-full text-xs ml-2 font-medium bg-transparent outline-none focus:outline-none focus:ring-0 focus-visible:ring-0 border-none appearance-none transition-colors duration-200 ${
              isTypeInvalid ? "text-red-400" : typeNotSelected ? "text-slate-400" : "text-slate-600"
            } ${readOnly ? "cursor-not-allowed" : "cursor-pointer"}`}
            style={{ width: "15%", paddingLeft: "0px", paddingRight: "0px", textIndent: "0px" }}
            value={type === null || type === undefined ? "" : String(type)}
            onChange={handleTypeSelectChange}
            disabled={readOnly}
          >
            <option value="" >Type</option>
            <option value="1" >Existing</option>
            <option value="0" >Potential</option>
          </select>

          <div className="w-[1px] h-5 bg-gray-200" aria-hidden="true" />

          {isExistingType ? (
            <div className="relative flex items-center h-full flex-1">
              <input
                className={`h-full px-3 text-xs outline-none focus:ring-0 focus:border-none focus-visible:outline-none focus-visible:ring-0 bg-white transition-colors duration-200 border-none w-full ${
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
                value={isCompanyLocked ? accountVal : existingInputValue}
                onChange={handleExistingInputChange}
                onFocus={handleExistingFocus}
                onBlur={handleExistingBlur}
                disabled={readOnly || typeNotSelected}
                readOnly={isCompanyLocked || readOnly}
              />
              {isCompanyLocked && !readOnly && (
                <button
                  type="button"
                  title="Click to change company"
                  className="absolute right-2 text-gray-400 hover:text-gray-600 transition-colors"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    const currentName = accountVal;
                    existingLockedRef.current = false;
                    updateFields({
                      account: "",
                      companySapCode: null,
                      potentialCompanyId: null,
                    });
                    setExistingInputValue(currentName);
                    setSuggestions([]);
                    setHasSearched(false);
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
            <input
              className={`h-full px-3 text-xs outline-none focus:ring-0 focus:border-none focus-visible:outline-none focus-visible:ring-0 bg-white transition-colors duration-200 border-none flex-1 ${
                readOnly ? "opacity-70 cursor-not-allowed" : ""
              }`}
              type="text"
              autoComplete="off"
              placeholder={
                typeNotSelected && !readOnly
                  ? "Select a type first..."
                  : isPotentialType
                  ? "Search or enter company name..."
                  : "Enter Complete Company Name"
              }
              value={accountVal}
              onChange={handlePotentialInputChange}
              onFocus={() => {
                if (!typeNotSelected && isPotentialType && accountVal.length >= 1) {
                  setShowDropdown(true);
                }
              }}
              onBlur={handlePotentialBlur}
              disabled={readOnly || typeNotSelected}
              readOnly={readOnly}
            />
          )}
        </div>

        {shouldShowDropdown && !readOnly && (
          <ul className="absolute top-[36px] left-0 z-[100] [&::-webkit-scrollbar]:hidden w-full bg-[#ffffff01] backdrop-blur-lg border border-gray-200 rounded-xl shadow-2xl max-h-64 overflow-y-auto py-1 border-t-0 rounded-t-none">
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
              !isSearching &&
              hasSearched && (
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

        {/* ACCOUNT MANAGER */}
        <div className="grid grid-cols-[135px_minmax(0,1fr)] xl:grid-cols-[150px_minmax(0,1fr)] items-center">
          <label className="text-[11px] xl:text-xs font-bold tracking-[0.01em]">ACCOUNT MANAGER</label>
          {readOnly ? (
            <div className="min-h-8 rounded-xl border px-3 py-1.5 text-xs border-gray-200 bg-white flex items-center">
              {value?.accountManager?.trim?.() ? value.accountManager : "—"}
            </div>
          ) : (
            <input
              type="text"
              value={value?.accountManager ?? ""}
              onChange={(e) => handleFieldChange("accountManager", e.target.value)}
              placeholder="Enter Complete AM Name"
              className="h-8 rounded-xl border px-3 text-xs outline-none border-gray-200 focus:border-[#289800] focus:outline-none focus:ring-0 placeholder:text-slate-300 hover:border-[#28980080]"
            />
          )}
        </div>
      </div>
    </div>
  );
}