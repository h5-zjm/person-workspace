import type { ReactNode } from "react";
import { cx } from "./cx";

export type TableColumn<Row> = {
  key: string;
  title: ReactNode;
  align?: "left" | "center" | "right";
  width?: string;
  render: (row: Row, index: number) => ReactNode;
};

export type TableProps<Row> = {
  columns: Array<TableColumn<Row>>;
  data: Row[];
  rowKey: (row: Row, index: number) => string;
  emptyText?: string;
  className?: string;
};

export function Table<Row>({ className, columns, data, emptyText = "暂无数据", rowKey }: TableProps<Row>) {
  return (
    <div className={cx("ui-table-wrap", className)}>
      <table className="ui-table">
        <thead>
          <tr>
            {columns.map((column) => (
              <th className={cx(column.align && `ui-table__cell--${column.align}`)} key={column.key} scope="col">
                {column.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length > 0 ? (
            data.map((row, rowIndex) => (
              <tr key={rowKey(row, rowIndex)}>
                {columns.map((column) => (
                  <td className={cx(column.align && `ui-table__cell--${column.align}`)} key={column.key}>
                    {column.render(row, rowIndex)}
                  </td>
                ))}
              </tr>
            ))
          ) : (
            <tr>
              <td className="ui-table__empty" colSpan={columns.length}>
                {emptyText}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
