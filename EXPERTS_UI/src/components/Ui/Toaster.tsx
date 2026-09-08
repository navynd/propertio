import { useToast, type Toast as ToastModel } from "../../context/ToastContext";

const typeStyles: Record<ToastModel["type"], { border: string; title: string }> = {
  success: { border: "border-l-[#05A666]", title: "text-[#222]" },
  error: { border: "border-l-[#EA3934]", title: "text-[#222]" },
  info: { border: "border-l-[#0832AE]", title: "text-[#222]" },
};

function ToastItem({ toast }: { toast: ToastModel }) {
  const { remove } = useToast();
  const styles = typeStyles[toast.type];

  return (
    <div
      role="status"
      className={`w-[360px] max-w-[calc(100vw-32px)] rounded-[14px] border border-[rgba(34,34,34,0.12)] bg-white shadow-[0_10px_30px_rgba(0,0,0,0.12)] overflow-hidden border-l-4 ${styles.border}`}
    >
      <div className="flex items-start gap-[10px] p-[14px]">
        <div className="flex-1">
          <p className={`font-[Bold] text-[14px] leading-[1.25] ${styles.title}`}>
            {toast.title}
          </p>
          {toast.description ? (
            <p className="font-[Regular] text-[12px] text-[#707070] mt-[4px] leading-[1.35]">
              {toast.description}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => remove(toast.id)}
          aria-label="Close"
          className="cursor-pointer w-[28px] h-[28px] rounded-[10px] border border-[rgba(34,34,34,0.12)] bg-white flex items-center justify-center text-[#707070]"
        >
          ×
        </button>
      </div>
    </div>
  );
}

function Toaster() {
  const { toasts } = useToast();

  if (!toasts.length) return null;

  return (
    <div className="fixed top-[16px] right-[16px] z-[10050] flex flex-col gap-[10px]">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}

export default Toaster;
