import React, { useMemo } from "react";

const ROLE_LABELS = {
  DIRECTOR_CUSTOMER_ENGAGEMENT: "Director - Customer Engagement",
  ESD_DIRECTOR: "ESD Director",
  VP_CCTO: "VP & CCTO",
  PRESIDENT_CEO: "President & CEO",
};

const ROLES_BY_CONDITION = {
  STANDARD_PRICING: [
    "DIRECTOR_CUSTOMER_ENGAGEMENT",
    "ESD_DIRECTOR",
  ],
  VALUE_GT_1M: [
    "DIRECTOR_CUSTOMER_ENGAGEMENT",
    "ESD_DIRECTOR",
    "VP_CCTO",
  ],
  GP_GT_15: [
    "DIRECTOR_CUSTOMER_ENGAGEMENT",
    "ESD_DIRECTOR",
    "VP_CCTO",
  ],
  GP_LTE_15: [
    "DIRECTOR_CUSTOMER_ENGAGEMENT",
    "ESD_DIRECTOR",
    "VP_CCTO",
    "PRESIDENT_CEO",
  ],
  REBATE_REQUEST: [
    "DIRECTOR_CUSTOMER_ENGAGEMENT",
    "ESD_DIRECTOR",
    "VP_CCTO",
    "PRESIDENT_CEO",
  ],
};

function buildSteps(conditionCode) {
  const roles =
    ROLES_BY_CONDITION[conditionCode] ??
    ROLES_BY_CONDITION.STANDARD_PRICING;

  return roles.map((role, index) => ({
    role,
    sequence: index + 1,
    position_id: "",
    approver_user_id: "",
  }));
}

export { buildSteps as buildSprfMatrixSteps };

export default function NewSprfApproverMatrixModal({
  show,
  onClose,
  processing,
  form,
  setForm,
  onSubmit,
  sprfConditions = [],
  positions = [],
  users = [],
}) {
  const selectedCondition = form?.condition_code || "STANDARD_PRICING";

  const selectedRoles = useMemo(() => {
    return (
      ROLES_BY_CONDITION[selectedCondition] ??
      ROLES_BY_CONDITION.STANDARD_PRICING
    );
  }, [selectedCondition]);

  const getUsersByPosition = (positionId) => {
    if (!positionId) return [];

    return users.filter(
      (user) => String(user.company_position_id ?? "") === String(positionId)
    );
  };

  const updateCondition = (conditionCode) => {
    setForm((prev) => ({
      ...prev,
      condition_code: conditionCode,
      steps: buildSteps(conditionCode),
    }));
  };

  const updateStep = (index, changes) => {
    setForm((prev) => {
      const nextSteps = [...(prev.steps ?? [])];
      const current = nextSteps[index] ?? {};

      const updated = {
        ...current,
        ...changes,
      };

      if (Object.prototype.hasOwnProperty.call(changes, "position_id")) {
        updated.approver_user_id = "";
      }

      nextSteps[index] = updated;

      return {
        ...prev,
        steps: nextSteps,
      };
    });
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/35"
        onClick={processing ? undefined : onClose}
      />

      <div className="relative w-[94%] max-w-4xl bg-white rounded-2xl shadow-xl border border-black/10 overflow-hidden">
        <form onSubmit={onSubmit}>
          <div className="px-8 pt-7 pb-4 border-b border-slate-200">
            <h2 className="text-xl font-extrabold tracking-wide text-slate-900">
              New SPRF Approver Matrix
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Configure approval routing per SPRF condition.
            </p>
          </div>

          <div className="px-8 py-6 space-y-5 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-700">
                  Condition
                </span>
                <select
                  value={selectedCondition}
                  onChange={(e) => updateCondition(e.target.value)}
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B5EBA2]"
                  disabled={processing}
                  required
                >
                  {sprfConditions.map((condition) => (
                    <option key={condition.code} value={condition.code}>
                      {condition.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-slate-700">
                  Remarks
                </span>
                <input
                  type="text"
                  value={form.remarks ?? ""}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      remarks: e.target.value,
                    }))
                  }
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B5EBA2]"
                  placeholder="Optional"
                  disabled={processing}
                />
              </label>
            </div>

            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-[#efeff4] px-4 py-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Approval Steps
                </p>
              </div>

              <div className="divide-y divide-slate-100">
                {selectedRoles.map((role, index) => {
                  const step = form.steps?.[index] ?? {};
                  const positionUsers = getUsersByPosition(step.position_id);

                  return (
                    <div
                      key={role}
                      className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-3 items-end"
                    >
                      <div className="lg:col-span-4">
                        <p className="text-xs text-slate-500">
                          Step {index + 1}
                        </p>
                        <p className="text-sm font-semibold text-slate-900">
                          {ROLE_LABELS[role] ?? role}
                        </p>
                      </div>

                      <label className="lg:col-span-4 flex flex-col gap-1">
                        <span className="text-xs font-semibold text-slate-700">
                          Position
                        </span>
                        <select
                          value={step.position_id ?? ""}
                          onChange={(e) =>
                            updateStep(index, {
                              position_id: e.target.value,
                            })
                          }
                          className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B5EBA2]"
                          disabled={processing}
                          required
                        >
                          <option value="">Select position</option>
                          {positions.map((position) => (
                            <option key={position.id} value={position.id}>
                              {position.name}
                            </option>
                          ))}
                        </select>
                      </label>

                      <label className="lg:col-span-4 flex flex-col gap-1">
                        <span className="text-xs font-semibold text-slate-700">
                          User
                        </span>
                        <select
                          value={step.approver_user_id ?? ""}
                          onChange={(e) =>
                            updateStep(index, {
                              approver_user_id: e.target.value,
                            })
                          }
                          className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#B5EBA2]"
                          disabled={processing || !step.position_id}
                          required
                        >
                          <option value="">
                            {step.position_id
                              ? "Select user"
                              : "Select position first"}
                          </option>

                          {positionUsers.map((user) => (
                            <option key={user.id} value={user.id}>
                              {user.name}
                            </option>
                          ))}
                        </select>

                        {step.position_id && positionUsers.length === 0 && (
                          <span className="text-[11px] text-red-600">
                            No available user has this position.
                          </span>
                        )}
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="px-8 py-4 border-t border-slate-200 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={processing}
              className="px-5 py-2 rounded-xl bg-gray-200 hover:bg-gray-300 text-gray-900 font-semibold disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={processing}
              className="px-5 py-2 rounded-xl bg-darkgreen hover:bg-[#289800] text-white font-semibold shadow disabled:opacity-50"
            >
              {processing ? "Saving..." : "Save Matrix"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}