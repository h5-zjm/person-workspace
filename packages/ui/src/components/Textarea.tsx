import type { TextareaHTMLAttributes } from "react";
import { cx } from "./cx";

export type TextareaProps = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "style"> & {
  label?: string;
  hint?: string;
  error?: string;
  style?: never;
};

export function Textarea({ className, error, hint, id, label, "aria-describedby": describedBy, ...props }: TextareaProps) {
  const textareaId = id ?? props.name;
  const hintId = hint && textareaId ? `${textareaId}-hint` : undefined;
  const errorId = error && textareaId ? `${textareaId}-error` : undefined;
  const descriptionIds = [describedBy, hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <label className="ui-field">
      {label ? <span className="ui-field__label">{label}</span> : null}
      <textarea
        aria-describedby={descriptionIds}
        aria-invalid={error ? true : undefined}
        className={cx("ui-textarea", error && "ui-textarea--invalid", className)}
        id={textareaId}
        {...props}
      />
      {hint ? (
        <span className="ui-field__hint" id={hintId}>
          {hint}
        </span>
      ) : null}
      {error ? (
        <span className="ui-field__error" id={errorId}>
          {error}
        </span>
      ) : null}
    </label>
  );
}
