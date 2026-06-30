import { useState } from 'react';
import { useProjectData } from '@/Context/ProjectContext';
import { toast } from 'sonner';

const MACHINE_TAB = "Machine";

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

  // -------------------------------------------------------------------------
  // CONTRACT TYPE FLAGS
  // -------------------------------------------------------------------------

  const getContractFlags = () => {
    const contractType = String(
      projectData?.companyInfo?.contractType ?? ""
    ).toLowerCase();

    return {
      contractType,
      isOutright       : contractType.includes("outright"),
      isOutrightOnly   : contractType === "outright only",
      isRentalClick    : contractType.includes("rental + click"),
      isFreeUseClick   : contractType.includes("free use + click"),
      isClick          : contractType.includes("click"),
      isFixed          : contractType === "fixed monthly only",
      // Explicit rental match — avoids catching "rental + click" etc.
      isRental         : contractType.includes("rental"),
    };
  };

  // -------------------------------------------------------------------------
  // isCompanyInfoValid
  // -------------------------------------------------------------------------

  const isCompanyInfoValid = () => {
    const ci = projectData?.companyInfo ?? {};
    const nameOk  = String(ci.companyName  ?? "").trim().length > 0;
    const typeOk  = String(ci.contractType ?? "").trim().length > 0;
    const years   = Number(ci.contractYears);
    const yearsOk = Number.isFinite(years) && years > 0;

    return nameOk && typeOk && yearsOk;
  };

  // -------------------------------------------------------------------------
  // validateBusinessLogic
  // -------------------------------------------------------------------------

  const validateBusinessLogic = () => {
    const {
      isOutright,
      isOutrightOnly,
      isRentalClick,
      isFreeUseClick,
      isClick,
      isFixed,
      isRental,
    } = getContractFlags();




    const machines    = projectData?.machineConfiguration?.machine    || [];
    const consumables = projectData?.machineConfiguration?.consumable || [];
    const allItems    = [...machines, ...consumables];

    const monoAMVP  = parseFloat(projectData?.yield?.monoAmvpYields?.monthly  || 0);
    const colorAMVP = parseFloat(projectData?.yield?.colorAmvpYields?.monthly || 0);



    // AMVP required unless Outright Only or Fixed Monthly
    if (!isOutrightOnly && !isFixed) {
      if (monoAMVP <= 0 && colorAMVP <= 0) {
        toast.error("At least one Monthly AMVP (Mono or Color) must be greater than zero.");
        return false;
      }
    }

    // --- ITEM VALIDATION LOOP ---
    for (const item of allItems) {
      const itemLabel   = item.name || item.label || "an item";
      const costVal     = parseFloat(item.cost   || 0);
      const yieldVal    = parseFloat(item.yields || 0);
      const priceVal    = parseFloat(item.price  || 0);
      const isMachine   = item.type === "machine";
      const isMonoColor = item.mode === "mono" || item.mode === "color";

      // 1. Unit Cost is always required
      if (costVal <= 0) {
        toast.error(`Unit Cost is mandatory for "${itemLabel}".`);
        setTab(MACHINE_TAB);
        return false;
      }

      // 2. Machines may only have yields if mode is "others"
      if (isMachine && item.mode !== "others" && yieldVal > 0) {
        toast.error(`Yields cannot be set for machine "${itemLabel}" unless mode is 'Others'.`);
        setTab(MACHINE_TAB);
        return false;
      }

      // 3. Mono/Color consumables require yields (except Fixed / Outright Only)
      if (!isMachine && isMonoColor && !isFixed && !isOutrightOnly && yieldVal <= 0) {
        toast.error(`Yields are mandatory for consumable "${itemLabel}".`);
        setTab(MACHINE_TAB);
        return false;
      }

      // 4. Selling price checks — evaluated once per item to avoid duplicate toasts

      if (isMachine) {
        // Outright machines always need a sell price
        if (isOutright && priceVal <= 0) {
          toast.error(`Selling Price is required for outright machine "${itemLabel}".`);
          setTab(MACHINE_TAB);
          return false;
        }
      } else {
        // Consumable sell price rules
        const isClickConsumable  = isRentalClick || isFreeUseClick || isClick;
        const skipSellPrice      = isFixed || isOutrightOnly || isClickConsumable;

        if (!skipSellPrice && isMonoColor && priceVal <= 0) {
          toast.error(`Selling Price is required for consumable "${itemLabel}".`);
          setTab(MACHINE_TAB);
          return false;
        }

        if (isOutright && !isClickConsumable && priceVal <= 0) {
          toast.error(`Selling Price is required for outright consumable "${itemLabel}".`);
          setTab(MACHINE_TAB);
          return false;
        }
      }
    }

            // --- MANDATORY PRINTER ROW VALIDATION ---
      const mandatoryPrinter = machines.find((m) => m.id === '__mandatory_printer__');
      if (!mandatoryPrinter || !String(mandatoryPrinter.sku ?? '').trim()) {
        toast.error("A printer is required. Please select a printer in the Machine Configuration.");
        setTab(MACHINE_TAB);
        return false;
      }
      if (parseFloat(mandatoryPrinter.cost ?? 0) <= 0) {
        toast.error("The mandatory printer must have a Unit Cost.");
        setTab(MACHINE_TAB);
        return false;
      }

    // --- FEE VALIDATION ---
    const companyFees  = projectData?.additionalFees?.company  || [];
    const customerFees = projectData?.additionalFees?.customer || [];
    const allFees      = [...companyFees, ...customerFees];

    // Rental contracts must have at least one rental fee with a cost
    if (isRental || isFixed) {
      const hasRentalFee = allFees.some((f) => {
        const category = String(f.category || "").toLowerCase();
        const label    = String(f.label    || "").toLowerCase();
        const cost     = parseFloat(f.cost || 0);
        return (category.includes("rental") || label.includes("rental")) && cost > 0;
      });

      if (!hasRentalFee) {
        toast.error("A Rental Fee with a valid Unit Cost is required.");
        setTab(MACHINE_TAB);
        return false;
      }
    }

    // Click contracts must have at least one click fee with a cost
    if (isClick) {
      const clickFees = allFees.filter((f) => {
        const type     = String(f.type     || "").toLowerCase();
        const label    = String(f.label    || "").toLowerCase();
        const category = String(f.category || "").toLowerCase();
        return type.includes("click") || label.includes("click") || category.includes("click");
      });

      const hasValidClickCost = clickFees.some((f) => {
        const cost = parseFloat(f.cost);
        return !isNaN(cost) && cost > 0;
      });

      if (clickFees.length === 0 || !hasValidClickCost) {
        toast.error("At least one Click fee must have a valid Unit Cost.");
        setTab(MACHINE_TAB);
        return false;
      }
    }

    setShowOutrightErrors(false);
    return true;
  };

  // -------------------------------------------------------------------------
  // validateOutrightFields
  // Lightweight secondary check used to drive inline field highlighting.
  // Full price validation is already done in validateBusinessLogic — this
  // only manages the showOutrightErrors UI flag.
  // -------------------------------------------------------------------------

  const validateOutrightFields = () => {
    const { isOutright } = getContractFlags();

    if (!isOutright) {
      setShowOutrightErrors(false);
      return true;
    }

    const machines = projectData?.machineConfiguration?.machine || [];
    const hasInvalidMachine = machines.some((m) => {
      const price = parseFloat(m.price || 0);
      return price <= 0;
    });

    if (hasInvalidMachine) {
      setShowOutrightErrors(true);
      setTab(MACHINE_TAB);
      return false;
    }

    setShowOutrightErrors(false);
    return true;
  };

  // -------------------------------------------------------------------------
  // validateEntryRemarks
  // -------------------------------------------------------------------------

  const requiresEntryRemarks = () => {
    const monoMonthly  = Number(projectData?.yield?.monoAmvpYields?.monthly  || 0);
    const colorMonthly = Number(projectData?.yield?.colorAmvpYields?.monthly || 0);
    return monoMonthly > 4000 || colorMonthly > 2000;
  };

  const hasValidEntryRemarks = () =>
    String(projectData?.entryRemarks?.remarks ?? "").trim().length > 0;

  const hasRequiredEntryRemarkAttachment = () => {
    const attachments = projectData?.entryRemarks?.attachments;
    return Array.isArray(attachments) && attachments.length > 0;
  };

  const validateEntryRemarks = () => {
    if (!requiresEntryRemarks()) return true;

    if (!hasValidEntryRemarks()) {
      toast.error("Remarks are required when Mono AMVP exceeds 5,000 or Color AMVP exceeds 2,500.");
      setTab(MACHINE_TAB);
      return false;
    }

    if (!hasRequiredEntryRemarkAttachment()) {
      toast.error("At least one attachment is required.");
      setTab(MACHINE_TAB);
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