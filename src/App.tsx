import {
  ConnectionLineType,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
  ReactFlow,
  type ReactFlowInstance,
} from '@xyflow/react'
import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type MouseEvent,
} from 'react'

import './App.css'
import { AddCardModal } from './components/AddCardModal'
import { GraphNode } from './components/GraphNode'
import { InspectorPanel } from './components/InspectorPanel'
import { RepoSelector } from './components/RepoSelector'
import { ThemeToggle } from './components/ThemeToggle'
import { APP_NAME, DEFAULT_BOARD_TITLE, LOCAL_DRAFT_STORAGE_KEY, THEME_STORAGE_KEY } from './constants'
import { createBoardSnapshot, createEmptyBoard, serializeBoardData } from './lib/board'
import { boardToFlowEdges, boardToFlowNodes, createBoardFromFlow, createDecoratedEdge } from './lib/flow'
import { getViewerRedirectPath, isViewerPath } from './lib/routing'
import {
  applyThemePreferenceToDocument,
  getSystemPrefersDark,
  loadThemePreference,
  resolveThemePreference,
  saveThemePreference,
  subscribeToSystemThemePreference,
} from './lib/theme'
import {
  clearDraftFromStorage,
  fetchBoardData,
  loadDraftFromStorage,
  publishBoardData,
  readBoardFile,
  saveDraftToStorage,
} from './lib/storage'
import type {
  AppMode,
  BoardData,
  BoardNodeKind,
  BoardNodeState,
  FlowBoardEdge,
  FlowBoardNode,
  SelectionState,
  ThemePreference,
} from './types'

const APP_MODE: AppMode = import.meta.env.VITE_APP_MODE === 'viewer' ? 'viewer' : 'editor'
const BOARD_DATA_PATH = import.meta.env.VITE_BOARD_DATA_PATH || '/board.json'
const VIEWER_TITLE = 'T3 Code PR Navigator'

const nodeTypes = {
  navigator: GraphNode,
}

function App() {
  const isEditor = APP_MODE === 'editor'
  const viewerRedirectPath = getViewerRedirectPath(window.location.pathname, APP_MODE)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const reactFlowRef = useRef<ReactFlowInstance<FlowBoardNode, FlowBoardEdge> | null>(null)

  const [meta, setMeta] = useState(createEmptyBoard().meta)
  const [nodes, setNodes] = useState<FlowBoardNode[]>([])
  const [edges, setEdges] = useState<FlowBoardEdge[]>([])
  const [selection, setSelection] = useState<SelectionState>(null)
  const [composerKind, setComposerKind] = useState<BoardNodeKind | null>(null)
  const [composerNumber, setComposerNumber] = useState('')
  const [composerTitle, setComposerTitle] = useState('')
  const [composerState, setComposerState] = useState<BoardNodeState | ''>('')
  const [composerIsOwnedByMe, setComposerIsOwnedByMe] = useState(false)
  const [composerError, setComposerError] = useState<string | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedRepo, setSelectedRepo] = useState('pingdotgg/t3code')
  const [loadError, setLoadError] = useState<string | null>(null)
  const [draftAvailable, setDraftAvailable] = useState(false)
  const [hasHydrated, setHasHydrated] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [themePreference, setThemePreference] = useState<ThemePreference>(() =>
    loadThemePreference(THEME_STORAGE_KEY),
  )
  const [systemPrefersDark, setSystemPrefersDark] = useState(() => getSystemPrefersDark())
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function showToast(message: string) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(message)
    toastTimer.current = setTimeout(() => setToast(null), 2500)
  }

  const deferredSelection = useDeferredValue(selection)
  const liveBoard = useMemo(() => createBoardFromFlow({ meta, nodes, edges }), [edges, meta, nodes])
  const resolvedTheme = useMemo(
    () => resolveThemePreference(themePreference, systemPrefersDark),
    [systemPrefersDark, themePreference],
  )

  const selectedNode = useMemo(
    () =>
      deferredSelection?.type === 'node'
        ? nodes.find((node) => node.id === deferredSelection.id)
        : undefined,
    [deferredSelection, nodes],
  )
  const selectedEdge = useMemo(
    () =>
      deferredSelection?.type === 'edge'
        ? edges.find((edge) => edge.id === deferredSelection.id)
        : undefined,
    [deferredSelection, edges],
  )

  const edgeContext = useMemo(() => {
    if (!selectedEdge) {
      return { leftLabel: null, rightLabel: null, edgeReadsLeftToRight: true }
    }

    const leftNode = nodes.find((node) => node.id === selectedEdge.source)
    const rightNode = nodes.find((node) => node.id === selectedEdge.target)

    return {
      leftLabel: leftNode ? `${leftNode.data.repoSlug} #${leftNode.data.number}` : null,
      rightLabel: rightNode ? `${rightNode.data.repoSlug} #${rightNode.data.number}` : null,
      edgeReadsLeftToRight:
        !leftNode || !rightNode ? true : isNodePositionLeftToRight(leftNode, rightNode),
    }
  }, [nodes, selectedEdge])

  const applyLoadedBoardEvent = useEffectEvent((board: BoardData, markDirty: boolean) => {
    applyLoadedBoard(board, markDirty)
  })

  const handleSelectionChange = useCallback(
    ({ nodes: selectedNodes, edges: selectedEdges }: { nodes: FlowBoardNode[]; edges: FlowBoardEdge[] }) => {
      if (selectedNodes.length > 0) {
        setSelection({ type: 'node', id: selectedNodes[0].id })
        return
      }

      if (selectedEdges.length > 0) {
        setSelection({ type: 'edge', id: selectedEdges[0].id })
        return
      }

      setSelection(null)
    },
    [],
  )

  const handleNodeClick = useCallback((event: MouseEvent, node: FlowBoardNode) => {
    if (isEditor) {
      return
    }

    event.preventDefault()
    window.open(node.data.githubUrl, '_blank', 'noopener,noreferrer')
  }, [isEditor])

  useEffect(() => {
    return subscribeToSystemThemePreference(setSystemPrefersDark)
  }, [])

  useEffect(() => {
    applyThemePreferenceToDocument(themePreference)
    saveThemePreference(THEME_STORAGE_KEY, themePreference)
  }, [themePreference])

  useEffect(() => {
    if (!viewerRedirectPath) {
      return
    }

    const { search, hash } = window.location
    window.location.replace(`${viewerRedirectPath}${search}${hash}`)
  }, [viewerRedirectPath])

  useEffect(() => {
    document.title =
      APP_MODE === 'viewer' && isViewerPath(window.location.pathname) ? VIEWER_TITLE : APP_NAME
  }, [viewerRedirectPath])

  useEffect(() => {
    if (viewerRedirectPath) {
      return
    }

    let cancelled = false

    async function hydrateBoard() {
      try {
        const canonicalBoard = await fetchBoardData(BOARD_DATA_PATH)

        if (cancelled) {
          return
        }

        let hasLocalDraft = false

        applyLoadedBoardEvent(canonicalBoard, false)

        if (isEditor) {
          const draftBoard = loadDraftFromStorage(LOCAL_DRAFT_STORAGE_KEY)
          if (
            draftBoard &&
            serializeBoardData(draftBoard) !== serializeBoardData(canonicalBoard)
          ) {
            hasLocalDraft = true
            applyLoadedBoardEvent(draftBoard, true)
          }
        }

        setDraftAvailable(hasLocalDraft)
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unable to load the published board data.'

        if (cancelled) {
          return
        }

        if (isEditor) {
          setDraftAvailable(false)
          applyLoadedBoardEvent(createEmptyBoard(DEFAULT_BOARD_TITLE), false)
        } else {
          setLoadError(message)
        }
      } finally {
        if (!cancelled) {
          setHasHydrated(true)
        }
      }
    }

    void hydrateBoard()

    return () => {
      cancelled = true
    }
  }, [isEditor, viewerRedirectPath])

  useEffect(() => {
    if (!hasHydrated || !isEditor || !isDirty) {
      return
    }

    saveDraftToStorage(
      LOCAL_DRAFT_STORAGE_KEY,
      createBoardSnapshot({
        meta: liveBoard.meta,
        nodes: liveBoard.nodes,
        edges: liveBoard.edges,
      }),
    )
    setDraftAvailable(true)
  }, [hasHydrated, isDirty, isEditor, liveBoard])

  useEffect(() => {
    if (!selection) {
      return
    }

    if (selection.type === 'node' && !nodes.some((node) => node.id === selection.id)) {
      setSelection(null)
      return
    }

    if (selection.type === 'edge' && !edges.some((edge) => edge.id === selection.id)) {
      setSelection(null)
    }
  }, [edges, nodes, selection])

  if (viewerRedirectPath) {
    return null
  }

  function focusBoard(duration = 320) {
    reactFlowRef.current?.fitView({
      padding: isEditor ? 0.18 : 0.14,
      duration,
    })
  }

  function applyLoadedBoard(board: BoardData, markDirty: boolean) {
    startTransition(() => {
      setMeta(board.meta)
      setNodes(boardToFlowNodes(board, APP_MODE))
      setEdges(boardToFlowEdges(board))
      setSelection(null)
      setIsDirty(markDirty)
      setShowAddModal(false)
      setComposerKind(null)
      setComposerNumber('')
      setComposerTitle('')
      setComposerState('')
      setComposerIsOwnedByMe(false)
      setComposerError(null)
      setLoadError(null)
    })

    requestAnimationFrame(() => {
      focusBoard(360)
    })
  }

  function handleNodesChange(changes: NodeChange<FlowBoardNode>[]) {
    setNodes((currentNodes) => applyNodeChanges(changes, currentNodes))

    if (changes.some(isMutatingNodeChange)) {
      setIsDirty(true)
    }
  }

  function handleEdgesChange(changes: EdgeChange<FlowBoardEdge>[]) {
    setEdges((currentEdges) => applyEdgeChanges(changes, currentEdges))

    if (changes.some(isMutatingEdgeChange)) {
      setIsDirty(true)
    }
  }

  function handleConnect(connection: Connection) {
    if (!isEditor || !connection.source || !connection.target) {
      return
    }

    const leftNode = nodes.find((node) => node.id === connection.source)
    const rightNode = nodes.find((node) => node.id === connection.target)

    if (!leftNode || !rightNode || !isNodePositionLeftToRight(leftNode, rightNode)) {
      showToast('Connect the left item to the right item')
      return
    }

    const baseEdge = createDecoratedEdge({
      id: createId('edge'),
      source: connection.source,
      target: connection.target,
      data: {
        kind: 'relates_to',
      },
    })

    setEdges((currentEdges) => [...currentEdges, baseEdge])
    setIsDirty(true)
  }

  function handleCreateNode() {
    if (!composerKind) {
      return
    }

    const num = Number(composerNumber.trim())
    if (!Number.isInteger(num) || num <= 0) {
      setComposerError('Enter a valid issue or PR number.')
      return
    }

    const resource = composerKind === 'issue' ? 'issues' : 'pull'
    const position = getSuggestedPosition(nodes.length, canvasRef.current, reactFlowRef.current)
    const newNode: FlowBoardNode = {
      id: createId('node'),
      type: 'navigator',
      position,
      data: {
        kind: composerKind,
        githubUrl: `https://github.com/${selectedRepo}/${resource}/${num}`,
        repoSlug: selectedRepo,
        number: num,
        title: composerTitle.trim(),
        state: composerState || undefined,
        isOwnedByMe: composerIsOwnedByMe || undefined,
        mode: APP_MODE,
      },
    }

    setNodes((currentNodes) => [...currentNodes, newNode])
    setSelection({ type: 'node', id: newNode.id })
    setShowAddModal(false)
    setComposerKind(null)
    setComposerNumber('')
    setComposerTitle('')
    setComposerState('')
    setComposerIsOwnedByMe(false)
    setComposerError(null)
    setIsDirty(true)
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    try {
      const importedBoard = await readBoardFile(file)
      applyLoadedBoard(importedBoard, true)
      showToast('Imported')
    } catch {
      showToast('Import failed')
    }
  }

  async function handlePublish() {
    try {
      const snapshot = createBoardSnapshot({
        meta: liveBoard.meta,
        nodes: liveBoard.nodes,
        edges: liveBoard.edges,
      })

      await publishBoardData(snapshot)
      clearDraftFromStorage(LOCAL_DRAFT_STORAGE_KEY)
      setDraftAvailable(false)
      setIsDirty(false)
      showToast('Published')
    } catch {
      showToast('Publish failed')
    }
  }

  function handleClearDraft() {
    clearDraftFromStorage(LOCAL_DRAFT_STORAGE_KEY)
    setDraftAvailable(false)
    showToast('Draft cleared')
  }

  function updateSelectedNode(updater: (node: FlowBoardNode) => FlowBoardNode) {
    if (!selectedNode) {
      return
    }

    setNodes((currentNodes) =>
      currentNodes.map((node) => (node.id === selectedNode.id ? updater(node) : node)),
    )
    setIsDirty(true)
  }

  function updateSelectedEdge(updater: (edge: FlowBoardEdge) => FlowBoardEdge) {
    if (!selectedEdge) {
      return
    }

    setEdges((currentEdges) =>
      currentEdges.map((edge) => (edge.id === selectedEdge.id ? updater(edge) : edge)),
    )
    setIsDirty(true)
  }

  function deleteSelectedNode() {
    if (!selectedNode) {
      return
    }

    setNodes((currentNodes) => currentNodes.filter((node) => node.id !== selectedNode.id))
    setEdges((currentEdges) =>
      currentEdges.filter(
        (edge) => edge.source !== selectedNode.id && edge.target !== selectedNode.id,
      ),
    )
    setSelection(null)
    setIsDirty(true)
  }

  function deleteSelectedEdge() {
    if (!selectedEdge) {
      return
    }

    setEdges((currentEdges) => currentEdges.filter((edge) => edge.id !== selectedEdge.id))
    setSelection(null)
    setIsDirty(true)
  }

  if (loadError) {
    return (
      <main className="app-shell app-shell--error">
        <div className="app-error">
          <p className="app-error__kicker">Viewer unavailable</p>
          <h1 className="app-error__title">{loadError}</h1>
          <p className="app-error__body">
            Confirm that <code>{BOARD_DATA_PATH}</code> exists in the deployed site and matches the
            v1 board schema.
          </p>
        </div>
      </main>
    )
  }

  function openAddModal(kind: BoardNodeKind = 'issue') {
    setComposerKind(kind)
    setComposerState(kind === 'issue' ? 'open' : 'draft')
    setComposerIsOwnedByMe(false)
    setComposerNumber('')
    setComposerTitle('')
    setComposerError(null)
    setShowAddModal(true)
  }

  function closeAddModal() {
    setShowAddModal(false)
    setComposerKind(null)
    setComposerNumber('')
    setComposerTitle('')
    setComposerState('')
    setComposerIsOwnedByMe(false)
    setComposerError(null)
  }

  return (
    <main className="app-shell">
      <section className={`board-stage board-stage--${APP_MODE}`}>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          hidden
          onChange={handleImportFile}
        />

        <div className="board-canvas" ref={canvasRef}>
          <ReactFlow<FlowBoardNode, FlowBoardEdge>
            fitView
            className="board-flow"
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            onInit={(instance) => {
              reactFlowRef.current = instance
            }}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onConnect={handleConnect}
            onNodeClick={handleNodeClick}
            onSelectionChange={handleSelectionChange}
            isValidConnection={(connection) => {
              if (!connection.source || !connection.target) {
                return false
              }

              const leftNode = nodes.find((node) => node.id === connection.source)
              const rightNode = nodes.find((node) => node.id === connection.target)

              return !!leftNode && !!rightNode && isNodePositionLeftToRight(leftNode, rightNode)
            }}
            edgesReconnectable={isEditor}
            nodesDraggable={isEditor}
            nodesConnectable={isEditor}
            elementsSelectable={isEditor}
            deleteKeyCode={isEditor ? ['Delete', 'Backspace'] : null}
            proOptions={{ hideAttribution: true }}
            panOnDrag
            connectionLineType={ConnectionLineType.Step}
            minZoom={0.35}
            maxZoom={1.6}
            fitViewOptions={{
              padding: isEditor ? 0.18 : 0.14,
            }}
            defaultEdgeOptions={{
              reconnectable: isEditor,
            }}
          />
        </div>

        {isEditor ? (
          <button
            className="fab-add"
            type="button"
            onClick={() => openAddModal('issue')}
            aria-label="Add card"
          >
            +
          </button>
        ) : null}

        <div className="board-actions-right">
          <ThemeToggle
            preference={themePreference}
            resolvedTheme={resolvedTheme}
            onPreferenceChange={setThemePreference}
          />
          {isEditor ? (
            <>
              <button className="hud-button" type="button" onClick={handlePublish} disabled={!isDirty}>
                Publish
              </button>
              <button className="hud-button" type="button" onClick={() => fileInputRef.current?.click()}>
                Import
              </button>
              <button className="hud-button" type="button" onClick={handleClearDraft} disabled={!draftAvailable}>
                Clear draft
              </button>
            </>
          ) : null}
        </div>

        <RepoSelector selectedRepo={selectedRepo} onRepoChange={setSelectedRepo} />

        {!isEditor ? (
          <aside className="viewer-legend" aria-label="Legend">
            <span className="viewer-legend__swatch" aria-hidden="true" />
            <p className="viewer-legend__text">Bright border means this issue or PR is by me.</p>
          </aside>
        ) : null}

        {isEditor ? (
          <InspectorPanel
            selectedNode={selectedNode}
            selectedEdge={selectedEdge}
            leftLabel={edgeContext.leftLabel}
            rightLabel={edgeContext.rightLabel}
            edgeReadsLeftToRight={edgeContext.edgeReadsLeftToRight}
            onNodeTitleChange={(value) =>
              updateSelectedNode((node) => ({
                ...node,
                data: {
                  ...node.data,
                  title: value,
                },
              }))
            }
            onNodeStateChange={(value) =>
              updateSelectedNode((node) => ({
                ...node,
                data: {
                  ...node.data,
                  state: value || undefined,
                },
              }))
            }
            onNodeOwnedByMeChange={(value) =>
              updateSelectedNode((node) => ({
                ...node,
                data: {
                  ...node.data,
                  isOwnedByMe: value || undefined,
                },
              }))
            }
            onNodeDelete={deleteSelectedNode}
            onEdgeKindChange={(value) =>
              updateSelectedEdge((edge) =>
                createDecoratedEdge({
                  id: edge.id,
                  source: edge.source,
                  target: edge.target,
                  data: {
                    ...edge.data,
                    kind: value,
                  },
                }),
              )
            }
            onEdgeLabelChange={(value) =>
              updateSelectedEdge((edge) =>
                createDecoratedEdge({
                  id: edge.id,
                  source: edge.source,
                  target: edge.target,
                  data: {
                    kind: edge.data?.kind ?? 'relates_to',
                    label: value,
                  },
                }),
              )
            }
            onEdgeDelete={deleteSelectedEdge}
          />
        ) : null}

        {isEditor && showAddModal && composerKind ? (
          <AddCardModal
            composerKind={composerKind}
            composerNumber={composerNumber}
            composerTitle={composerTitle}
            composerState={composerState}
            composerIsOwnedByMe={composerIsOwnedByMe}
            composerError={composerError}
            selectedRepo={selectedRepo}
            onKindChange={(kind) => {
              setComposerKind(kind)
              setComposerState(kind === 'issue' ? 'open' : 'draft')
            }}
            onNumberChange={(value) => {
              setComposerNumber(value)
              if (composerError) {
                setComposerError(null)
              }
            }}
            onTitleChange={setComposerTitle}
            onStateChange={setComposerState}
            onIsOwnedByMeChange={setComposerIsOwnedByMe}
            onSubmit={handleCreateNode}
            onClose={closeAddModal}
          />
        ) : null}

        {toast ? (
          <div className="toast" key={toast}>
            {toast}
          </div>
        ) : null}
      </section>
    </main>
  )
}

function isMutatingNodeChange(change: NodeChange<FlowBoardNode>): boolean {
  return change.type !== 'select'
}

function isMutatingEdgeChange(change: EdgeChange<FlowBoardEdge>): boolean {
  return change.type !== 'select'
}

function getSuggestedPosition(
  index: number,
  canvas: HTMLDivElement | null,
  reactFlow: ReactFlowInstance<FlowBoardNode, FlowBoardEdge> | null,
) {
  const columns = 3
  const horizontalGap = 260
  const verticalGap = 182
  const baseX = 120 + (index % columns) * horizontalGap
  const baseY = 90 + Math.floor(index / columns) * verticalGap

  if (!canvas || !reactFlow) {
    return { x: baseX, y: baseY }
  }

  const bounds = canvas.getBoundingClientRect()
  const offsetX = Math.max((bounds.width - columns * horizontalGap) / 2, 0)
  const viewportPosition = {
    x: baseX + offsetX,
    y: baseY,
  }

  return reactFlow.screenToFlowPosition(viewportPosition)
}

function isNodePositionLeftToRight(leftNode: FlowBoardNode, rightNode: FlowBoardNode) {
  return leftNode.id !== rightNode.id && leftNode.position.x < rightNode.position.x
}

function createId(prefix: 'node' | 'edge') {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

export default App
