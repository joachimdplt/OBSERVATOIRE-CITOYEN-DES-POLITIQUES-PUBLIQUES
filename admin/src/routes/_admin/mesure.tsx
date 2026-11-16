import { createFileRoute } from '@tanstack/react-router'
import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { MeasureEntry } from '../../api/measure.api'
import { Button } from '../../components/atoms/Button'
import { Notice } from '../../components/atoms/Notice'
import {
  useMeasureReport,
  useMeasures,
  useRunMeasure,
} from '../../hooks/measure/useMeasure'
import { reasonsOf } from '../../utils/api-error'

export const Route = createFileRoute('/_admin/mesure')({
  component: MeasurePage,
})

const pct = (x: number | null | undefined) =>
  x === null || x === undefined ? 'non mesuré' : `${Math.round(x * 100)} %`

const when = (iso: string) =>
  new Date(iso).toLocaleString('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

/**
 * La mesure, sobre : trois chiffres, le rapport, et les mesures
 * précédentes dans un sélecteur. Chaque calcul est archivé.
 */
function MeasurePage() {
  const measures = useMeasures()
  const run = useRunMeasure()
  const [picked, setPicked] = useState<string | null>(null)
  const shownId = picked ?? measures.data?.[0]?.id ?? null
  const report = useMeasureReport(shownId)
  const s = report.data?.summary

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-3">
        {measures.data && measures.data.length > 0 && shownId && (
          <MeasurePicker
            measures={measures.data}
            shown={shownId}
            onPick={setPicked}
          />
        )}
        <Button
          disabled={run.isPending}
          onClick={() =>
            run.mutate(undefined, { onSuccess: (r) => setPicked(r.id) })
          }
        >
          {run.isPending ? 'Mise à jour en cours…' : 'Mettre à jour'}
        </Button>
      </div>
      {run.isPending && (
        <Progress
          estimateMs={
            measures.data?.find((m) => m.summary.durationMs)?.summary.durationMs
          }
        />
      )}
      <Notice reasons={[...(run.error ? reasonsOf(run.error) : [])]} />
      {run.data?.filing && (
        <p className="text-left text-sm text-[#5B6470]">{run.data.filing}</p>
      )}

      {measures.data?.length === 0 && (
        <p className="surface p-8 text-center text-sm text-[#5B6470]">
          Aucune mesure : cliquez sur Mettre à jour.
        </p>
      )}

      {s && (
        <div className="grid gap-3 sm:grid-cols-3">
          <Stat
            value={pct(s.rate)}
            label="rangements justes"
            note={`${s.accepted} sur ${s.verdicts} vérifiés`}
          />
          <Stat
            value={String(s.verdicts)}
            label="verdicts"
            note={`${s.candidates} candidat${s.candidates > 1 ? 's' : ''}`}
          />
          <Stat
            value={
              s.classifierRate === null ? 'non mesuré' : pct(s.classifierRate)
            }
            label="classeur du rangement"
            note="testé sur vos cartes"
          />
        </div>
      )}


      {report.data && <Report html={report.data.html} />}
    </>
  )
}

/** Un chiffre clé, sans graphique. */
function Stat({
  value,
  label,
  note,
}: {
  value: string
  label: string
  note: string
}) {
  return (
    <div className="surface flex items-center gap-4 px-5 py-4">
      {/* Un chiffre en grand ; un mot (« non mesuré ») plus petit, sans
          coupure. */}
      <p
        className={`shrink-0 text-left font-extrabold tracking-tight whitespace-nowrap text-[#0B1A2A] tabular-nums ${
          /\d/.test(value) ? 'text-3xl' : 'text-base text-[#5B6470]'
        }`}
      >
        {value}
      </p>
      <div className="min-w-0 text-left">
        <p className="text-left text-sm font-semibold text-[#0B1A2A]">
          {label}
        </p>
        <p className="text-left text-xs text-[#5B6470]">{note}</p>
      </div>
    </div>
  )
}

/**
 * Le choix d'une mesure archivée : une pilule de verre qui ouvre la liste,
 * chaque mesure avec sa date et son taux. Un clic ailleurs ou Échap ferme.
 */
function MeasurePicker({
  measures,
  shown,
  onPick,
}: {
  measures: MeasureEntry[]
  shown: string
  onPick: (id: string) => void
}) {
  const [open, setOpen] = useState(false)
  const box = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (
        e instanceof KeyboardEvent
          ? e.key === 'Escape'
          : !box.current?.contains(e.target as Node)
      )
        setOpen(false)
    }
    window.addEventListener('mousedown', close)
    window.addEventListener('keydown', close)
    return () => {
      window.removeEventListener('mousedown', close)
      window.removeEventListener('keydown', close)
    }
  }, [open])
  const current = measures.find((m) => m.id === shown)
  return (
    <div ref={box} className="relative">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="glass inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-semibold text-[#0B1A2A]"
      >
        {current ? when(current.measuredAt) : 'Mesure'}
        <ChevronDown
          size={15}
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <ul className="glass absolute top-full right-0 z-20 mt-2 max-h-80 w-72 overflow-y-auto rounded-[18px] p-1.5">
          {measures.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(m.id)
                  setOpen(false)
                }}
                className={`flex w-full items-center gap-3 rounded-[12px] px-3 py-2 text-left text-sm ${
                  m.id === shown
                    ? 'glass-dark text-white'
                    : 'text-[#0B1A2A] hover:bg-white/70'
                }`}
              >
                <span className="flex-1">{when(m.measuredAt)}</span>
                <span
                  className={`tabular-nums ${m.id === shown ? 'text-white/70' : 'text-[#5B6470]'}`}
                >
                  {pct(m.summary.rate)} · {m.summary.verdicts}
                </span>
                {m.id === shown && <Check size={14} />}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/**
 * Le rapport, jusqu'en bas de l'écran et pas plus : il remplit la place
 * qui reste sous les chiffres, et défile à l'intérieur.
 */
function Report({ html }: { html: string }) {
  const ref = useRef<HTMLIFrameElement>(null)
  const [height, setHeight] = useState(600)
  useEffect(() => {
    const fit = () => {
      const top = ref.current?.getBoundingClientRect().top ?? 0
      setHeight(Math.max(320, window.innerHeight - top - 24))
    }
    fit()
    window.addEventListener('resize', fit)
    return () => window.removeEventListener('resize', fit)
  }, [])
  return (
    <iframe
      ref={ref}
      title="Rapport de mesure"
      srcDoc={html}
      sandbox=""
      style={{ height }}
      className="surface block w-full"
    />
  )
}

/** Le temps en minutes et secondes : « 1:15 ». */
const clock = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

/**
 * La progression d'une mise à jour, estimée sur la durée de la précédente :
 * la barre avance avec le temps et s'arrête juste avant la fin, tant que le
 * serveur n'a pas répondu.
 */
function Progress({ estimateMs }: { estimateMs?: number }) {
  const estimate = estimateMs ?? 90_000
  const [elapsed, setElapsed] = useState(0)
  useEffect(() => {
    const start = Date.now()
    const id = setInterval(() => setElapsed(Date.now() - start), 500)
    return () => clearInterval(id)
  }, [])
  const share = Math.min(0.97, elapsed / estimate)
  const left = estimate - elapsed
  return (
    <div className="surface space-y-2 px-5 py-4">
      <div className="h-1.5 overflow-hidden rounded-full bg-[#0B1A2A]/8">
        <div
          className="h-full rounded-full bg-[#0B1A2A] transition-[width] duration-500 ease-linear"
          style={{ width: `${share * 100}%` }}
        />
      </div>
      <p className="text-left text-sm text-[#5B6470] tabular-nums">
        {clock(elapsed)} écoulées
        {left > 0 ? `, encore environ ${clock(left)}` : ', presque fini'}
        {estimateMs ? '' : ' (estimation par défaut)'}
      </p>
    </div>
  )
}
