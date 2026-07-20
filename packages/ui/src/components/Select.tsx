import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import { cx } from "./cx";

export type SelectOption = {
  label: string;
  value: string;
  disabled?: boolean;
};

export type SelectProps = {
  label?: string;
  hint?: string;
  error?: string;
  options: SelectOption[];
  placeholder?: string;
  value?: string;
  defaultValue?: string;
  name?: string;
  id?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  onValueChange?: (value: string, option: SelectOption) => void;
  "aria-describedby"?: string;
  style?: never;
};

export function Select({
  className,
  defaultValue = "",
  disabled = false,
  error,
  hint,
  id,
  label,
  name,
  onValueChange,
  options,
  placeholder = "请选择",
  required,
  value,
  "aria-describedby": describedBy
}: SelectProps) {
  const generatedId = useId();
  const selectId = id ?? `ui-select-${generatedId}`;
  const listboxId = `${selectId}-listbox`;
  const hintId = hint ? `${selectId}-hint` : undefined;
  const errorId = error ? `${selectId}-error` : undefined;
  const descriptionIds = [describedBy, hintId, errorId].filter(Boolean).join(" ") || undefined;
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [internalValue, setInternalValue] = useState(defaultValue);
  const currentValue = value ?? internalValue;
  const selectedOption = options.find((option) => option.value === currentValue);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [open]);

  function commit(option: SelectOption) {
    if (option.disabled) {
      return;
    }

    if (value === undefined) {
      setInternalValue(option.value);
    }

    onValueChange?.(option.value, option);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleTriggerKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (disabled) {
      return;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp" || event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setOpen(true);
    }

    if (event.key === "Escape") {
      setOpen(false);
    }
  }

  function handleOptionKeyDown(event: KeyboardEvent<HTMLButtonElement>, option: SelectOption) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      commit(option);
    }

    if (event.key === "Escape") {
      setOpen(false);
      triggerRef.current?.focus();
    }
  }

  return (
    <div className="ui-field">
      {label ? (
        <label className="ui-field__label" htmlFor={selectId}>
          {label}
        </label>
      ) : null}
      <div className={cx("ui-select", open && "ui-select--open", disabled && "ui-select--disabled", className)} ref={rootRef}>
        {name ? <input name={name} type="hidden" value={currentValue} /> : null}
        <button
          aria-controls={listboxId}
          aria-describedby={descriptionIds}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-invalid={error ? true : undefined}
          aria-required={required}
          className={cx("ui-select__trigger", error && "ui-select__trigger--invalid")}
          disabled={disabled}
          id={selectId}
          onClick={() => setOpen((nextOpen) => !nextOpen)}
          onKeyDown={handleTriggerKeyDown}
          ref={triggerRef}
          type="button"
        >
          <span className={cx("ui-select__value", !selectedOption && "ui-select__value--placeholder")}>
            {selectedOption?.label ?? placeholder}
          </span>
          <span aria-hidden="true" className="ui-select__chevron" />
        </button>
        {open ? (
          <div className="ui-select__menu" id={listboxId} role="listbox">
            {placeholder ? <div className="ui-select__placeholder">{placeholder}</div> : null}
            {options.map((option) => {
              const selected = option.value === currentValue;

              return (
                <button
                  aria-selected={selected}
                  className={cx(
                    "ui-select__option",
                    selected && "ui-select__option--selected",
                    option.disabled && "ui-select__option--disabled"
                  )}
                  disabled={option.disabled}
                  key={option.value}
                  onClick={() => commit(option)}
                  onKeyDown={(event) => handleOptionKeyDown(event, option)}
                  role="option"
                  type="button"
                >
                  {selected ? (
                    <span aria-hidden="true" className="ui-select__check">
                      ✓
                    </span>
                  ) : null}
                  <span className="ui-select__option-label">{option.label}</span>
                </button>
              );
            })}
          </div>
        ) : null}
      </div>
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
    </div>
  );
}
