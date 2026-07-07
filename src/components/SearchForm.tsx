import { forwardRef, useEffect, useImperativeHandle, useState } from 'react'
import {
  Bookmark,
  Calendar,
  DollarSign,
  Layers,
  Loader2,
  MapPin,
  Play,
  Save,
  Search,
  SlidersHorizontal,
  X,
} from 'lucide-react'
import { api } from '@/lib/api'
import type { SavedLocation } from '@/lib/pipeline/types'
import { Button } from '@/components/ui/button'
import { FormField } from '@/components/ui/form-field'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

const CATEGORY_CHIPS = ['restaurants', 'bars', 'cafes', 'hotels', 'nightclubs', 'clubs']

export interface SearchFormValues {
  category: string
  location: string
  maxPages: number
  maxResults: number
  budgetCapUsd?: number
  requirePhone?: boolean
  minRating?: number
  minReviewCount?: number
}

export interface SearchFormHandle {
  applyValues: (values: Partial<SearchFormValues>) => void
  runSearch: () => Promise<void>
}

interface SearchFormProps {
  onSearchComplete: (searchId: string) => void
  onError: (message: string) => void
}

function SectionTitle({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>
  title: string
  description: string
}) {
  return (
    <div className="flex items-start gap-3 border-b border-border/60 pb-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div>
        <h4 className="text-sm font-semibold text-foreground">{title}</h4>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
  )
}

export const SearchForm = forwardRef<SearchFormHandle, SearchFormProps>(function SearchForm(
  { onSearchComplete, onError },
  ref,
) {
  const [category, setCategory] = useState('restaurants')
  const [location, setLocation] = useState('')
  const [maxPages, setMaxPages] = useState(3)
  const [maxResults, setMaxResults] = useState(60)
  const [budgetCapUsd, setBudgetCapUsd] = useState<number | ''>('')
  const [requirePhone, setRequirePhone] = useState(false)
  const [minRating, setMinRating] = useState<number | ''>('')
  const [minReviewCount, setMinReviewCount] = useState<number | ''>('')
  const [estimate, setEstimate] = useState<number | null>(null)
  const [savedLocations, setSavedLocations] = useState<SavedLocation[]>([])
  const [saveLabel, setSaveLabel] = useState('')
  const [scheduleEnabled, setScheduleEnabled] = useState(false)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [locationSuggestions, setLocationSuggestions] = useState<string[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const maxBusinessesFromPages = maxPages * 20
  const estimatedSeconds = Math.ceil((maxResults * 150) / 1000)

  const filterParams = {
    requirePhone: requirePhone || undefined,
    minRating: minRating === '' ? undefined : minRating,
    minReviewCount: minReviewCount === '' ? undefined : minReviewCount,
  }

  const loadPresets = () => {
    api
      .getSavedLocations()
      .then((res) => {
        setSavedLocations(res.locations)
        const defaultLoc = res.locations.find((l) => l.is_default)
        if (defaultLoc) applySavedLocation(defaultLoc)
      })
      .catch(() => undefined)
  }

  useEffect(() => {
    loadPresets()
  }, [])

  useEffect(() => {
    if (!category || !location) {
      setEstimate(null)
      return
    }

    const timer = setTimeout(() => {
      api
        .estimateSearch({
          category,
          location,
          maxPages,
          maxResults,
          budgetCapUsd: budgetCapUsd === '' ? undefined : budgetCapUsd,
          ...filterParams,
        })
        .then((res) => setEstimate(res.estimatedCostUsd))
        .catch(() => setEstimate(null))
    }, 300)

    return () => clearTimeout(timer)
  }, [category, location, maxPages, maxResults, budgetCapUsd, requirePhone, minRating, minReviewCount])

  useEffect(() => {
    if (location.length < 2) {
      setLocationSuggestions([])
      return
    }

    const timer = setTimeout(() => {
      api
        .getLocationSuggestions(location)
        .then((res) => setLocationSuggestions(res.suggestions))
        .catch(() => setLocationSuggestions([]))
    }, 300)

    return () => clearTimeout(timer)
  }, [location])

  const handleRunSearch = async () => {
    if (!category.trim() || !location.trim()) {
      onError('Category and location are required')
      return
    }

    setLoading(true)
    try {
      const result = await api.runSearch({
        category: category.trim(),
        location: location.trim(),
        maxPages,
        maxResults,
        budgetCapUsd: budgetCapUsd === '' ? undefined : budgetCapUsd,
        ...filterParams,
      })
      onSearchComplete(result.searchId)
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Search failed')
    } finally {
      setLoading(false)
    }
  }

  useImperativeHandle(ref, () => ({
    applyValues(values: Partial<SearchFormValues>) {
      if (values.category != null) setCategory(values.category)
      if (values.location != null) setLocation(values.location)
      if (values.maxPages != null) setMaxPages(values.maxPages)
      if (values.maxResults != null) setMaxResults(values.maxResults)
      if (values.budgetCapUsd != null) setBudgetCapUsd(values.budgetCapUsd)
      if (values.requirePhone != null) setRequirePhone(values.requirePhone)
      if (values.minRating != null) setMinRating(values.minRating)
      if (values.minReviewCount != null) setMinReviewCount(values.minReviewCount)
    },
    runSearch: handleRunSearch,
  }))

  const handleSaveLocation = async () => {
    if (!saveLabel.trim() || !category.trim() || !location.trim()) {
      onError('Label, category, and location are required to save')
      return
    }

    setSaving(true)
    try {
      await api.createSavedLocation({
        label: saveLabel.trim(),
        category: category.trim(),
        location: location.trim(),
        max_pages: maxPages,
        max_results: maxResults,
        budget_cap_usd: budgetCapUsd === '' ? null : budgetCapUsd,
        schedule_enabled: scheduleEnabled,
        schedule_cron: scheduleEnabled ? '0 9 * * 1' : null,
      })
      setSaveLabel('')
      setScheduleEnabled(false)
      loadPresets()
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to save location')
    } finally {
      setSaving(false)
    }
  }

  const applySavedLocation = (saved: SavedLocation) => {
    setCategory(saved.category)
    setLocation(saved.location)
    setMaxPages(saved.max_pages)
    setMaxResults(saved.max_results ?? 60)
    setBudgetCapUsd(saved.budget_cap_usd ?? '')
  }

  const handleDeletePreset = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await api.deleteSavedLocation(id)
      setSavedLocations((prev) => prev.filter((l) => l.id !== id))
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to delete preset')
    }
  }

  const handleSetDefault = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await api.updateSavedLocation(id, { is_default: true })
      loadPresets()
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Failed to set default')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5 text-primary" />
          New search
        </CardTitle>
        <CardDescription>
          Search Google Maps for businesses with no website listed — your potential clients.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-8">
        {savedLocations.length > 0 && (
          <div className="space-y-3">
            <SectionTitle
              icon={Bookmark}
              title="Saved presets"
              description="Click to fill the form. Star sets default; X removes."
            />
            <div className="flex flex-wrap gap-2">
              {savedLocations.map((saved) => (
                <div key={saved.id} className="group relative">
                  <Button
                    variant="outline"
                    size="sm"
                    className={cn(
                      'border-border/80 bg-background/40 pr-8',
                      saved.is_default && 'border-primary/40',
                    )}
                    onClick={() => applySavedLocation(saved)}
                  >
                    <MapPin className="h-3.5 w-3.5 text-primary" />
                    {saved.label}
                    {saved.schedule_enabled && (
                      <Calendar className="h-3 w-3 text-muted-foreground" />
                    )}
                  </Button>
                  <div className="absolute -right-1 -top-1 flex gap-0.5 opacity-0 group-hover:opacity-100">
                    {!saved.is_default && (
                      <button
                        type="button"
                        title="Set as default"
                        className="rounded bg-secondary px-1 text-[10px]"
                        onClick={(e) => handleSetDefault(saved.id, e)}
                      >
                        ★
                      </button>
                    )}
                    <button
                      type="button"
                      title="Delete preset"
                      className="rounded bg-destructive/80 p-0.5 text-white"
                      onClick={(e) => handleDeletePreset(saved.id, e)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-5">
          <SectionTitle
            icon={Search}
            title="What to find"
            description="Pick a business type and where to search."
          />
          <div className="flex flex-wrap gap-2">
            {CATEGORY_CHIPS.map((chip) => (
              <Button
                key={chip}
                type="button"
                variant={category === chip ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategory(chip)}
              >
                {chip}
              </Button>
            ))}
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <FormField
              label="Business type"
              hint="Or type your own — e.g. wine bars, sushi restaurants."
              htmlFor="category"
            >
              <Input
                id="category"
                placeholder="e.g. restaurants, bars"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              />
            </FormField>
            <FormField
              label="City or area"
              hint="Include country — e.g. London, UK. Suggestions appear as you type."
              htmlFor="location"
            >
              <div className="relative">
                <Input
                  id="location"
                  placeholder="e.g. London, UK"
                  value={location}
                  onChange={(e) => {
                    setLocation(e.target.value)
                    setShowSuggestions(true)
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  autoComplete="off"
                />
                {showSuggestions && locationSuggestions.length > 0 && (
                  <ul className="absolute z-20 mt-1 w-full rounded-lg border border-border bg-card shadow-lg">
                    {locationSuggestions.map((s) => (
                      <li key={s}>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left text-sm hover:bg-secondary/60"
                          onMouseDown={() => {
                            setLocation(s)
                            setShowSuggestions(false)
                          }}
                        >
                          {s}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </FormField>
          </div>
        </div>

        <div className="space-y-5">
          <SectionTitle
            icon={SlidersHorizontal}
            title="How many to scan"
            description="You pay per business checked, not per lead found."
          />
          <div className="grid gap-5 md:grid-cols-2">
            <FormField
              label="Result pages"
              hint={`${maxPages} page${maxPages === 1 ? '' : 's'} ≈ up to ${maxBusinessesFromPages} businesses.`}
              htmlFor="maxPages"
            >
              <Input
                id="maxPages"
                type="number"
                min={1}
                max={10}
                value={maxPages}
                onChange={(e) => setMaxPages(Number(e.target.value))}
              />
            </FormField>
            <FormField
              label="Max businesses to check"
              hint="Cap on Place Details lookups (the expensive step)."
              htmlFor="maxResults"
            >
              <Input
                id="maxResults"
                type="number"
                min={1}
                max={200}
                value={maxResults}
                onChange={(e) => setMaxResults(Number(e.target.value))}
              />
            </FormField>
            <FormField
              label="Spending limit"
              hint="Search won't start if estimated cost exceeds this."
              htmlFor="budgetCap"
              optional
              className="md:col-span-2"
            >
              <div className="relative">
                <DollarSign className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="budgetCap"
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="e.g. 5.00"
                  className="pl-9"
                  value={budgetCapUsd}
                  onChange={(e) =>
                    setBudgetCapUsd(e.target.value === '' ? '' : Number(e.target.value))
                  }
                />
              </div>
            </FormField>
          </div>
        </div>

        <div className="rounded-lg border border-border/60 bg-background/20 px-4 py-3">
          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <SlidersHorizontal className="h-4 w-4 text-primary" />
              Lead quality filters
            </div>

            <label className="flex h-9 cursor-pointer items-center gap-2 rounded-md border border-border/60 bg-background/40 px-3 text-sm transition-colors hover:bg-secondary/40">
              <input
                type="checkbox"
                checked={requirePhone}
                onChange={(e) => setRequirePhone(e.target.checked)}
                className="rounded border-border"
              />
              Require phone
            </label>

            <div className="flex items-center gap-2">
              <label htmlFor="minRating" className="text-sm text-muted-foreground whitespace-nowrap">
                Min rating
              </label>
              <Input
                id="minRating"
                type="number"
                min={0}
                max={5}
                step={0.1}
                placeholder="Any"
                className="h-9 w-24"
                value={minRating}
                onChange={(e) =>
                  setMinRating(e.target.value === '' ? '' : Number(e.target.value))
                }
              />
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="minReviews" className="text-sm text-muted-foreground whitespace-nowrap">
                Min reviews
              </label>
              <Input
                id="minReviews"
                type="number"
                min={0}
                placeholder="Any"
                className="h-9 w-24"
                value={minReviewCount}
                onChange={(e) =>
                  setMinReviewCount(e.target.value === '' ? '' : Number(e.target.value))
                }
              />
            </div>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Optional — narrow results after scanning. Does not change API cost.
          </p>
        </div>

        {estimate !== null && category && location && (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 px-4 py-3">
            <Layers className="h-4 w-4 shrink-0 text-primary" />
            <div className="flex flex-1 flex-wrap items-center gap-x-4 gap-y-1 text-sm">
              <span>
                Est. cost: <strong>${estimate.toFixed(2)}</strong>
              </span>
              <span className="text-muted-foreground">
                ~{estimatedSeconds}s · up to {Math.min(maxResults, maxBusinessesFromPages)} businesses
              </span>
            </div>
          </div>
        )}

        <div className="flex flex-wrap gap-3 border-t border-border/60 pt-6">
          <Button onClick={handleRunSearch} disabled={loading} size="lg" className="min-w-[160px]">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {loading ? `Searching (~${estimatedSeconds}s)…` : 'Run search'}
          </Button>
        </div>

        <div className="space-y-4 rounded-lg border border-dashed border-border/80 bg-background/30 p-4">
          <SectionTitle
            icon={Save}
            title="Save as preset"
            description="Reload later or enable weekly scheduled runs (Mondays 9:00 UTC)."
          />
          <div className="flex flex-wrap items-end gap-3">
            <FormField
              label="Preset name"
              hint="e.g. Downtown restaurants"
              htmlFor="saveLabel"
              className="min-w-[200px] flex-1"
            >
              <Input
                id="saveLabel"
                placeholder="e.g. Downtown bars"
                value={saveLabel}
                onChange={(e) => setSaveLabel(e.target.value)}
              />
            </FormField>
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <input
                type="checkbox"
                checked={scheduleEnabled}
                onChange={(e) => setScheduleEnabled(e.target.checked)}
                className="rounded border-border"
              />
              Weekly schedule
            </label>
            <Button variant="secondary" onClick={handleSaveLocation} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save preset
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})
