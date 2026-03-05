import Modal from "@/Components/Modal";
import { IoCloseOutline } from "react-icons/io5";

export default function AdminFormModal({
  show,
  onClose,
  processing = false,
  title,
  maxWidth = "2xl",
  children,
}) {
  return (
    <Modal show={show} maxWidth={maxWidth} closeable={!processing} onClose={onClose}>
      <div className="p-5">
        <div className="flex items-center justify-between pb-3 border-b border-black/10">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
            aria-label="Close"
            disabled={processing}
          >
            <IoCloseOutline className="text-xl" />
          </button>
        </div>

        <div className="pt-4">{children}</div>
      </div>
    </Modal>
  );
}