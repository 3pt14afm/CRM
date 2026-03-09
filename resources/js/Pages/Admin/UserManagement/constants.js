export const ROLE_OPTIONS = [
  { value: "user", label: "User" },
  { value: "preparer", label: "Preparer" },
  { value: "reviewer", label: "Reviewer" },
  { value: "checker", label: "Checker" },
  { value: "endorser", label: "Endorser" },
  { value: "confirmer", label: "Confirmer" },
  { value: "approver", label: "Approver" },
  { value: "admin", label: "Admin" },
];

export const INITIAL_ASSIGN_FORM = {
  first_name: "",
  last_name: "",
  employee_id: "",
  position: "",
  email: "",
  primary_location_id: "",
};

export const INITIAL_EDIT_FORM = {
  first_name: "",
  last_name: "",
  employee_id: "",
  position: "",
  email: "",
  password: "",
  primary_location_id: "",
  is_banned: false,
};