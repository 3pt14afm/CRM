import { useCallback, useState } from "react";
import { router } from "@inertiajs/react";
import { INITIAL_EDIT_FORM } from "../constants";
import { buildEditFormFromUser } from "../helpers";

export default function useEditUserModal() {
  const [showEditModal, setShowEditModal] = useState(false);
  const [editProcessing, setEditProcessing] = useState(false);
  const [editErrors, setEditErrors] = useState({});
  const [editingUser, setEditingUser] = useState(null);
  const [editForm, setEditForm] = useState(INITIAL_EDIT_FORM);

  const resetEditModalState = useCallback(() => {
    setEditingUser(null);
    setEditErrors({});
    setEditForm(INITIAL_EDIT_FORM);
  }, []);

  const closeEditModal = useCallback(() => {
    if (editProcessing) return;
    setShowEditModal(false);
    resetEditModalState();
  }, [editProcessing, resetEditModalState]);

  const finishEditSuccess = useCallback(() => {
    router.reload({ only: ["users", "stats"] });
    setEditProcessing(false);
    setShowEditModal(false);
    resetEditModalState();
  }, [resetEditModalState]);

  const openEditModal = useCallback((u) => {
    setEditErrors({});
    setEditProcessing(false);
    setEditingUser(u);
    setEditForm(buildEditFormFromUser(u));
    setShowEditModal(true);
  }, []);

  const submitEdit = useCallback((e) => {
    e.preventDefault();
    if (!editingUser?.id) return;

    setEditProcessing(true);
    setEditErrors({});

    const payload = {
      first_name: editForm.first_name,
      last_name: editForm.last_name,
      employee_id: Number(editForm.employee_id),
      position: editForm.position,
      email: editForm.email,
      primary_location_id: Number(editForm.primary_location_id),
      password: editForm.password ? editForm.password : null,
    };

    router.put(route("admin.users.update", editingUser.id), payload, {
      preserveScroll: true,
      onSuccess: () => {
        const shouldBan = Boolean(editForm.is_banned);
        const currentlyBanned = Boolean(editingUser?.is_banned);

        if (shouldBan !== currentlyBanned) {
          const r = shouldBan
            ? route("admin.users.ban", editingUser.id)
            : route("admin.users.unban", editingUser.id);

          router.patch(
            r,
            {},
            {
              preserveScroll: true,
              onSuccess: () => {
                finishEditSuccess();
              },
              onError: (errors) => {
                setEditErrors(errors || {});
                setEditProcessing(false);
              },
            }
          );
        } else {
          finishEditSuccess();
        }
      },
      onError: (errors) => {
        setEditErrors(errors || {});
        setEditProcessing(false);
      },
      onFinish: () => {},
    });
  }, [editForm, editingUser, finishEditSuccess]);

  return {
    showEditModal,
    editProcessing,
    editErrors,
    editingUser,
    editForm,
    setEditForm,
    openEditModal,
    closeEditModal,
    submitEdit,
  };
}