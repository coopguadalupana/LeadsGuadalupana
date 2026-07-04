"use client";

import { useCallback, useRef, useState, useMemo, useEffect } from "react";
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  MiniMap,
  type Node,
  type Edge,
  type Connection,
  type NodeTypes,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { FlowStep, FlowTrigger } from "@/lib/flows/types";
import { StepNode } from "./StepNode";
import { TriggerPanel } from "./TriggerPanel";
import { NodeEditor } from "./NodeEditor";

type StepType = FlowStep["tipo"];

interface FlowBuilderProps {
  initialNombre?: string;
  initialTrigger?: FlowTrigger;
  initialPasos?: FlowStep[];
  onSave: (data: { nombre: string; trigger: FlowTrigger; pasos: FlowStep[] }) => void;
  saving?: boolean;
}

const STEP_TYPES: Array<{ tipo: StepType; label: string; color: string; icon: string }> = [
  { tipo: "send_text", label: "Enviar texto", color: "#0e5bb0", icon: "💬" },
  { tipo: "ask_question", label: "Preguntar", color: "#27a536", icon: "❓" },
  { tipo: "conditional", label: "Condicion", color: "#fcb900", icon: "🔀" },
  { tipo: "save_lead_field", label: "Guardar campo", color: "#974df3", icon: "💾" },
  { tipo: "qualify_lead", label: "Calificar lead", color: "#cf2e2e", icon: "🏷️" },
  { tipo: "escalate_to_human", label: "Escalar a humano", color: "#ff6900", icon: "👤" },
  { tipo: "end_flow", label: "Finalizar", color: "#6b7280", icon: "⏹️" },
];

const nodeTypes: NodeTypes = { step: StepNode };

function pasoToNode(paso: FlowStep, index: number): Node {
  const info = STEP_TYPES.find((s) => s.tipo === paso.tipo);
  return {
    id: paso.id,
    type: "step",
    position: { x: 250, y: index * 150 },
    data: { ...paso, label: info?.label ?? paso.tipo, icon: info?.icon, color: info?.color },
  };
}

function flowToEdges(pasos: FlowStep[]): Edge[] {
  const edges: Edge[] = [];
  for (const paso of pasos) {
    if (paso.siguiente) {
      edges.push({
        id: `${paso.id}->${paso.siguiente}`,
        source: paso.id,
        target: paso.siguiente,
        markerEnd: { type: MarkerType.ArrowClosed },
        style: { stroke: "#6b7280" },
      });
    }
    if (paso.condicion) {
      if (paso.condicion.paso_si) {
        edges.push({
          id: `${paso.id}->${paso.condicion.paso_si}-si`,
          source: paso.id,
          target: paso.condicion.paso_si,
          label: "Si",
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: "#27a536" },
        });
      }
      if (paso.condicion.paso_no) {
        edges.push({
          id: `${paso.id}->${paso.condicion.paso_no}-no`,
          source: paso.id,
          target: paso.condicion.paso_no,
          label: "No",
          markerEnd: { type: MarkerType.ArrowClosed },
          style: { stroke: "#cf2e2e" },
        });
      }
    }
  }
  return edges;
}

function edgesToPasos(nodes: Node[], edges: Edge[]): FlowStep[] {
  const pasos: FlowStep[] = [];
  for (const node of nodes) {
    const d = node.data as Record<string, unknown>;
    const paso: FlowStep = {
      id: node.id,
      tipo: d.tipo as FlowStep["tipo"],
      texto: d.texto as string | undefined,
      campo: d.campo as string | undefined,
      siguiente: d.siguiente as string | undefined,
      calificacion: d.calificacion as "hot" | "warm" | "cold" | undefined,
      condicion: d.condicion as FlowStep["condicion"],
    };
    // For conditional steps: read from Si/No edges and node data
    const siEdge = edges.find(
      (e) => e.source === node.id && e.sourceHandle === "si"
    );
    const noEdge = edges.find(
      (e) => e.source === node.id && e.sourceHandle === "no"
    );
    if (d.tipo === "conditional") {
      const c = d.condicion as FlowStep["condicion"];
      paso.condicion = {
        campo: c?.campo ?? "",
        operador: c?.operador ?? "contiene",
        valor: c?.valor,
        paso_si: siEdge?.target ?? c?.paso_si ?? "",
        paso_no: noEdge?.target ?? c?.paso_no ?? "",
      };
    } else {
      // Non-conditional: find the default outgoing edge (no sourceHandle)
      const nextEdge = edges.find(
        (e) => e.source === node.id && !e.sourceHandle
      );
      if (nextEdge) paso.siguiente = nextEdge.target;
    }
    pasos.push(paso);
  }
  return pasos;
}

export default function FlowBuilder({
  initialNombre = "",
  initialTrigger = { keywords: [] },
  initialPasos = [],
  onSave,
  saving = false,
}: FlowBuilderProps) {
  const [nombre, setNombre] = useState(initialNombre);
  const [trigger, setTrigger] = useState<FlowTrigger>(initialTrigger);
  const [showTriggerPanel, setShowTriggerPanel] = useState(!initialPasos.length);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const initialNodes = useMemo(
    () => initialPasos.map((p, i) => pasoToNode(p, i)),
    [initialPasos]
  );
  const initialEdges = useMemo(() => flowToEdges(initialPasos), [initialPasos]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  useEffect(() => {
    setNodes(initialPasos.map((p, i) => pasoToNode(p, i)));
    setEdges(flowToEdges(initialPasos));
  }, [initialPasos, setNodes, setEdges]);

  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges((eds) =>
        addEdge(
          {
            ...connection,
            markerEnd: { type: MarkerType.ArrowClosed },
            style: { stroke: "#6b7280" },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const tipo = event.dataTransfer.getData("application/reactflow") as StepType;
      if (!tipo) return;
      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!bounds) return;
      const position = {
        x: event.clientX - bounds.left - 75,
        y: event.clientY - bounds.top - 30,
      };
      const id = `paso_${Date.now()}`;
      const info = STEP_TYPES.find((s) => s.tipo === tipo)!;
      const newNode: Node = {
        id,
        type: "step",
        position,
        data: { tipo, label: info.label, icon: info.icon, color: info.color },
      };
      setNodes((nds) => nds.concat(newNode));
    },
    [setNodes]
  );

  function handleSave() {
    const pasos = edgesToPasos(nodes, edges);
    onSave({ nombre, trigger, pasos });
  }

  const stepCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const n of nodes) {
      const t = n.data.tipo as string;
      counts[t] = (counts[t] ?? 0) + 1;
    }
    return counts;
  }, [nodes]);

  return (
    <div className="flex h-full gap-4">
      {/* Left: Node palette */}
      <div className="w-56 shrink-0 space-y-2">
        <div className="rounded-lg border bg-white p-3" style={{ borderColor: "#e5e5e5" }}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "#6b7280" }}>Configuracion</h3>
          <input
            type="text"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Nombre del flujo"
            className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
            style={{ borderColor: "#e5e5e5", color: "#464646" }}
          />
          <button
            onClick={() => setShowTriggerPanel(!showTriggerPanel)}
            className="mt-2 w-full rounded-lg px-3 py-2 text-sm font-medium transition-colors"
            style={{ background: showTriggerPanel ? "#003160" : "#f0f0f0", color: showTriggerPanel ? "#fff" : "#464646" }}
          >
            {showTriggerPanel ? "✓ Trigger configurado" : "Configurar trigger"}
          </button>
        </div>

        <div className="rounded-lg border bg-white p-3" style={{ borderColor: "#e5e5e5" }}>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "#6b7280" }}>Acciones</h3>
          <p className="mb-2 text-xs" style={{ color: "#9ca3af" }}>Arrastra al canvas:</p>
          <div className="space-y-1">
            {STEP_TYPES.map((st) => (
              <div
                key={st.tipo}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("application/reactflow", st.tipo);
                  e.dataTransfer.effectAllowed = "move";
                }}
                className="flex cursor-grab items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors hover:bg-gray-100"
                style={{ color: "#464646" }}
              >
                <span>{st.icon}</span>
                <span className="flex-1">{st.label}</span>
                {(stepCounts[st.tipo] ?? 0) > 0 && (
                  <span className="rounded-full bg-gray-100 px-1.5 text-xs font-medium" style={{ color: "#6b7280" }}>
                    {stepCounts[st.tipo]}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !nombre}
          className="w-full rounded-lg px-4 py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-50"
          style={{ background: "#cf2e2e" }}
        >
          {saving ? "Guardando..." : "Guardar flujo"}
        </button>
      </div>

      {/* Center: React Flow canvas */}
      <div ref={reactFlowWrapper} className="flex-1 rounded-lg border bg-white" style={{ borderColor: "#e5e5e5" }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onNodeClick={(_, node) => setSelectedNode(node)}
          onPaneClick={() => setSelectedNode(null)}
          nodeTypes={nodeTypes}
          fitView
          deleteKeyCode="Backspace"
          connectionLineStyle={{ stroke: "#6b7280" }}
          style={{ background: "#fafafa" }}
        >
          <Controls />
          <Background color="#e5e5e5" gap={20} />
          <MiniMap
            nodeColor={(n) => {
              const d = n.data as Record<string, string> | undefined;
              return d?.color ?? "#6b7280";
            }}
            style={{ border: "1px solid #e5e5e5" }}
          />
        </ReactFlow>
      </div>

      {/* Right: Node editor panel */}
      {selectedNode && (
        <NodeEditor
          node={selectedNode}
          onUpdate={(updated) => {
            setNodes((nds) =>
              nds.map((n) => (n.id === updated.id ? { ...n, data: updated.data } : n))
            );
          }}
          onClose={() => setSelectedNode(null)}
        />
      )}

      {/* Trigger panel modal */}
      {showTriggerPanel && (
        <TriggerPanel
          trigger={trigger}
          onChange={setTrigger}
          onClose={() => setShowTriggerPanel(false)}
        />
      )}
    </div>
  );
}
