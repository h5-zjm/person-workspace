import type { FormHTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

export type FormProps = Omit<FormHTMLAttributes<HTMLFormElement>, "style"> & {
  children: ReactNode;
  title?: string;
  description?: string;
  style?: never;
};

export type FormFieldProps = {
  children: ReactNode;
  className?: string;
};

export type FormActionsProps = {
  children: ReactNode;
  className?: string;
};

export function Form({ children, className, description, title, ...props }: FormProps) {
  return (
    <form className={cx("ui-form", className)} {...props}>
      {title || description ? (
        <div className="ui-form__header">
          {title ? <h2 className="ui-form__title">{title}</h2> : null}
          {description ? <p className="ui-form__description">{description}</p> : null}
        </div>
      ) : null}
      {children}
    </form>
  );
}

export function FormField({ children, className }: FormFieldProps) {
  return <div className={cx("ui-form__field", className)}>{children}</div>;
}

export function FormActions({ children, className }: FormActionsProps) {
  return <div className={cx("ui-form__actions", className)}>{children}</div>;
}
