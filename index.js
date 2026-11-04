/**
 * DeepSeek Harness skill provider for the Emacs integration skills in `skills/`.
 *
 * The skills stay exactly where the Claude Code and CodeBuddy manifests point,
 * so one checkout serves all three harnesses. This module only makes them
 * discoverable through `ctx.skills`: it lists every `skills/<name>/SKILL.md`
 * directory bundle and loads its body on demand.
 *
 * @module dsh-emacs-skills
 */

import { readdir, readFile } from 'node:fs/promises'
import { dirname, join, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Cordis plugin name. */
export const name = 'emacs-skills'

/** Service required before `apply` runs. */
export const inject = ['skills']

/** Absolute `skills/` directory shipped next to this module. */
const SKILLS_ROOT = join(dirname(fileURLToPath(import.meta.url)), 'skills')

/** Discovery rank, matching the local provider's bundled tier. */
const RANK = 600

/**
 * Read YAML frontmatter and the remaining body from a skill file.
 *
 * Only the flat scalar form these skills use is supported, which keeps the
 * package dependency-free. Values may be single- or double-quoted.
 * @param raw - full `SKILL.md` contents.
 * @returns the parsed fields plus the body after the closing fence.
 */
function parseFrontmatter(raw) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u.exec(raw)
  if (match === null) return { data: {}, body: raw }
  const data = {}
  for (const line of match[1].split(/\r?\n/u)) {
    const field = /^([A-Za-z][\w-]*):\s*(.*)$/u.exec(line)
    if (field === null) continue
    let value = field[2].trim()
    const quoted = (value.startsWith("'") && value.endsWith("'"))
      || (value.startsWith('"') && value.endsWith('"'))
    if (quoted) value = value.slice(1, -1).replace(/''/gu, "'")
    data[field[1]] = value
  }
  return { data, body: raw.slice(match[0].length) }
}

/**
 * Resolve the invocation policy from the Claude Code/CodeBuddy frontmatter keys.
 * @param data - parsed frontmatter fields.
 * @returns model and user surfaces for this skill.
 */
function invocationFor(data) {
  return {
    modelInvocable: data['disable-model-invocation'] !== 'true',
    userInvocable: data['user-invocable'] !== 'false',
  }
}

/**
 * Register every directory bundle under `skills/` with the skill registry.
 * @param ctx - Cordis context carrying `skills`.
 * @param config - optional overrides; `skillsRoot` defaults to the packaged tree.
 */
export async function apply(ctx, config = {}) {
  const root = config.skillsRoot ?? SKILLS_ROOT
  const provider = {
    name: 'emacs-skills',
    async list() {
      const entries = await readdir(root, { withFileTypes: true })
      const candidates = []
      for (const entry of entries) {
        if (!entry.isDirectory()) continue
        const directory = join(root, entry.name)
        const path = join(directory, 'SKILL.md')
        let raw
        try {
          raw = await readFile(path, 'utf8')
        } catch {
          // `xcode-shared` holds a shared resource bundle, not a skill.
          continue
        }
        const { data } = parseFrontmatter(raw)
        if (typeof data.name !== 'string' || typeof data.description !== 'string') {
          ctx.logger.warn(`emacs-skills: ${path} ignored: frontmatter requires name and description`)
          continue
        }
        const invocation = invocationFor(data)
        candidates.push({
          name: data.name,
          description: data.description,
          ...data.whenToUse === undefined ? {} : { whenToUse: data.whenToUse },
          invocation,
          provider: 'emacs-skills',
          source: 'bundled',
          rank: RANK,
          resourceBase: { kind: 'directory', path: directory.split(sep).join('/') },
          locator: path,
        })
      }
      return candidates
    },
    async get(candidate, options) {
      const raw = await readFile(candidate.locator, { encoding: 'utf8', signal: options.signal })
      const { rank: _rank, locator: _locator, ...summary } = candidate
      return { ...summary, content: parseFrontmatter(raw).body.trim() }
    },
  }
  ctx.skills.registerProvider(() => provider)
}
