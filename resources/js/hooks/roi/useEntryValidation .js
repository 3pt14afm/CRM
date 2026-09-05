import { useState } from 'react';
import { useProjectData } from '@/Context/ProjectContext';
import { toast } from 'sonner';
import {
  checkCompanyInfoValid,
  checkBusinessLogic,
  checkOutrightFields,
  checkEntryRemarks,
} from '@/utils/roi/roiEntryValidators';

const MACHINE_TAB = "Machine";

/**
 * Provides all validation logic for the Entry form.
 * Covers company info, business logic (costs, yields, fees), and entry remarks.
 * The actual checks live in @/utils/roi/roiEntryValidators (shared with the
 * group entry form) — this hook wires them to projectData + toast/tab side effects.
 *
 * @param {{ setTab: Function }} params
 * @returns {{
 *   showOutrightErrors: boolean,
 *   setShowOutrightErrors: Function,
 *   showModeErrors: boolean,
 *   setShowModeErrors: Function,
 *   isCompanyInfoValid: Function,
 *   validateBusinessLogic: Function,
 *   validateOutrightFields: Function,
 *   validateEntryRemarks: Function,
 * }}
 */
export function useEntryValidation({ setTab }) {
  const { projectData } = useProjectData();

  const [showOutrightErrors, setShowOutrightErrors] = useState(false);
  const [showModeErrors, setShowModeErrors] = useState(false);

  const isCompanyInfoValid = () => checkCompanyInfoValid(projectData?.companyInfo);

  const validateBusinessLogic = () => {
    const result = checkBusinessLogic(projectData);

    if (!result.valid) {
      toast.error(result.message);
      if (result.modeError) setShowModeErrors(true);
      setTab(result.tab ?? MACHINE_TAB);
      return false;
    }

    setShowOutrightErrors(false);
    setShowModeErrors(false);
    return true;
  };

  // Lightweight secondary check used to drive inline field highlighting.
  // Full price validation is already done in validateBusinessLogic — this
  // only manages the showOutrightErrors UI flag.
  const validateOutrightFields = () => {
    const result = checkOutrightFields(projectData);

    if (!result.valid) {
      setShowOutrightErrors(true);
      setTab(result.tab ?? MACHINE_TAB);
      return false;
    }

    setShowOutrightErrors(false);
    return true;
  };

  const validateEntryRemarks = () => {
    const result = checkEntryRemarks(projectData);

    if (!result.valid) {
      toast.error(result.message);
      return false;
    }

    return true;
  };

  return {
    showOutrightErrors,
    setShowOutrightErrors,
    showModeErrors,
    setShowModeErrors,
    isCompanyInfoValid,
    validateBusinessLogic,
    validateOutrightFields,
    validateEntryRemarks,
  };
}