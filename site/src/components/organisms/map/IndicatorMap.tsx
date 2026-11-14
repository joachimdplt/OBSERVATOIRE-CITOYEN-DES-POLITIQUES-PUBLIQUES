import { useEffect, useRef } from 'react'
import type { MapLayerMouseEvent, Map as MapLibreMap } from 'maplibre-gl'
import { FRANCE_BOUNDS } from '../../../data/regions'
import { fillExpression } from './palette'

import 'maplibre-gl/dist/maplibre-gl.css'

const TILES = 'https://data.geopf.fr/tms/1.0.0/ADMIN_EXPRESS/{z}/{x}/{y}.pbf'
const LAYERS = ['commune', 'arrondissement_municipal'] as const

/** Le filtre qui ne garde que la commune choisie, ou aucune. */
const selected = (code?: string) =>
  ['==', ['get', 'code_insee'], code ?? ''] as never

/**
 * Cadrer la carte sur une commune : son emprise se lit dans les tuiles déjà
 * chargées. Si elle n'y est pas encore, la carte garde son cadre.
 */
function frame(instance: MapLibreMap, code?: string) {
  if (!code) return
  let west = Infinity,
    south = Infinity,
    east = -Infinity,
    north = -Infinity
  for (const layer of LAYERS) {
    for (const feature of instance.querySourceFeatures('admin', {
      sourceLayer: layer,
      filter: selected(code),
    })) {
      const geometry = feature.geometry
      const rings =
        geometry.type === 'Polygon'
          ? geometry.coordinates
          : geometry.type === 'MultiPolygon'
            ? geometry.coordinates.flat()
            : []
      for (const ring of rings)
        for (const [x, y] of ring) {
          west = Math.min(west, x)
          east = Math.max(east, x)
          south = Math.min(south, y)
          north = Math.max(north, y)
        }
    }
  }
  if (west === Infinity) return
  instance.fitBounds([west, south, east, north], {
    padding: 120,
    maxZoom: 9.5,
    duration: 800,
  })
}

type Props = {
  /** La classe de chaque code INSEE : son rang, ou -1 pour une absence. */
  classes: Map<string, number>
  /** La teinte de chaque classe, dans l'ordre. */
  colors: readonly string[]
  /** Le cadre affiché : la France, ou une région. */
  bounds?: [number, number, number, number]
  /** Le code INSEE de la commune choisie : la carte s'y cadre et l'entoure. */
  focus?: string
  onSelect: (territory: {
    code: string
    name: string
    level: 'commune' | 'municipal_district'
  }) => void
}

/**
 * La carte de France, commune par commune, sur le fond officiel de l'IGN
 * (ADMIN EXPRESS). Elle ne se dessine que dans le navigateur.
 */
export function IndicatorMap({
  classes,
  colors,
  bounds = FRANCE_BOUNDS,
  focus,
  onSelect,
}: Props) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<MapLibreMap | null>(null)
  const focusRef = useRef(focus)
  const select = useRef(onSelect)
  select.current = onSelect

  useEffect(() => {
    let cancelled = false
    void import('maplibre-gl').then((maplibregl) => {
      if (cancelled || !container.current) return
      const instance = new maplibregl.Map({
        container: container.current,
        bounds,
        attributionControl: { compact: true },
        style: {
          version: 8,
          sources: {
            admin: {
              type: 'vector',
              tiles: [TILES],
              minzoom: 2,
              maxzoom: 16,
              promoteId: {
                commune: 'code_insee',
                arrondissement_municipal: 'code_insee',
              },
              attribution: 'IGN, ADMIN EXPRESS',
            },
          },
          layers: [
            {
              id: 'fond',
              type: 'background',
              paint: { 'background-color': '#ffffff' },
            },
            ...LAYERS.map((layer) => ({
              id: layer,
              type: 'fill' as const,
              source: 'admin',
              'source-layer': layer,
              paint: {
                'fill-color': fillExpression(colors) as never,
                'fill-outline-color': 'rgba(255,255,255,0.15)',
              },
            })),
            {
              id: 'departements',
              type: 'line',
              source: 'admin',
              'source-layer': 'departement',
              paint: { 'line-color': '#ffffff', 'line-width': 0.8 },
            },
            ...LAYERS.map((layer) => ({
              id: `${layer}-choisie`,
              type: 'line' as const,
              source: 'admin',
              'source-layer': layer,
              filter: selected(focusRef.current),
              paint: { 'line-color': '#0f172a', 'line-width': 2.5 },
            })),
          ],
        },
      })
      instance.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        'top-right',
      )
      instance.on('click', [...LAYERS], (e: MapLayerMouseEvent) => {
        const props = e.features?.[0]?.properties as
          { code_insee?: string; nom_officiel?: string } | undefined
        if (props?.code_insee) {
          select.current({
            code: props.code_insee,
            name: props.nom_officiel ?? props.code_insee,
            level:
              e.features?.[0]?.layer.id === 'arrondissement_municipal'
                ? 'municipal_district'
                : 'commune',
          })
        }
      })
      for (const layer of LAYERS) {
        instance.on(
          'mouseenter',
          layer,
          () => (instance.getCanvas().style.cursor = 'pointer'),
        )
        instance.on(
          'mouseleave',
          layer,
          () => (instance.getCanvas().style.cursor = ''),
        )
      }
      map.current = instance
      instance.once('load', () => frame(instance, focusRef.current))
    })
    return () => {
      cancelled = true
      map.current?.remove()
      map.current = null
    }
    // La carte se crée une fois ; le cadre suit ensuite la région choisie.
  }, [])

  useEffect(() => {
    map.current?.fitBounds(bounds, { padding: 16, duration: 600 })
  }, [bounds])

  useEffect(() => {
    focusRef.current = focus
    const instance = map.current
    if (!instance?.isStyleLoaded()) return
    for (const layer of LAYERS)
      instance.setFilter(`${layer}-choisie`, selected(focus))
    // Après le cadrage sur la région, la commune choisie.
    instance.once('idle', () => frame(instance, focus))
  }, [focus, bounds])

  useEffect(() => {
    const paint = () => {
      const instance = map.current
      if (!instance) return
      for (const layer of LAYERS) {
        instance.setPaintProperty(
          layer,
          'fill-color',
          fillExpression(colors) as never,
        )
      }
      for (const layer of LAYERS)
        instance.removeFeatureState({ source: 'admin', sourceLayer: layer })
      for (const [code, cls] of classes) {
        for (const layer of LAYERS)
          instance.setFeatureState(
            { source: 'admin', sourceLayer: layer, id: code },
            { cls },
          )
      }
    }
    const instance = map.current
    if (instance?.isStyleLoaded()) paint()
    else {
      const timer = setInterval(() => {
        if (map.current?.isStyleLoaded()) {
          clearInterval(timer)
          paint()
        }
      }, 100)
      return () => clearInterval(timer)
    }
  }, [classes, colors])

  return (
    <div
      ref={container}
      className="h-[70vh] min-h-[420px] w-full overflow-hidden rounded-xl"
    />
  )
}
