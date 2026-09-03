import { useState } from 'react';
import { useGroupProjectData } from '@/Context/GroupProjectContext';
import { toast } from 'sonner';
import {
  checkCompanyInfoValid,
  checkBusinessLogic,
  checkEntryRemarks,
} from '@/utils/roi/roiEntryValidators';

const MACHINE_TAB = "Machine";

/**
 * Group equivalent of useEntryValidation. Validates every entry in
 * groupData.entries (not just the currently active one), reusing the same
 * checks from roiEntryValidators.
 *
 * @param {{ setTab: Function }} params
 */
export function useGroupEntryValidation({ setTab }) {
  const { groupData, activeEntryIndex, switchActiveEntry, getCurrentMachineConfig } =
    useGroupProjectData();

  const [showOutrightErrors, setShowOutrightErrors] = useState(false);
  const [showModeErrors, setShowModeErrors] = useState(false);

  // groupData.entries is accurate for every entry EXCEPT the active one,
  // whose machineConfiguration can be stale until flushActiveMachineConfig()
  // runs (same race single-entry guards against via getCurrentMachineConfig()).
  // Patch it into a local copy so validation always sees live data without
  // waiting on a state flush.
  const getEffectiveEntries = () => {
    const liveConfig = getCurrentMachineConfig?.();
    if (!liveConfig) return groupData.entries;
    return groupData.entries.map((entry, i) =>
      i === activeEntryIndex ? { ...entry, machineConfiguration: liveConfig } : entry
    );
  };

  /**
   * Lighter gate for draft save — checks only company info per entry,
   * not the full business-logic/remarks checks. Mirrors single-entry's
   * handleSaveDraft, which blocks on isCompanyInfoValid() alone.
   * @returns {boolean}
   */
    const validateAllCompanyInfo = () => {
      const entries = groupData.entries;

      for (let i = 0; i < entries.length; i++) {
        const mergedInfo = { ...entries[i].companyInfo, companyName: groupData.companyInfo.companyName };
        if (!checkCompanyInfoValid(mergedInfo)) {
          switchActiveEntry(i);
          setTab(MACHINE_TAB);
          toast.error(`Entry ${i + 1}: please fill in all required project fields.`);
          return false;
        }
      }
      return true;
    };

  /**
   * Validates every entry in order. On the first failure, jumps the UI to
   * that entry (via switchActiveEntry) before toasting, so the user lands
   * on the broken entry with the relevant tab/fields visible.
   * @returns {boolean}
   */
  const validateAllEntries = () => {
    const entries = getEffectiveEntries();

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      const label = `Entry ${i + 1}`;

      const mergedInfo = { ...entry.companyInfo, companyName: groupData.companyInfo.companyName };
      
      if (!checkCompanyInfoValid(mergedInfo)) {
        switchActiveEntry(i);
        setTab(MACHINE_TAB);
        toast.error(`${label}: please fill in all required project fields.`);
        return false;
      }

      const biz = checkBusinessLogic(entry);
      if (!biz.valid) {
        switchActiveEntry(i);
        setTab(biz.tab ?? MACHINE_TAB);
        setShowModeErrors(!!biz.modeError);
        toast.error(`${label}: ${biz.message}`);
        return false;
      }

      const remarks = checkEntryRemarks(entry);
      if (!remarks.valid) {
        switchActiveEntry(i);
        toast.error(`${label}: ${remarks.message}`);
        return false;
      }
    }

    setShowModeErrors(false);
    setShowOutrightErrors(false);
    return true;
  };

  return {
    showOutrightErrors,
    setShowOutrightErrors,
    showModeErrors,
    setShowModeErrors,
    validateAllCompanyInfo,
    validateAllEntries,
  };
}