import { useState } from "react";
import { router } from "@inertiajs/react";
import { INITIAL_ASSIGN_FORM } from "../constants";

export default function useAssignUserModal() {
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignProcessing, setAssignProcessing] = useState(false);
  const [assignErrors, setAssignErrors] = useState({});
  const [assignForm, setAssignForm] = useState(INITIAL_ASSIGN_FORM);

  const openAssignModal = () => {
    setAssignErrors({});
    setAssignProcessing(false);
    setAssignForm(INITIAL_ASSIGN_FORM);
    setShowAssignModal(true);
  };

  const closeAssignModal = () => {
    if (assignProcessing) return;
    setShowAssignModal(false);
    setAssignForm(INITIAL_ASSIGN_FORM);
    setAssignErrors({});
  };

  const submitAssign = (e) => {
    e.preventDefault();
    setAssignProcessing(true);
    setAssignErrors({});

    router.post(
      route("admin.users.assign-employee"),
      {
        first_name: assignForm.first_name,
        last_name: assignForm.last_name,
        employee_id: Number(assignForm.employee_id),
        department_id: Number(assignForm.department_id),
        department: assignForm.department,
        position: assignForm.position,
        email: assignForm.email,
        primary_location_id: Number(assignForm.primary_location_id),
      },
      {
        preserveScroll: true,
        onSuccess: () => {
          setAssignProcessing(false);
          setShowAssignModal(false);
          setAssignForm(INITIAL_ASSIGN_FORM);
        },
        onError: (errors) => {
          setAssignErrors(errors || {});
          setAssignProcessing(false);
        },
        onFinish: () => setAssignProcessing(false),
      }
    );
  };

  return {
    showAssignModal,
    assignProcessing,
    assignErrors,
    assignForm,
    setAssignForm,
    openAssignModal,
    closeAssignModal,
    submitAssign,
  };
}