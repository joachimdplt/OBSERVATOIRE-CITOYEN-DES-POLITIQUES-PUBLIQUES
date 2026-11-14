#!/usr/bin/env node
/**
 * Le code en anglais, l'interface et les commentaires en français.
 *
 * Sur les projets précédents, un renommage global a transformé « Ajouter une
 * famille » en « Ajouter une family » et « Vérification du lien » en
 * « Vérification du linkTo ». Le compilateur ne voit rien : une chaîne reste
 * une chaîne. Ce script le voit.
 *
 *   node scripts/check-language.mjs
 *
 * Quatre contrôles, sur tout texte affiché :
 *   1. une phrase française qui contient un mot du code ;
 *   2. un mot de verdict sur une formation (mensonge, irréaliste…) ;
 *   3. les tournures « Ce qui… », « Ce qu'on… », « Ce que vous… » ;
 *   4. le tiret long, remplacé par deux-points, virgule ou parenthèses.
 * Les commentaires ne subissent que le premier.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

/** Les mots anglais du code qui n'ont rien à faire dans une phrase française. */
const CODE_WORDS = new RegExp(
  "\\b(indicators?|territory|territories|party|parties|dataset|datasets|"
  + "measures?(?=\\s)|provider|review|published|draft|import(?:ed|er)|"
  + "years?|months?|days?|linkTo|opened|saved|deleted|already|steps)\\b",
  "i",
)

/**
 * Le vocabulaire du verdict : l'observatoire montre, il ne juge pas une
 * formation (CONVENTIONS.md, section 1.5).
 */
const VERDICT_WORDS = /\b(mensonges?|mensong(?:er|ère)s?|menteurs?|contradictions?|irréalistes?|intenables?|crédibles?|crédibilité|sincères?|sincérité|démagogiques?|populistes?)\b/i

/** Les tournures qui annoncent au lieu de dire. */
const BANNED_PHRASING = /(?<!-)\bce (qu['’]|qui\b|que\b)/i
const EM_DASH = /\u2014/

/** Les marques d'une phrase française. */
const FRENCH = /[àâçéèêëîïôûùüÿœ]|\b(le|la|les|un|une|des|du|de|et|ou|qui|que|pas|sur|dans|pour|avec|par|on|se|ne|il|elle|ce|cette)\b/i

const ROOTS = ["site/src", "client/src", "backend/src", "app/src"]
const IGNORED = new Set(["node_modules", "dist", "build", ".git", "generated", ".output"])
const issues = []

function walk(dir) {
  for (const name of readdirSync(dir)) {
    if (IGNORED.has(name)) continue
    const path = join(dir, name)
    if (statSync(path).isDirectory()) { walk(path); continue }
    if (!/\.tsx?$/.test(name) || name === "routeTree.gen.ts") continue
    inspect(path)
  }
}

function inspect(path) {
  const lines = readFileSync(path, "utf8").split("\n")
  let inBlock = false
  lines.forEach((line, i) => {
    const trimmed = line.trim()
    if (trimmed.startsWith("/*") || trimmed.startsWith("{/*")) inBlock = true
    const isComment = inBlock || trimmed.startsWith("//") || trimmed.startsWith("*")
    if (trimmed.includes("*/")) inBlock = false
    if (trimmed.startsWith("import")) return

    // Un mot entre accents graves est une référence assumée au code.
    const withoutCode = line.replace(/`[^`]*`/g, "").replace(/\$\{[^}]*\}/g, "")

    if (isComment) {
      if (CODE_WORDS.test(withoutCode) && FRENCH.test(withoutCode)) {
        issues.push([path, i + 1, "commentaire", trimmed.slice(0, 70)])
      }
      return
    }
    // Le texte affiché : entre guillemets, ou entre deux balises en TSX.
    const strings = path.endsWith(".tsx")
      ? /"([^"]{6,120})"|>([^<>{}]{6,120})</g
      : /"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'/g
    for (const match of withoutCode.matchAll(strings)) {
      const text = (match[1] ?? match[2] ?? "").trim()
      if (text.length < 6) continue
      if (FRENCH.test(text) && CODE_WORDS.test(text)) {
        issues.push([path, i + 1, "mot du code", text.slice(0, 70)])
      }
      if (BANNED_PHRASING.test(text)) {
        issues.push([path, i + 1, "tournure bannie", text.slice(0, 70)])
      }
      if (VERDICT_WORDS.test(text)) {
        issues.push([path, i + 1, "mot de verdict", text.slice(0, 70)])
      }
      if (EM_DASH.test(text)) {
        issues.push([path, i + 1, "tiret long", text.slice(0, 70)])
      }
    }
  })
}

for (const root of ROOTS) if (existsSync(root)) walk(root)

if (issues.length === 0) {
  console.log("Langue : rien à signaler.")
  process.exit(0)
}
console.error(`${issues.length} phrase(s) à reprendre :\n`)
for (const [path, line, kind, text] of issues) {
  console.error(`  ${path}:${line}  ${kind}\n     ${text}`)
}
process.exit(1)
