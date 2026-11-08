import EmptyState from './EmptyState'
import { cn } from './utils'

/**
 * Responsive table shell.
 * - desktop: semantic table with sticky-ish header styling
 * - mobile: `renderMobile(row)` cards
 * Columns: [{ key, header, className, cellClassName, render(row) }]
 */
export default function DataTable({
  columns,
  rows,
  rowKey = 'id',
  renderMobile,
  empty,
  className,
  tableClassName,
}) {
  if (!rows.length) {
    return empty ?? <EmptyState title="No results" description="Try adjusting your search or filters." />
  }

  return (
    <div className={className}>
      <div className={cn('hidden overflow-hidden rounded-2xl border border-line bg-white shadow-soft md:block', tableClassName)}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-line bg-canvas/60">
                {columns.map((column) => (
                  <th
                    key={column.key}
                    scope="col"
                    className={cn(
                      'whitespace-nowrap px-4 py-3 text-[11px] font-bold uppercase tracking-[0.08em] text-ink-muted',
                      column.headerClassName
                    )}
                  >
                    {column.header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-line-soft">
              {rows.map((row, index) => (
                <tr
                  key={typeof rowKey === 'function' ? rowKey(row) : row[rowKey] ?? index}
                  className="group transition-colors hover:bg-canvas/50"
                >
                  {columns.map((column) => (
                    <td key={column.key} className={cn('px-4 py-3.5 align-middle', column.className)}>
                      {column.render ? column.render(row) : row[column.key]}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {renderMobile && <div className="space-y-3 md:hidden">{rows.map((row, index) => renderMobile(row, index))}</div>}
    </div>
  )
}
