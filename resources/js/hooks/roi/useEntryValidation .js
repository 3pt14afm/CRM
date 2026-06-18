import { useState } from 'react';
import { useProjectData } from '@/Context/ProjectContext';
import { toast } from 'sonner';

/**
 * Provides all validation logic for the Entry form.
 * Covers company info, business logic (costs, yields, fees), and entry remarks.
 *
 * @param {{ setTab: Function }} params
 * @returns {{
 *   showOutrightErrors: boolean,
 *   setShowOutrightErrors: Function,
 *   isCompanyInfoValid: Function,
 *   validateBusinessLogic: Function,
 *   validateOutrightFields: Function,
 *   validateEntryRemarks: Function,
 * }}
 */
export function useEntryValidation({ setTab }) {
  const { projectData } = useProjectData();

  const [showOutrightErrors, setShowOutrightErrors] = useState(false);

  const isCompanyInfoValid = () => {
    const ci = projectData?.companyInfo ?? {};
    const nameOk = String(ci.companyName ?? "").trim().length > 0;
    const typeOk = String(ci.contractType ?? "").trim().length > 0;

    const years = Number(ci.contractYears);
    const yearsOk = Number.isFinite(years) && years > 0;

    return nameOk && typeOk && yearsOk;
  };

  const validateBusinessLogic = () => {
    const ci = projectData?.companyInfo ?? {};
    const contractType = String(ci.contractType ?? "").toLowerCase();

    // Contract type flags
    const isOutright = contractType.includes("outright");
    const isRental = contractType.includes("rental");
    const isFreeUseClick = contractType.includes("free use + click charge");
    const isClick = contractType.includes("click");
    const isFixed = contractType.includes("fixed monthly only");
    const isOutrightOnly = contractType.toLowerCase().includes("outright only");
    const outrightCart = contractType.includes("Outright + per Cartridge");

    const machines = projectData?.machineConfiguration?.machine || [];
    const consumables = projectData?.machineConfiguration?.consumable || [];
    const allItems = [...machines, ...consumables];

    const monoAMVP = parseFloat(projectData?.yield?.monoAmvpYields?.monthly || 0);
    const colorAMVP = parseFloat(projectData?.yield?.colorAmvpYields?.monthly || 0);

    // Only validate AMVP if it's NOT 'Outright Only' AND it's a type that requires usage data
    if (!isOutrightOnly && !isFixed) {
      if (monoAMVP <= 0 && colorAMVP <= 0) {
        toast.error("At least one Monthly AMVP (Mono or Color) must be greater than zero.");
        return false;
      }
    }

    // --- 1. ITEM VALIDATION LOOP ---
    for (const item of allItems) {
      const costVal = parseFloat(item.cost || 0);
      const isMachine = item.type === "machine";
      const isMonoColor = item.mode === "mono" || item.mode === "color";
      const yieldVal = parseFloat(item.yields || 0);
      const priceVal = parseFloat(item.price || 0);

      // Mandatory Unit Cost (Global)
      if (costVal <= 0) {
        toast.error(`Unit Cost is mandatory for all items.`);
        setTab("Machine");
        return false;
      }

      // Machine/Printer Rule: Allow Yields ONLY if mode is "others"
      if (isMachine && item.mode !== "others" && yieldVal > 0) {
        toast.error(`Yields cannot be entered for Machines (unless set to 'Others').`);
        setTab("Machine");
        return false;
      }

      // Toner Rule: Require Yields for consumables (except Fixed models)
      if (!isMachine && isMonoColor && !isFixed && yieldVal <= 0 && !isOutrightOnly) {
        toast.error(`Yields are mandatory for Mono/Color consumables.`);
        setTab("Machine");
        return false;
      }

      // Skip sell price check for ANY click contract
      if (!isMachine && isMonoColor && !isFixed && !isClick && !isOutrightOnly) {
        if (priceVal <= 0) {
          toast.error(`Selling price is mandatory for Mono/Color consumables.`);
          setTab("Machine");
          return false;
        }
      }

      // Outright Logic
      if (isOutright) {
        if (isMachine && priceVal <= 0) {
          toast.error(`Missing Selling Price for Outright Machine.`);
          setTab("Machine");
          return false;
        }
        if (!isMachine && isMonoColor && priceVal <= 0) {
          toast.error(`Selling Price required for Outright Consumables.`);
          setTab("Machine");
          return false;
        }
      }
    }

    // --- 2. FEE VALIDATION ---
    const companyFees = projectData?.additionalFees?.company || [];
    const customerFees = projectData?.additionalFees?.customer || [];
    const allFees = [...companyFees, ...customerFees];

    // Validation: Rental lines MUST have Unit Cost
    if (isRental || isFixed) {
      const hasRentalFee = allFees.some((f) => {
        const category = String(f.category || "").toLowerCase();
        const label = String(f.label || "").toLowerCase();
        const cost = parseFloat(f.cost || 0);

        return (category.includes('rental') || label.includes('rental')) && cost > 0;
      });

      if (!hasRentalFee) {
        toast.error("Rental Fee cost required.");
        setTab("Machine");
        return false;
      }
    }

    // Validation: Click contracts MUST have at least one Click fee with Cost
    if (isClick) {
      const clickFees = allFees.filter((f) => {
        const type = String(f.type || "").toLowerCase();
        const label = String(f.label || "").toLowerCase();
        const category = String(f.category || "").toLowerCase();

        return type.includes("click") || label.includes("click") || category.includes("click");
      });

      const hasValidClickCost = clickFees.some((f) => {
        const cost = parseFloat(f.cost);
        return !isNaN(cost) && cost > 0;
      });

      if (clickFees.length === 0 || !hasValidClickCost) {
        toast.error("At least one Click fee must have a valid Unit Cost.");
        setTab("Machine");
        return false;
      }
    }

    setShowOutrightErrors(false);
    return true;
  };

  const validateOutrightFields = () => {
    const ci = projectData?.companyInfo ?? {};
    const isOutright = String(ci.contractType ?? "").toLowerCase().includes("outright");

    if (isOutright) {
      const machines = projectData?.machineConfiguration?.machine || [];
      const hasInvalidMachine = machines.some((m) => {
        const price = parseFloat(m.price || 0);
        return price <= 0 || yields <= 0;
      });

      if (hasInvalidMachine) {
        toast.error("Outright contracts require a Selling Price for all machines.");
        setShowOutrightErrors(true);
        setTab("Machine");
        return false;
      }
    }

    setShowOutrightErrors(false);
    return true;
  };

  const requiresEntryRemarks = () => {
    const monoMonthly = Number(projectData?.yield?.monoAmvpYields?.monthly || 0);
    const colorMonthly = Number(projectData?.yield?.colorAmvpYields?.monthly || 0);

    return monoMonthly > 5000 || colorMonthly > 2500;
  };

  const hasValidEntryRemarks = () => {
    return String(projectData?.entryRemarks?.remarks ?? "").trim().length > 0;
  };

  const hasRequiredEntryRemarkAttachment = () => {
    const attachments = projectData?.entryRemarks?.attachments;
    return Array.isArray(attachments) && attachments.length > 0;
  };

  const validateEntryRemarks = () => {
    if (!requiresEntryRemarks()) {
      return true;
    }

    if (!hasValidEntryRemarks()) {
      toast.error(
        "Remarks required if Mono AMVP exceeds 5,000 or Color AMVP exceeds 2,500."
      );
      setTab("Machine");
      return false;
    }

    if (!hasRequiredEntryRemarkAttachment()) {
      toast.error("At least one attachment required.");
      setTab("Machine");
      return false;
    }

    return true;
  };

  return {
    showOutrightErrors,
    setShowOutrightErrors,
    isCompanyInfoValid,
    validateBusinessLogic,
    validateOutrightFields,
    validateEntryRemarks,
  };
}