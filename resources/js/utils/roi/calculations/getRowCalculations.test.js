// resources/js/Utils/getRowCalculations.test.js

import { describe, it, expect } from "vitest";
import { getRowCalculations } from "../../roi/calculations/getRowCalculations";

const baseProjectData = {
  interest: {
    annualInterest: 10,
  },
  companyInfo: {
    contractYears: 5,
  },
};

describe("OUTRIGHT", () => {
  it("allows machine selling price", () => {
    const result = getRowCalculations(
      {
        type: "Machine",
        cost: 100000,
        qty: 1,
        price: 120000,
        yields: 50000,
      },
      {
        ...baseProjectData,
        companyInfo: {
          ...baseProjectData.companyInfo,
          contractType: "Outright",
        },
      }
    );

    expect(result.price).toBe(120000);
    expect(result.yields).toBe(0);
  });

  it("allows consumable selling price", () => {
    const result = getRowCalculations(
      {
        type: "Supply",
        mode: "Mono",
        cost: 1000,
        qty: 1,
        price: 5,
        yields: 10000,
      },
      {
        ...baseProjectData,
        companyInfo: {
          ...baseProjectData.companyInfo,
          contractType: "Outright",
        },
      }
    );

    expect(result.price).toBe(5);
    expect(result.yields).toBe(10000);
  });
});

describe("RENTAL + CLICK", () => {
  it("forces consumable price to zero", () => {
    const result = getRowCalculations(
      {
        type: "Supply",
        mode: "Mono",
        cost: 1000,
        qty: 1,
        price: 5,
        yields: 10000,
      },
      {
        ...baseProjectData,
        companyInfo: {
          ...baseProjectData.companyInfo,
          contractType: "Rental + Click",
        },
      }
    );

    expect(result.price).toBe(0);
    expect(result.yields).toBe(10000);
  });

  it("forces machine yields to zero", () => {
    const result = getRowCalculations(
      {
        type: "Machine",
        cost: 100000,
        qty: 1,
        price: 120000,
        yields: 50000,
      },
      {
        ...baseProjectData,
        companyInfo: {
          ...baseProjectData.companyInfo,
          contractType: "Rental + Click",
        },
      }
    );

    expect(result.yields).toBe(0);
  });
});

describe("FREE USE + CLICK", () => {
  it("forces consumable price to zero", () => {
    const result = getRowCalculations(
      {
        type: "Supply",
        mode: "Color",
        cost: 1000,
        qty: 1,
        price: 10,
        yields: 10000,
      },
      {
        ...baseProjectData,
        companyInfo: {
          ...baseProjectData.companyInfo,
          contractType: "Free Use + Click",
        },
      }
    );

    expect(result.price).toBe(0);
    expect(result.yields).toBe(10000);
  });

  it("forces machine yields to zero", () => {
    const result = getRowCalculations(
      {
        type: "Machine",
        cost: 100000,
        qty: 1,
        price: 120000,
        yields: 50000,
      },
      {
        ...baseProjectData,
        companyInfo: {
          ...baseProjectData.companyInfo,
          contractType: "Free Use + Click",
        },
      }
    );

    expect(result.yields).toBe(0);
  });
});

describe("NON-OUTRIGHT", () => {
  it("forces machine selling price to zero", () => {
    const result = getRowCalculations(
      {
        type: "Machine",
        cost: 100000,
        qty: 1,
        price: 120000,
      },
      {
        ...baseProjectData,
        companyInfo: {
          ...baseProjectData.companyInfo,
          contractType: "Non-Outright",
        },
      }
    );

    expect(result.price).toBe(0);
  });

  it("allows consumable selling price", () => {
    const result = getRowCalculations(
      {
        type: "Supply",
        mode: "Mono",
        cost: 1000,
        qty: 1,
        price: 5,
        yields: 10000,
      },
      {
        ...baseProjectData,
        companyInfo: {
          ...baseProjectData.companyInfo,
          contractType: "Non-Outright",
        },
      }
    );

    expect(result.price).toBe(5);
  });
});

describe("FIXED MONTHLY ONLY", () => {
  it("forces mono consumable price and yields to zero", () => {
    const result = getRowCalculations(
      {
        type: "Supply",
        mode: "Mono",
        cost: 1000,
        qty: 1,
        price: 5,
        yields: 10000,
      },
      {
        ...baseProjectData,
        companyInfo: {
          ...baseProjectData.companyInfo,
          contractType: "Fixed Monthly Only",
        },
      }
    );

    expect(result.price).toBe(0);
    expect(result.yields).toBe(0);
    expect(result.costCpp).toBe(0);
    expect(result.sellCpp).toBe(0);
  });

  it("forces color consumable price and yields to zero", () => {
    const result = getRowCalculations(
      {
        type: "Supply",
        mode: "Color",
        cost: 1000,
        qty: 1,
        price: 10,
        yields: 5000,
      },
      {
        ...baseProjectData,
        companyInfo: {
          ...baseProjectData.companyInfo,
          contractType: "Fixed Monthly Only",
        },
      }
    );

    expect(result.price).toBe(0);
    expect(result.yields).toBe(0);
  });

  it("forces machine price to zero because it is not outright", () => {
    const result = getRowCalculations(
      {
        type: "Machine",
        cost: 100000,
        qty: 1,
        price: 120000,
      },
      {
        ...baseProjectData,
        companyInfo: {
          ...baseProjectData.companyInfo,
          contractType: "Fixed Monthly Only",
        },
      }
    );

    expect(result.price).toBe(0);
  });
});

describe("SPECIAL CASES", () => {
  it("machine with Others mode keeps yields", () => {
    const result = getRowCalculations(
      {
        type: "Machine",
        mode: "Others",
        cost: 50000,
        qty: 1,
        yields: 1000,
        price: 0,
      },
      {
        ...baseProjectData,
        companyInfo: {
          ...baseProjectData.companyInfo,
          contractType: "Outright",
        },
      }
    );

    expect(result.yields).toBe(1000);
    expect(result.machineMargin).toBe(0);
    expect(result.machineMarginTotal).toBe(0);
  });

  it("calculates machine interest correctly", () => {
    const result = getRowCalculations(
      {
        type: "Machine",
        cost: 100000,
        qty: 1,
      },
      {
        interest: {
          annualInterest: 10,
        },
        companyInfo: {
          contractYears: 5,
          contractType: "Outright",
        },
      }
    );

    expect(result.computedCost).toBe(110000);
  });

  it("prevents division by zero", () => {
    const result = getRowCalculations(
      {
        type: "Supply",
        mode: "Mono",
        cost: 1000,
        qty: 1,
        yields: 0,
        price: 5,
      },
      {
        ...baseProjectData,
        companyInfo: {
          ...baseProjectData.companyInfo,
          contractType: "Outright",
        },
      }
    );

    expect(result.costCpp).toBe(0);
    expect(result.sellCpp).toBe(0);
  });
});