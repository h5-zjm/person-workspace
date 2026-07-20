import type { HTMLAttributes, ReactNode } from "react";
import { cx } from "./cx";

export type CardProps = Omit<HTMLAttributes<HTMLElement>, "style"> & {
  children: ReactNode;
  title?: string;
  description?: string;
  actions?: ReactNode;
  style?: never;
};

export function Card({ actions, children, className, description, title, ...props }: CardProps) {
  return (
    <section className={cx("ui-card", className)} {...props}>
      {title || description || actions ? (
        <header className="ui-card__header">
          <div className="ui-card__heading">
            {title ? <h2 className="ui-card__title">{title}</h2> : null}
            {description ? <p className="ui-card__description">{description}</p> : null}
          </div>
          {actions ? <div className="ui-card__actions">{actions}</div> : null}
        </header>
      ) : null}
      <div className="ui-card__body">{children}</div>
    </section>
  );
}
