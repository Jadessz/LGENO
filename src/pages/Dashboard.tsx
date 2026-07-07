import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, BarChart3, Loader2, Target } from 'lucide-react'
import { api } from '@/lib/api'
import type { LeadRecord, SearchRecord } from '@/lib/pipeline/types'
import { cn } from '@/lib/utils'
import { LeadsTable } from '@/components/LeadsTable'
import { SearchForm, type SearchFormHandle } from '@/components/SearchForm'
import { SearchHistory } from '@/components/SearchHistory'
import { Statistics } from '@/components/Statistics'

type Tab = 'leads' | 'statistics'

const tabs: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'leads', label: 'Leads', icon: Target },
  { id: 'statistics', label: 'Statistics', icon: BarChart3 },
]

export function Dashboard() {
  const searchFormRef = useRef<SearchFormHandle>(null)
  const [activeTab, setActiveTab] = useState<Tab>('leads')
  const [leads, setLeads] = useState<LeadRecord[]>([])
  const [selectedSearchId, setSelectedSearchId] = useState<string | undefined>()
  const [refreshKey, setRefreshKey] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [loadingLeads, setLoadingLeads] = useState(true)

  const loadLeads = useCallback(async (searchId?: string) => {
    setLoadingLeads(true)
    try {
      const result = await api.getLeads(searchId)
      setLeads(result.leads)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load leads')
    } finally {
      setLoadingLeads(false)
    }
  }, [])

  useEffect(() => {
    loadLeads(selectedSearchId)
  }, [loadLeads, selectedSearchId, refreshKey])

  const handleSearchComplete = (searchId: string) => {
    setSelectedSearchId(searchId)
    setRefreshKey((k) => k + 1)
  }

  const handleLeadUpdate = (updated: LeadRecord) => {
    setLeads((prev) => prev.map((l) => (l.id === updated.id ? updated : l)))
  }

  const handleRunAgain = (search: SearchRecord) => {
    searchFormRef.current?.applyValues({
      category: search.category,
      location: search.location,
    })
    window.scrollTo({ top: 0, behavior: 'smooth' })
    void searchFormRef.current?.runSearch()
  }

  const handleSelectSearchFromStats = (searchId: string) => {
    setActiveTab('leads')
    setSelectedSearchId(searchId)
    setRefreshKey((k) => k + 1)
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-border/80 bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-[1800px] flex-wrap items-center justify-between gap-4 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-primary/25 to-primary/5 ring-1 ring-primary/20">
              <Target className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">Lead Generator</h1>
              <p className="text-xs text-muted-foreground">
                Find businesses on Google Maps without a website
              </p>
            </div>
          </div>

          <nav className="flex rounded-lg border border-border/80 bg-card/50 p-1" role="tablist">
            {tabs.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={activeTab === id}
                onClick={() => setActiveTab(id)}
                className={cn(
                  'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all',
                  activeTab === id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
                )}
              >
                <Icon className="h-4 w-4" aria-hidden />
                {label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1800px] space-y-6 px-6 py-8">
        {error && (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {activeTab === 'leads' ? (
          <>
            <SearchForm
              ref={searchFormRef}
              onSearchComplete={handleSearchComplete}
              onError={(message) => setError(message)}
            />

            <div className="grid gap-6 lg:grid-cols-[minmax(300px,340px)_minmax(0,1fr)]">
              <SearchHistory
                selectedSearchId={selectedSearchId}
                onSelectSearch={setSelectedSearchId}
                refreshKey={refreshKey}
                onRunAgain={handleRunAgain}
              />

              {loadingLeads ? (
                <div
                  className="min-w-0 flex h-64 flex-col items-center justify-center gap-3 rounded-xl border border-border/80 bg-card/50 text-muted-foreground"
                  aria-live="polite"
                >
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <span className="text-sm">Loading leads…</span>
                </div>
              ) : (
                <LeadsTable
                  leads={leads}
                  searchId={selectedSearchId}
                  onError={(message) => setError(message)}
                  onLeadUpdate={handleLeadUpdate}
                />
              )}
            </div>
          </>
        ) : (
          <Statistics refreshKey={refreshKey} onSelectSearch={handleSelectSearchFromStats} />
        )}
      </main>
    </div>
  )
}
