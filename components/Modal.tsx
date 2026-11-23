"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui";

// Хөтөчийн <dialog>: Esc товч, фокус цонх дотор үлдэх, ард нь бүдгэрэх зэрэг нь бэлэн ирдэг.
// Цонхыг харуулахдаа рендерлэнэ, хаахдаа onClose дотор state-ээ цэвэрлэнэ.
export function Modal({
  title,
  sub,
  onClose,
  size = "md",
  children,
}: {
  title: string;
  sub?: string;
  onClose: () => void;
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const width = size === "sm" ? "max-w-[400px]" : size === "lg" ? "max-w-[640px]" : "max-w-[540px]";

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) ref.current.close(); // ард нь дарахад хаана
      }}
      aria-labelledby="modal-title"
      className={`m-auto w-[calc(100%-32px)] ${width} rounded-[14px] bg-white p-0 text-ink backdrop:bg-zinc-900/45`}
    >
      <div className="px-5 pt-6 pb-5 sm:px-8">
        <div className="mb-5 flex items-start justify-between gap-3">
          <div>
            <h2 id="modal-title" className="text-[22px] font-bold">
              {title}
            </h2>
            {sub && <p className="mt-1 text-[13px] text-muted">{sub}</p>}
          </div>
          <button
            type="button"
            onClick={() => ref.current?.close()}
            aria-label="Хаах"
            className="-mt-1 px-1 text-[26px] leading-none text-muted hover:text-ink"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

/** Цонхны доод хэсэг: Болих + үндсэн товч. Үндсэн товч нь form-ийг submit хийнэ. */
export function ModalFooter({
  onCancel,
  submitLabel = "Хадгалах",
  variant = "primary",
  onSubmit,
}: {
  onCancel: () => void;
  submitLabel?: string;
  variant?: "primary" | "danger";
  onSubmit?: () => void;
}) {
  return (
    <div className="-mx-5 mt-6 flex justify-end gap-3 border-t border-soft px-5 pt-4 sm:-mx-8 sm:px-8">
      <Button type="button" variant="secondary" onClick={onCancel}>
        Болих
      </Button>
      <Button type={onSubmit ? "button" : "submit"} variant={variant} onClick={onSubmit}>
        {submitLabel}
      </Button>
    </div>
  );
}

/** Устгах зэрэг буцаах боломжгүй үйлдлийн өмнө асуух цонх. */
export function ConfirmDialog({
  title,
  text,
  confirmLabel = "Устгах",
  onConfirm,
  onClose,
}: {
  title: string;
  text: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return (
    <Modal title={title} onClose={onClose} size="sm">
      <p className="text-muted">{text}</p>
      <ModalFooter
        onCancel={onClose}
        submitLabel={confirmLabel}
        variant="danger"
        onSubmit={() => {
          onConfirm();
          onClose();
        }}
      />
    </Modal>
  );
}
