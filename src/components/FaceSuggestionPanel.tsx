import type { FaceSuggestion } from '../app/faceSuggestions'
import Button from './Button'

type FaceSuggestionPanelProps = {
  suggestions: FaceSuggestion[]
  onToggle: (id: string, included: boolean) => void
  onApply: () => void
}

export default function FaceSuggestionPanel({
  suggestions,
  onToggle,
  onApply,
}: FaceSuggestionPanelProps) {
  if (suggestions.length === 0) {
    return null
  }

  return (
    <div className="space-y-2 rounded-2xl border border-dashed border-emerald-200 bg-emerald-50/60 p-3 text-xs text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-900/20 dark:text-emerald-100">
      <p className="font-semibold uppercase tracking-[0.2em] text-[0.55rem]">Suggested faces</p>
      <div className="space-y-2">
        {suggestions.map((suggestion, index) => (
          <label key={suggestion.id} className="flex items-center gap-2 text-xs">
            <input
              type="checkbox"
              checked={suggestion.included}
              onChange={(event) => onToggle(suggestion.id, event.target.checked)}
            />
            <span>
              Face {index + 1} · {Math.round(suggestion.score * 100)}%
            </span>
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <Button variant="outline" onClick={onApply}>
          Add selected to redactions
        </Button>
        <span className="text-[0.6rem] text-emerald-800/80 dark:text-emerald-100/80">
          Converts suggestions into editable rectangles.
        </span>
      </div>
    </div>
  )
}
