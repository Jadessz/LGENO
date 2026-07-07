import { useEffect, useState } from 'react'
import { History, List, Loader2, RotateCcw } from 'lucide-react'
import { api } from '@/lib/api'
import type { SearchRecord } from '@/lib/pipeline/types'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface SearchHistoryProps {
  selectedSearchId?: string
  onSelectSearch: (searchId: string | undefined) => void
  refreshKey: number
  onRunAgain: (search: SearchRecord) => void
}

function statusVariant(status: SearchRecord['status']) {
  if (status === 'completed') return 'success'
  if (status === 'failed') return 'destructive'
  return 'warning'
}

function statusLabel(status: SearchRecord['status']) {
  if (status === 'completed') return 'Done'
  if (status === 'failed') return 'Failed'
  return 'Running'
}

export function SearchHistory({
  selectedSearchId,
  onSelectSearch,
  refreshKey,
  onRunAgain,
}: SearchHistoryProps) {
  const [searches, setSearches] = useState<SearchRecord[]>([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    api
      .getSearches()
      .then((res) => setSearches(res.searches))
      .catch(() => setSearches([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    setLoading(true)
    load()
  }, [refreshKey])

  useEffect(() => {
    const hasRunning = searches.some((s) => s.status === 'running')
    if (!hasRunning) return

    const interval = setInterval(load, 3000)
    return () => clearInterval(interval)
  }, [searches])

  return (
    <Card className="h-fit w-full shrink-0 lg:sticky lg:top-24">
      <CardHeader className="border-b border-border/60 px-5 pb-4 pt-5">
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4 text-primary" />
          Past searches
        </CardTitle>
        <CardDescription className="leading-relaxed">
          Filter leads by search or run again.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 px-5 pb-5 pt-4">
        <button
          type="button"
          onClick={() => onSelectSearch(undefined)}
          className={cn(
            'flex w-full items-center gap-2.5 rounded-lg border px-4 py-3 text-left text-sm font-medium transition-all',
            !selectedSearchId
              ? 'border-primary/40 bg-primary/10 text-foreground'
              : 'border-border/60 bg-background/30 text-muted-foreground hover:border-border hover:bg-secondary/40 hover:text-foreground',
          )}
        >
          <List className="h-4 w-4 shrink-0" />
          Show all leads
        </button>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : searches.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No searches yet.</p>
        ) : (
          <div className="scrollbar-thin max-h-[520px] space-y-3 overflow-y-auto pr-1">
            {searches.map((search) => (
              <div
                key={search.id}
                className={cn(
                  'rounded-lg border transition-all',
                  selectedSearchId === search.id
                    ? 'border-primary/40 bg-primary/10'
                    : 'border-border/60 bg-background/20',
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelectSearch(search.id)}
                  className="w-full px-4 py-3.5 text-left"
                >
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <Badge variant={statusVariant(search.status)} className="shrink-0 font-normal">
                      {search.status === 'running' && (
                        <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      )}
                      {statusLabel(search.status)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(search.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  <p
                    className="text-sm font-medium leading-relaxed break-words"
                    title={search.category}
                  >
                    {search.category}
                  </p>
                  <p
                    className="mt-1 text-xs leading-relaxed text-muted-foreground break-words"
                    title={search.location}
                  >
                    {search.location}
                  </p>

                  <div className="mt-3 flex gap-4 border-t border-border/40 pt-2.5 text-xs text-muted-foreground">
                    <span>
                      <span className="font-semibold text-foreground">{search.leads_found}</span>{' '}
                      leads
                    </span>
                    <span>
                      <span className="font-semibold text-foreground">{search.total_found}</span>{' '}
                      scanned
                    </span>
                  </div>

                  {search.error_message && (
                    <p className="mt-2 text-xs leading-relaxed text-destructive">
                      {search.error_message}
                    </p>
                  )}
                </button>

                {search.status === 'completed' && (
                  <div className="border-t border-border/40 px-4 py-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-full justify-start text-xs"
                      onClick={() => onRunAgain(search)}
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Run again
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
