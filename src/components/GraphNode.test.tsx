// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { cleanup, render, screen } from '@testing-library/react'
import type { NodeProps } from '@xyflow/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { GraphNode } from './GraphNode'
import type { FlowBoardNode } from '../types'

vi.mock('@xyflow/react', () => ({
  Handle: ({ className }: { className?: string }) => <div className={className} />,
  Position: {
    Left: 'left',
    Right: 'right',
  },
}))

afterEach(() => {
  cleanup()
})

function createProps(mode: 'viewer' | 'editor'): NodeProps<FlowBoardNode> {
  return {
    id: 'node-1',
    data: {
      kind: 'issue',
      githubUrl: 'https://github.com/octocat/Hello-World/issues/42',
      repoSlug: 'octocat/Hello-World',
      number: 42,
      title: 'Track navigation behavior',
      state: 'open',
      isOwnedByMe: true,
      mode,
    },
    selected: false,
  } as NodeProps<FlowBoardNode>
}

describe('GraphNode', () => {
  it('renders a GitHub view link in viewer mode', () => {
    render(<GraphNode {...createProps('viewer')} />)

    expect(screen.getByRole('link', { name: 'Open Issue #42 on GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/octocat/Hello-World/issues/42',
    )
    expect(screen.getByText('By me')).toBeInTheDocument()
  })

  it('does not render a GitHub link in editor mode', () => {
    render(<GraphNode {...createProps('editor')} />)

    expect(screen.queryByRole('link', { name: 'Open Issue #42 on GitHub' })).not.toBeInTheDocument()
    expect(screen.getByText('By me')).toBeInTheDocument()
  })
})
