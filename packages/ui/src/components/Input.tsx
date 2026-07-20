import type { InputHTMLAttributes } from "react";
import { cx } from "./cx";

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "style"> & {
  label?: string;
  hint?: string;
  error?: string;
  style?: never;
};

export function Input({ className, id, label, hint, error, "aria-describedby": describedBy, ...props }: InputProps) {
  const inputId = id ?? props.name;
  const hintId = hint && inputId ? `${inputId}-hint` : undefined;
  const errorId = error && inputId ? `${inputId}-error` : undefined;
  const descriptionIds = [describedBy, hintId, errorId].filter(Boolean).join(" ") || undefined;

  return (
    <label className="ui-field">
      {label ? <span className="ui-field__label">{label}</span> : null}
      <input
        aria-describedby={descriptionIds}
        aria-invalid={error ? true : undefined}
        className={cx("ui-input", error && "ui-input--invalid", className)}
        id={inputId}
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
