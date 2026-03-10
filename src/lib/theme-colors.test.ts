/// <reference types="node" />

import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

const INDEX_CSS_URL = new URL('../index.css', import.meta.url)

function extractBlock(source: string, marker: string): string {
  const start = source.indexOf(marker)

  if (start === -1) {
    throw new Error(`Missing CSS block for ${marker}`)
  }

  const openingBrace = source.indexOf('{', start)

  if (openingBrace === -1) {
    throw new Error(`Missing opening brace for ${marker}`)
  }

  let depth = 0

  for (let index = openingBrace; index < source.length; index += 1) {
    const character = source[index]

    if (character === '{') {
      depth += 1
    } else if (character === '}') {
      depth -= 1

      if (depth === 0) {
        return source.slice(openingBrace + 1, index)
      }
    }
  }

  throw new Error(`Missing closing brace for ${marker}`)
}

function parseCustomProperties(block: string): Record<string, string> {
  const properties: Record<string, string> = {}

  for (const match of block.matchAll(/--([\w-]+):\s*([^;]+);/g)) {
    properties[`--${match[1]}`] = match[2].trim()
  }

  return properties
}

function resolveCustomProperties(properties: Record<string, string>): Record<string, string> {
  const resolved: Record<string, string> = {}
  const resolving = new Set<string>()

  const resolve = (name: string): string => {
    if (name in resolved) {
      return resolved[name]
    }

    if (resolving.has(name)) {
      return properties[name]
    }

    const value = properties[name]

    if (value === undefined) {
      throw new Error(`Missing custom property ${name}`)
    }

    resolving.add(name)
    const nextValue = value.replace(/var\((--[\w-]+)\)/g, (_, reference: string) => resolve(reference))
    resolving.delete(name)
    resolved[name] = nextValue
    return nextValue
  }

  for (const name of Object.keys(properties)) {
    resolve(name)
  }

  return resolved
}

function collectRelationshipMismatches(
  lightProperties: Record<string, string>,
  darkProperties: Record<string, string>,
): string[] {
  const names = Object.keys({ ...lightProperties, ...darkProperties }).sort()
  const mismatches: string[] = []

  for (let leftIndex = 0; leftIndex < names.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < names.length; rightIndex += 1) {
      const leftName = names[leftIndex]
      const rightName = names[rightIndex]
      const matchesInLight = lightProperties[leftName] === lightProperties[rightName]
      const matchesInDark = darkProperties[leftName] === darkProperties[rightName]

      if (matchesInLight !== matchesInDark) {
        mismatches.push(
          `${leftName} / ${rightName}: light=${lightProperties[leftName]} vs ${lightProperties[rightName]}, dark=${darkProperties[leftName]} vs ${darkProperties[rightName]}`,
        )
      }
    }
  }

  return mismatches
}

describe('theme color relationships', () => {
  const source = readFileSync(INDEX_CSS_URL, 'utf8')

  it('keeps explicit and system dark theme overrides aligned', () => {
    const explicitDarkOverrides = parseCustomProperties(extractBlock(source, ":root[data-theme='dark']"))
    const systemDarkBlock = extractBlock(source, '@media (prefers-color-scheme: dark)')
    const systemDarkOverrides = parseCustomProperties(extractBlock(systemDarkBlock, ':root:not([data-theme])'))

    expect(systemDarkOverrides).toEqual(explicitDarkOverrides)
  })

  it('matches light token equality relationships to the dark theme reference', () => {
    const lightDefaults = parseCustomProperties(extractBlock(source, ':root'))
    const darkOverrides = parseCustomProperties(extractBlock(source, ":root[data-theme='dark']"))
    const resolvedLight = resolveCustomProperties(lightDefaults)
    const resolvedDark = resolveCustomProperties({
      ...lightDefaults,
      ...darkOverrides,
    })

    expect(collectRelationshipMismatches(resolvedLight, resolvedDark)).toEqual([])
  })
})
