import { getAttachmentFileObject } from '@/Components/roi/Entry/EntryRemarks';

// Pure validation checks, extracted from useEntryValidation.jsx so the same
// logic can run once (single-entry form) or in a loop over groupData.entries
// (group form). No React/toast/tab dependencies — each function returns
// { valid, message?, tab?, modeError? } instead of toasting/setting state
// directly; the calling hook decides what to do on failure.

const MACHINE_TAB = "Machine";

export function getContractFlags(rawContractType) {
  const contractType = String(rawContractType ?? "").toLowerCase();

  return {
    contractType,
    isOutright: contractType.includes("outright"),
    isOutrightOnly: contractType === "outright only (1 year)",
    isRentalClick: contractType.includes("rental + click"),
    isFreeUseClick: contractType.includes("free use + click"),
    isClick: contractType.includes("click"),
    isFixed: contractType === "fixed monthly only",
    isRental: contractType.includes("rental"),
  };
}

export function checkCompanyInfoValid(companyInfo = {}) {
  const nameOk = String(companyInfo.companyName ?? "").trim().length > 0;
  const typeOk = String(companyInfo.contractType ?? "").trim().length > 0;
  const years = Number(companyInfo.contractYears);
  const yearsOk = Number.isFinite(years) && years > 0;
  return nameOk && typeOk && yearsOk;
}

/**
 * @param {object} entry - shape: { companyInfo, machineConfiguration, yield, additionalFees }
 * @returns {{ valid: boolean, message?: string, tab?: string, modeError?: boolean }}
 */
export function checkBusinessLogic(entry) {
  const { isOutright, isOutrightOnly, isRentalClick, isFreeUseClick, isClick, isFixed, isRental } =
    getContractFlags(entry?.companyInfo?.contractType);

  const machines = entry?.machineConfiguration?.machine || [];
  const consumables = entry?.machineConfiguration?.consumable || [];
  const allItems = [...machines, ...consumables];

  const monoAMVP = parseFloat(entry?.yield?.monoAmvpYields?.monthly || 0);
  const colorAMVP = parseFloat(entry?.yield?.colorAmvpYields?.monthly || 0);

  // AMVP required unless Outright Only or Fixed Monthly
  if (!isOutrightOnly && !isFixed) {
    if (monoAMVP <= 0 && colorAMVP <= 0) {
      return {
        valid: false,
        message: "At least one Monthly AMVP (Mono or Color) must be greater than zero.",
        tab: MACHINE_TAB,
      };
    }
  }

  // --- ITEM VALIDATION LOOP ---
  for (const item of allItems) {
    const itemLabel = item.name || item.label || "an item";
    const costVal = parseFloat(item.cost || 0);
    const yieldVal = parseFloat(item.yields || 0);
    const priceVal = parseFloat(item.price || 0);
    const isMachine = item.type === "machine";
    const isMonoColor = item.mode === "mono" || item.mode === "color";

    // 1. Type (Mono/Color/Others) is mandatory for every non-machine row.
    if (!isMachine && !String(item.mode || "").trim()) {
      return {
        valid: false,
        message: `Please select a Type (Mono/Color/Others)`,
        tab: MACHINE_TAB,
        modeError: true,
      };
    }

    // 2. Unit Cost is always required
    if (costVal <= 0) {
      return { valid: false, message: `Unit Cost is mandatory for "${itemLabel}".`, tab: MACHINE_TAB };
    }

    // 3. Machines may only have yields if mode is "others"
    if (isMachine && item.mode !== "others" && yieldVal > 0) {
      return {
        valid: false,
        message: `Yields cannot be set for machine "${itemLabel}" unless mode is 'Others'.`,
        tab: MACHINE_TAB,
      };
    }

    // 4. Mono/Color consumables require yields (except Fixed / Outright Only)
    if (!isMachine && isMonoColor && !isFixed && !isOutrightOnly && yieldVal <= 0) {
      return { valid: false, message: `Yields are mandatory for consumable "${itemLabel}".`, tab: MACHINE_TAB };
    }

    // 5. Selling price checks
    if (isMachine) {
      if (isOutright && priceVal <= 0) {
        return {
          valid: false,
          message: `Selling Price is required for outright machine "${itemLabel}".`,
          tab: MACHINE_TAB,
        };
      }
    } else {
      const isClickConsumable = isRentalClick || isFreeUseClick || isClick;
      const skipSellPrice = isFixed || isOutrightOnly || isClickConsumable;

      if (!skipSellPrice && isMonoColor && priceVal <= 0) {
        return {
          valid: false,
          message: `Selling Price is required for consumable "${itemLabel}".`,
          tab: MACHINE_TAB,
        };
      }

      if (isOutright && !isClickConsumable && priceVal <= 0) {
        return {
          valid: false,
          message: `Selling Price is required for outright consumable "${itemLabel}".`,
          tab: MACHINE_TAB,
        };
      }
    }
  }

  // --- MANDATORY PRINTER ROW VALIDATION ---
  if (!isOutrightOnly) {
    const mandatoryPrinter = machines.find((m) => m.id === "__mandatory_printer__");
    if (!mandatoryPrinter || !String(mandatoryPrinter.sku ?? "").trim()) {
      return {
        valid: false,
        message: "A printer is required. Please select a printer in the Machine Configuration.",
        tab: MACHINE_TAB,
      };
    }
    if (parseFloat(mandatoryPrinter.cost ?? 0) <= 0) {
      return { valid: false, message: "The mandatory printer must have a Unit Cost.", tab: MACHINE_TAB };
    }
  }

  // --- FEE VALIDATION ---
  const companyFees = entry?.additionalFees?.company || [];
  const customerFees = entry?.additionalFees?.customer || [];
  const allFees = [...companyFees, ...customerFees];

  if (isRental || isFixed) {
    const hasRentalFee = allFees.some((f) => {
      const category = String(f.category || "").toLowerCase();
      const label = String(f.label || "").toLowerCase();
      const cost = parseFloat(f.cost || 0);
      return (category.includes("rental") || label.includes("rental")) && cost > 0;
    });
    if (!hasRentalFee) {
      return { valid: false, message: "A Rental Fee with a valid Unit Cost is required.", tab: MACHINE_TAB };
    }
  }

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
      return { valid: false, message: "At least one Click fee must have a valid Unit Cost.", tab: MACHINE_TAB };
    }
  }

  return { valid: true };
}

export function checkOutrightFields(entry) {
  const { isOutright } = getContractFlags(entry?.companyInfo?.contractType);
  if (!isOutright) return { valid: true };

  const machines = entry?.machineConfiguration?.machine || [];
  const hasInvalidMachine = machines.some((m) => parseFloat(m.price || 0) <= 0);

  if (hasInvalidMachine) return { valid: false, tab: MACHINE_TAB };
  return { valid: true };
}

export function checkEntryRemarks(entry) {
  const monoMonthly = Number(entry?.yield?.monoAmvpYields?.monthly || 0);
  const colorMonthly = Number(entry?.yield?.colorAmvpYields?.monthly || 0);

  if (monoMonthly > 4000 || colorMonthly > 2000) {
    const attachments = entry?.entryRemarks?.attachments || [];
    const hasValidAttachment = attachments.some(
      (att) => getAttachmentFileObject(att) || att.path || att.url
    );

    if (!hasValidAttachment) {
      return {
        valid: false,
        message:
          "At least one attachment is required when Mono AMPV is more than 4,000 or Color AMVP is more than 2,000.",
      };
    }
  }
  return { valid: true };
}