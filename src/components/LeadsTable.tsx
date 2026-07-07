import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table'
import { useMemo, useState } from 'react'
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Building2,
  Check,
  Copy,
  ExternalLink,
  MapPin,
  Phone,
  Search,
  Star,
} from 'lucide-react'
import type { LeadRecord, OutreachStatus } from '@/lib/pipeline/types'
import { OUTREACH_STATUS_LABELS, OUTREACH_STATUSES } from '@/lib/pipeline/types'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const columnHelper = createColumnHelper<LeadRecord>()

interface LeadsTableProps {
  leads: LeadRecord[]
  searchId?: string
  onError: (message: string) => void
  onLeadUpdate: (lead: LeadRecord) => void
}

function SortIcon({ sorted }: { sorted: false | 'asc' | 'desc' }) {
  if (sorted === 'asc') return <ArrowUp className="ml-1.5 h-3.5 w-3.5 text-primary" />
  if (sorted === 'desc') return <ArrowDown className="ml-1.5 h-3.5 w-3.5 text-primary" />
  return <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-40" />
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 w-7 p-0"
      title={`Copy ${label}`}
      onClick={handleCopy}
    >
      {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
    </Button>
  )
}

function StatusBadge({ status }: { status: OutreachStatus }) {
  const variant =
    status === 'won'
      ? 'success'
      : status === 'lost'
        ? 'destructive'
        : status === 'interested'
          ? 'warning'
          : 'default'
  return <Badge variant={variant}>{OUTREACH_STATUS_LABELS[status]}</Badge>
}

function LeadCard({
  lead,
  onUpdate,
  onError,
}: {
  lead: LeadRecord
  onUpdate: (lead: LeadRecord) => void
  onError: (msg: string) => void
}) {
  const [notes, setNotes] = useState(lead.notes ?? '')
  const [saving, setSaving] = useState(false)

  const saveNotes = async () => {
    setSaving(true)
    try {
      const { lead: updated } = await api.updateLead(lead.id, { notes })
      onUpdate(updated)
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed to save notes')
    } finally {
      setSaving(false)
    }
  }

  const updateStatus = async (status: OutreachStatus) => {
    try {
      const { lead: updated } = await api.updateLead(lead.id, { outreach_status: status })
      onUpdate(updated)
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Failed to update status')
    }
  }

  return (
    <div className="rounded-lg border border-border/60 bg-background/30 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            <Building2 className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="font-medium">{lead.name}</p>
            {lead.primary_type && (
              <p className="text-xs text-muted-foreground">{lead.primary_type}</p>
            )}
          </div>
        </div>
        <StatusBadge status={lead.outreach_status ?? 'new'} />
      </div>

      <p className="text-sm text-muted-foreground">{lead.address || '—'}</p>

      <div className="flex flex-wrap gap-2">
        {lead.phone && (
          <a
            href={`tel:${lead.phone.replace(/\s/g, '')}`}
            className="inline-flex items-center gap-1.5 rounded-md bg-secondary/60 px-2.5 py-1.5 text-sm text-primary"
          >
            <Phone className="h-3.5 w-3.5" />
            {lead.phone}
          </a>
        )}
        {lead.google_maps_uri && (
          <a
            href={lead.google_maps_uri}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md bg-secondary/60 px-2.5 py-1.5 text-sm"
          >
            <MapPin className="h-3.5 w-3.5" />
            Maps
          </a>
        )}
      </div>

      <select
        value={lead.outreach_status ?? 'new'}
        onChange={(e) => updateStatus(e.target.value as OutreachStatus)}
        className="h-9 w-full rounded-lg border border-border bg-background/60 px-2 text-sm"
      >
        {OUTREACH_STATUSES.map((s) => (
          <option key={s} value={s}>
            {OUTREACH_STATUS_LABELS[s]}
          </option>
        ))}
      </select>

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={saveNotes}
        placeholder="Notes…"
        rows={2}
        className="w-full rounded-lg border border-border bg-background/60 px-3 py-2 text-sm resize-none"
        disabled={saving}
      />
    </div>
  )
}

export function LeadsTable({ leads, searchId, onError, onLeadUpdate }: LeadsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')
  const [exporting, setExporting] = useState(false)

  const tableData = useMemo(() => leads, [leads])

  const columns = useMemo(
    () => [
      columnHelper.accessor('name', {
        header: 'Business',
        cell: (info) => {
          const lead = info.row.original
          return (
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <Building2 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <span className="font-medium leading-snug">{info.getValue()}</span>
                {lead.primary_type && (
                  <p className="text-xs text-muted-foreground">{lead.primary_type}</p>
                )}
              </div>
            </div>
          )
        },
      }),
      columnHelper.accessor('address', {
        header: 'Address',
        cell: (info) => (
          <div className="flex items-center gap-1 max-w-[200px]">
            <span className="text-sm text-muted-foreground truncate">{info.getValue() || '—'}</span>
            {info.getValue() && <CopyButton value={info.getValue()} label="address" />}
          </div>
        ),
      }),
      columnHelper.accessor('phone', {
        header: 'Phone',
        cell: (info) => {
          const phone = info.getValue()
          if (!phone) return <span className="text-muted-foreground/60">—</span>
          return (
            <div className="flex items-center gap-1">
              <a href={`tel:${phone.replace(/\s/g, '')}`} className="text-sm text-primary hover:underline">
                {phone}
              </a>
              <CopyButton value={phone} label="phone" />
            </div>
          )
        },
      }),
      columnHelper.accessor('google_maps_uri', {
        header: 'Maps',
        cell: (info) => {
          const uri = info.getValue()
          if (!uri) return <span className="text-muted-foreground/60">—</span>
          return (
            <a
              href={uri}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              Open <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )
        },
      }),
      columnHelper.accessor('outreach_status', {
        header: 'Status',
        cell: (info) => {
          const lead = info.row.original
          return (
            <select
              value={lead.outreach_status ?? 'new'}
              onChange={async (e) => {
                try {
                  const { lead: updated } = await api.updateLead(lead.id, {
                    outreach_status: e.target.value as OutreachStatus,
                  })
                  onLeadUpdate(updated)
                } catch (err) {
                  onError(err instanceof Error ? err.message : 'Update failed')
                }
              }}
              className="h-8 rounded-md border border-border bg-background/60 px-2 text-xs"
            >
              {OUTREACH_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {OUTREACH_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          )
        },
      }),
      columnHelper.accessor('notes', {
        header: 'Notes',
        cell: (info) => {
          const lead = info.row.original
          return (
            <input
              defaultValue={lead.notes ?? ''}
              placeholder="Add note…"
              className="h-8 w-full min-w-[120px] rounded-md border border-border bg-background/60 px-2 text-xs"
              onBlur={async (e) => {
                const value = e.target.value
                if (value === (lead.notes ?? '')) return
                try {
                  const { lead: updated } = await api.updateLead(lead.id, { notes: value || null })
                  onLeadUpdate(updated)
                } catch (err) {
                  onError(err instanceof Error ? err.message : 'Save failed')
                }
              }}
            />
          )
        },
      }),
      columnHelper.accessor('rating', {
        header: 'Rating',
        cell: (info) => {
          const rating = info.getValue()
          const count = info.row.original.rating_count
          if (rating == null) return <span className="text-muted-foreground/60">—</span>
          return (
            <div className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="font-medium tabular-nums">{rating.toFixed(1)}</span>
              {count != null && <span className="text-xs text-muted-foreground">({count})</span>}
            </div>
          )
        },
      }),
    ],
    [onError, onLeadUpdate],
  )

  const table = useReactTable({
    data: tableData,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  const filteredRows = table.getRowModel().rows
  const filteredLeads = filteredRows.map((r) => r.original)

  const handleExport = async () => {
    setExporting(true)
    try {
      const date = new Date().toISOString().slice(0, 10)
      const name = searchId ? `leads-search-${date}` : `leads-all-${date}`
      if (globalFilter) {
        api.exportLeadsClient(filteredLeads, `${name}-filtered.csv`)
      } else if (searchId) {
        await api.exportCsv(searchId, `${name}.csv`)
      } else {
        api.exportLeadsClient(leads, `${name}.csv`)
      }
    } catch (e) {
      onError(e instanceof Error ? e.message : 'Export failed')
    } finally {
      setExporting(false)
    }
  }

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className="sticky top-16 z-[5] border-b border-border/60 bg-card/95 backdrop-blur-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Leads without websites</CardTitle>
            <CardDescription className="mt-1.5">
              {leads.length === 0
                ? 'Run a search above to find businesses that may need a website.'
                : `${filteredLeads.length} lead${filteredLeads.length === 1 ? '' : 's'} shown`}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting || leads.length === 0}>
            {exporting ? 'Exporting…' : 'Export CSV'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-0">
        <div className="border-b border-border/60 px-6 py-4">
          <div className="relative max-w-md">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, address, phone…"
              aria-label="Filter leads"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Mobile cards */}
        <div className="space-y-3 p-4 md:hidden">
          {filteredLeads.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No leads to show.</p>
          ) : (
            filteredLeads.map((lead) => (
              <LeadCard key={lead.id} lead={lead} onUpdate={onLeadUpdate} onError={onError} />
            ))
          )}
        </div>

        {/* Desktop table */}
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full text-left text-sm">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id} className="border-b border-border/60 bg-secondary/30">
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      {header.isPlaceholder ? null : header.column.getCanSort() ? (
                        <button
                          type="button"
                          className="inline-flex items-center hover:text-foreground"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <SortIcon sorted={header.column.getIsSorted()} />
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length}>
                    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
                      <Building2 className="h-10 w-10 text-muted-foreground/40" />
                      <p className="text-sm text-muted-foreground">No leads to show.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredRows.map((row, i) => (
                  <tr
                    key={row.id}
                    className={cn(
                      'border-b border-border/40 hover:bg-primary/[0.03]',
                      i % 2 === 1 && 'bg-background/20',
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3.5 align-middle">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
