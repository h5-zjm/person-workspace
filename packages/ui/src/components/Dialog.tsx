import type { ReactNode } from "react";
import { Button } from "./Button";
import { cx } from "./cx";

export type DialogProps = {
  title: string;
  open: boolean;
  children: ReactNode;
  actions?: ReactNode;
  onClose: () => void;
  className?: string;
};

export function Dialog({ actions, children, className, onClose, open, title }: DialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="ui-dialog" role="presentation">
      <div className="ui-dialog__overlay" onClick={onClose} />
      <section aria-modal="true" className={cx("ui-dialog__panel", className)} role="dialog">
        <header className="ui-dialog__header">
          <h2 className="ui-dialog__title">{title}</h2>
          <Button aria-label="关闭弹窗" onClick={onClose} size="sm" variant="ghost">
            ×
          </Button>
        </header>
        <div className="ui-dialog__body">{children}</div>
        {actions ? <footer className="ui-dialog__footer">{actions}</footer> : null}
      </section>
    </div>
  );
}
