import {
  applyEdgeChanges,
  applyNodeChanges,
  Background,
  Controls,
  type Connection,
  type EdgeChange,
  type NodeChange,
  ReactFlow,
  type ReactFlowInstance,
} from '@xyflow/react'
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from 'react'

import './App.css'
import { GraphNode } from './components/GraphNode'
import { InspectorPanel } from './components/InspectorPanel'
import { Toolbar } from './components/Toolbar'
import { DEFAULT_BOARD_TITLE, LOCAL_DRAFT_STORAGE_KEY } from './constants'
import { createBoardSnapshot, createEmptyBoard, serializeBoardData } from './lib/board'
import { boardToFlowEdges, boardToFlowNodes, createBoardFromFlow, createDecoratedEdge } from './lib/flow'
import { parseGitHubResourceUrl } from './lib/github'
import {
  clearDraftFromStorage,
  downloadBoardFile,
  fetchBoardData,
  loadDraftFromStorage,
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
} from './types'

const APP_MODE: AppMode = import.meta.env.VITE_APP_MODE === 'viewer' ? 'viewer' : 'editor'
const BOARD_DATA_PATH = import.meta.env.VITE_BOARD_DATA_PATH || '/board.json'

const nodeTypes = {
  navigator: GraphNode,
}

function App() {
  const isEditor = APP_MODE === 'editor'
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const reactFlowRef = useRef<ReactFlowInstance<FlowBoardNode, FlowBoardEdge> | null>(null)

  const [meta, setMeta] = useState(createEmptyBoard().meta)
  const [nodes, setNodes] = useState<FlowBoardNode[]>([])
  const [edges, setEdges] = useState<FlowBoardEdge[]>([])
  const [selection, setSelection] = useState<SelectionState>(null)
  const [composerKind, setComposerKind] = useState<BoardNodeKind | null>(null)
  const [composerUrl, setComposerUrl] = useState('')
  const [composerTitle, setComposerTitle] = useState('')
  const [composerState, setComposerState] = useState<BoardNodeState | ''>('')
  const [composerError, setComposerError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [draftAvailable, setDraftAvailable] = useState(false)
  const [draftReadyToLoad, setDraftReadyToLoad] = useState<BoardData | null>(null)
  const [hasHydrated, setHasHydrated] = useState(false)
  const [isDirty, setIsDirty] = useState(false)

  const deferredSelection = useDeferredValue(selection)
  const liveBoard = useMemo(() => createBoardFromFlow({ meta, nodes, edges }), [edges, meta, nodes])

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
      return { sourceLabel: null, targetLabel: null }
    }

    const sourceNode = nodes.find((node) => node.id === selectedEdge.source)
    const targetNode = nodes.find((node) => node.id === selectedEdge.target)

    return {
      sourceLabel: sourceNode ? `${sourceNode.data.repoSlug} #${sourceNode.data.number}` : null,
      targetLabel: targetNode ? `${targetNode.data.repoSlug} #${targetNode.data.number}` : null,
    }
  }, [nodes, selectedEdge])

  useEffect(() => {
    let cancelled = false

    async function hydrateBoard() {
      try {
        const canonicalBoard = await fetchBoardData(BOARD_DATA_PATH)

        if (cancelled) {
          return
        }

        applyLoadedBoard(canonicalBoard, false)

        if (isEditor) {
          const draftBoard = loadDraftFromStorage(LOCAL_DRAFT_STORAGE_KEY)
          if (
            draftBoard &&
            serializeBoardData(draftBoard) !== serializeBoardData(canonicalBoard)
          ) {
            setDraftReadyToLoad(draftBoard)
            setDraftAvailable(true)
            setStatusMessage('Published board loaded. A newer local draft is available.')
          } else {
            setDraftAvailable(Boolean(draftBoard))
          }
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Unable to load the published board data.'

        if (cancelled) {
          return
        }

        if (isEditor) {
          applyLoadedBoard(createEmptyBoard(DEFAULT_BOARD_TITLE), false)
          setStatusMessage(`${message} Starting with a blank local board.`)
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
  }, [isEditor])

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

  function applyLoadedBoard(board: BoardData, markDirty: boolean) {
    startTransition(() => {
      setMeta(board.meta)
      setNodes(boardToFlowNodes(board, APP_MODE))
      setEdges(boardToFlowEdges(board))
      setSelection(null)
      setIsDirty(markDirty)
      setComposerKind(null)
      setComposerUrl('')
      setComposerTitle('')
      setComposerState('')
      setComposerError(null)
      setLoadError(null)
    })

    requestAnimationFrame(() => {
      reactFlowRef.current?.fitView({
        padding: 0.16,
        duration: 350,
      })
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

    const baseEdge = createDecoratedEdge({
      id: createId('edge'),
      source: connection.source,
      target: connection.target,
      data: {
        kind: 'relates',
      },
    })

    setEdges((currentEdges) => [...currentEdges, baseEdge])
    setIsDirty(true)
    setStatusMessage('Connection added. Fine-tune it in the inspector.')
  }

  function handleCreateNode() {
    if (!composerKind) {
      return
    }

    try {
      const parsed = parseGitHubResourceUrl(composerUrl, composerKind)
      const position = getSuggestedPosition(nodes.length, canvasRef.current, reactFlowRef.current)
      const newNode: FlowBoardNode = {
        id: createId('node'),
        type: 'navigator',
        position,
        data: {
          ...parsed,
          title: composerTitle.trim(),
          state: composerState || undefined,
          mode: APP_MODE,
        },
      }

      setNodes((currentNodes) => [...currentNodes, newNode])
      setSelection({ type: 'node', id: newNode.id })
      setComposerKind(null)
      setComposerUrl('')
      setComposerTitle('')
      setComposerState('')
      setComposerError(null)
      setIsDirty(true)
      setStatusMessage(`${newNode.data.kind === 'issue' ? 'Issue' : 'PR'} added to the board.`)
    } catch (error) {
      setComposerError(error instanceof Error ? error.message : 'Unable to create the node.')
    }
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
      setStatusMessage(`Imported "${file.name}".`)
      setDraftReadyToLoad(null)
      setDraftAvailable(true)
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : 'Import failed.')
    }
  }

  function handleExportBoard() {
    downloadBoardFile(
      createBoardSnapshot({
        meta: liveBoard.meta,
        nodes: liveBoard.nodes,
        edges: liveBoard.edges,
      }),
    )
    setStatusMessage('Board exported as board.json.')
  }

  function handleLoadDraft() {
    if (!draftReadyToLoad) {
      return
    }

    applyLoadedBoard(draftReadyToLoad, true)
    setStatusMessage('Local draft loaded into the editor.')
    setDraftReadyToLoad(null)
    setDraftAvailable(true)
  }

  function handleDismissDraft() {
    setDraftReadyToLoad(null)
  }

  function handleClearDraft() {
    clearDraftFromStorage(LOCAL_DRAFT_STORAGE_KEY)
    setDraftAvailable(false)
    setDraftReadyToLoad(null)
    setStatusMessage('Local draft cleared.')
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
          <p className="app-error__kicker">Unable to load board</p>
          <h1 className="app-error__title">{loadError}</h1>
          <p className="app-error__body">
            Confirm that <code>{BOARD_DATA_PATH}</code> exists in the deployed site and matches the
            v1 board schema.
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="app-shell">
      <Toolbar
        mode={APP_MODE}
        title={meta.title}
        updatedAt={formatTimestamp(meta.updatedAt)}
        composerKind={composerKind}
        composerUrl={composerUrl}
        composerTitle={composerTitle}
        composerState={composerState}
        composerError={composerError}
        draftAvailable={draftAvailable}
        statusMessage={statusMessage}
        onTitleChange={(value) => {
          setMeta((currentMeta) => ({ ...currentMeta, title: value || DEFAULT_BOARD_TITLE }))
          setIsDirty(true)
        }}
        onOpenComposer={(kind) => {
          setComposerKind(kind)
          setComposerState(kind === 'issue' ? 'open' : 'draft')
          setComposerUrl('')
          setComposerTitle('')
          setComposerError(null)
        }}
        onCloseComposer={() => {
          setComposerKind(null)
          setComposerUrl('')
          setComposerTitle('')
          setComposerState('')
          setComposerError(null)
        }}
        onComposerUrlChange={(value) => {
          setComposerUrl(value)
          if (composerError) {
            setComposerError(null)
          }
        }}
        onComposerTitleChange={setComposerTitle}
        onComposerStateChange={setComposerState}
        onComposerSubmit={handleCreateNode}
        onImportClick={() => fileInputRef.current?.click()}
        onExportClick={handleExportBoard}
        onClearDraftClick={handleClearDraft}
      />

      {isEditor && draftReadyToLoad ? (
        <section className="draft-banner">
          <div>
            <p className="draft-banner__eyebrow">Local draft detected</p>
            <p className="draft-banner__body">
              A saved local draft exists and does not match the published board.
            </p>
          </div>
          <div className="draft-banner__actions">
            <button className="toolbar-button" type="button" onClick={handleLoadDraft}>
              Load draft
            </button>
            <button className="toolbar-button toolbar-button--ghost" type="button" onClick={handleDismissDraft}>
              Ignore
            </button>
          </div>
        </section>
      ) : null}

      <section className="board-shell">
        <div className="board-canvas" ref={canvasRef}>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json"
            hidden
            onChange={handleImportFile}
          />

          {!hasHydrated ? (
            <div className="canvas-empty-state">
              <p className="canvas-empty-state__eyebrow">Loading board</p>
              <h2>Preparing the canvas</h2>
            </div>
          ) : null}

          {hasHydrated && nodes.length === 0 ? (
            <div className="canvas-empty-state">
              <p className="canvas-empty-state__eyebrow">Start the map</p>
              <h2>Paste a GitHub issue or PR, then place it on the board.</h2>
              <p>
                Keep the published site read-only. Edit locally, export <code>board.json</code>,
                and redeploy when you want to publish changes.
              </p>
            </div>
          ) : null}

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
            onSelectionChange={({ nodes: selectedNodes, edges: selectedEdges }) => {
              if (selectedNodes.length > 0) {
                setSelection({ type: 'node', id: selectedNodes[0].id })
                return
              }

              if (selectedEdges.length > 0) {
                setSelection({ type: 'edge', id: selectedEdges[0].id })
                return
              }

              setSelection(null)
            }}
            edgesReconnectable={isEditor}
            nodesDraggable={isEditor}
            nodesConnectable={isEditor}
            deleteKeyCode={isEditor ? ['Delete', 'Backspace'] : null}
            selectionOnDrag={false}
            panOnScroll
            panOnDrag={[1, 2]}
            minZoom={0.35}
            maxZoom={1.8}
            defaultEdgeOptions={{
              reconnectable: isEditor,
            }}
            proOptions={{
              hideAttribution: true,
            }}
          >
            <Background color="#d9d3c5" gap={32} size={1} />
            <Controls showInteractive={false} position="bottom-left" />
          </ReactFlow>
        </div>

        {isEditor ? (
          <InspectorPanel
            selectedNode={selectedNode}
            selectedEdge={selectedEdge}
            sourceLabel={edgeContext.sourceLabel}
            targetLabel={edgeContext.targetLabel}
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
            onNodeDelete={deleteSelectedNode}
            onEdgeKindChange={(value) =>
              updateSelectedEdge((edge) =>
                createDecoratedEdge({
                  id: edge.id,
                  source: edge.source,
                  target: edge.target,
                  data: {
                    kind: value,
                    label: edge.data?.label,
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
                    kind: edge.data?.kind ?? 'relates',
                    label: value,
                  },
                }),
              )
            }
            onEdgeDelete={deleteSelectedEdge}
          />
        ) : null}
      </section>
    </main>
  )
}

function isMutatingNodeChange(change: NodeChange<FlowBoardNode>): boolean {
  return change.type !== 'select' && change.type !== 'dimensions'
}

function isMutatingEdgeChange(change: EdgeChange<FlowBoardEdge>): boolean {
  return change.type !== 'select'
}

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp)

  if (Number.isNaN(date.getTime())) {
    return 'Unknown'
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function createId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}

function getSuggestedPosition(
  index: number,
  container: HTMLDivElement | null,
  reactFlow: ReactFlowInstance<FlowBoardNode, FlowBoardEdge> | null,
) {
  const offset = (index % 5) * 24

  if (!container || !reactFlow) {
    return {
      x: 140 + offset,
      y: 140 + offset,
    }
  }

  const bounds = container.getBoundingClientRect()
  const centerPoint = reactFlow.screenToFlowPosition({
    x: bounds.left + bounds.width / 2,
    y: bounds.top + bounds.height / 2,
  })

  return {
    x: centerPoint.x - 120 + offset,
    y: centerPoint.y - 78 + offset,
  }
}

export default App
