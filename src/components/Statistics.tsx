import { useEffect, useState } from 'react'
import { BarChart3, DollarSign, Percent, Phone, Search, Target, Users } from 'lucide-react'
import { api } from '@/lib/api'
import type { SearchStats } from '@/lib/pipeline/types'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface StatisticsProps {
  refreshKey: number
  onSelectSearch: (searchId: string) => void
}

function statusVariant(status: SearchStats['searches'][number]['status']) {
  if (status === 'completed') return 'success'
  if (status === 'failed') return 'destructive'
  return 'warning'
}

export function Statistics({ refreshKey, onSelectSearch }: StatisticsProps) {
  const [stats, setStats] = useState<SearchStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    api
      .getStats()
      .then((data) => {
        setStats(data)
        setError(null)
      })
      .catch((err) => {
        setStats(null)
        setError(err instanceof Error ? err.message : 'Failed to load statistics')
      })
      .finally(() => setLoading(false))
  }, [refreshKey])

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-border text-muted-foreground">
        Loading statistics…
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
        {error ?? 'Failed to load statistics'}
      </div>
    )
  }

  const conversionRate =
    stats.totalScanned > 0 ? (stats.totalLeadsFound / stats.totalScanned) * 100 : 0
  const costPerLead =
    stats.totalLeadsFound > 0 ? stats.totalCostUsd / stats.totalLeadsFound : null
  const phoneRate =
    stats.totalLeads > 0 ? (stats.leadsWithPhone / stats.totalLeads) * 100 : 0

  const summaryCards = [
    {
      title: 'Total API spend',
      value: `$${stats.totalCostUsd.toFixed(2)}`,
      description: 'Across completed searches',
      icon: DollarSign,
    },
    {
      title: 'Cost per lead',
      value: costPerLead != null ? `$${costPerLead.toFixed(2)}` : '—',
      description: 'Spend divided by leads found',
      icon: Target,
    },
    {
      title: 'Conversion rate',
      value: `${conversionRate.toFixed(1)}%`,
      description: 'Leads found ÷ businesses scanned',
      icon: Percent,
    },
    {
      title: 'Leads with phone',
      value: `${phoneRate.toFixed(0)}%`,
      description: `${stats.leadsWithPhone} of ${stats.totalLeads} leads`,
      icon: Phone,
    },
    {
      title: 'Searches run',
      value: String(stats.totalSearches),
      description: `${stats.completedSearches} done · ${stats.failedSearches} failed · ${stats.runningSearches} running`,
      icon: Search,
    },
    {
      title: 'Total leads',
      value: String(stats.totalLeadsFound),
      description: `${stats.totalScanned} businesses scanned`,
      icon: Users,
    },
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {summaryCards.map((card) => (
          <Card key={card.title}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardDescription>{card.title}</CardDescription>
                <card.icon className="h-4 w-4 text-primary" />
              </div>
              <CardTitle className="text-2xl">{card.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">{card.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Cost by search
          </CardTitle>
          <CardDescription>
            Click a row to view that search&apos;s leads. Based on $0.032/page + $0.02/details call.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {stats.searches.length === 0 ? (
            <p className="text-sm text-muted-foreground">No searches yet.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border/80">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border/60 bg-secondary/30">
                    {['Search', 'Status', 'Scanned', 'Leads', 'Conv.', 'Cost/lead', 'Est. cost', 'Date'].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {stats.searches.map((search, i) => (
                    <tr
                      key={search.id}
                      className={cn(
                        'cursor-pointer border-b border-border/40 transition-colors hover:bg-primary/[0.06]',
                        i % 2 === 1 && 'bg-background/20',
                      )}
                      onClick={() => search.status === 'completed' && onSelectSearch(search.id)}
                    >
                      <td className="px-4 py-3">
                        {search.category} in {search.location}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={statusVariant(search.status)}>{search.status}</Badge>
                      </td>
                      <td className="px-4 py-3 tabular-nums">{search.total_found}</td>
                      <td className="px-4 py-3 tabular-nums">{search.leads_found}</td>
                      <td className="px-4 py-3 tabular-nums">
                        {(search.conversionRate * 100).toFixed(0)}%
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        {search.costPerLead != null ? `$${search.costPerLead.toFixed(2)}` : '—'}
                      </td>
                      <td className="px-4 py-3 font-medium tabular-nums">
                        {search.status === 'completed'
                          ? `$${search.computedCostUsd.toFixed(2)}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(search.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
