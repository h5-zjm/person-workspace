import type { ReactNode } from "react";
import { cx } from "./cx";

export type PageLayoutProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function PageLayout({ actions, children, className, description, title }: PageLayoutProps) {
  return (
    <main className={cx("ui-root", "ui-page", className)}>
      <header className="ui-page__header">
        <div className="ui-page__heading">
          <h1 className="ui-page__title">{title}</h1>
          {description ? <p className="ui-page__description">{description}</p> : null}
        </div>
        {actions ? <div className="ui-page__actions">{actions}</div> : null}
      </header>
      <div className="ui-page__content">{children}</div>
    </main>
  );
}
