// src/canvas/FlowCanvas.jsx
import React, { useCallback, useEffect, useRef, useState } from "react";
import ReactFlow, {
  ReactFlowProvider,
  useNodesState,
  useEdgesState,
} from "reactflow";
import "reactflow/dist/style.css";

import NodeConfigPanel from "../forms/NodeConfigPanel";
import { getAutomations, simulateWorkflow } from "../api/mockApi";
import { createNode } from "../nodes/nodeHelpers";
import { validateGraph } from "../utils/validation";

/**
 * FlowCanvas: contains the React Flow area, drag/drop, nodes/edges state,
 * selection handling, and wires into NodeConfigPanel.
 */
export default function FlowCanvasInner() {
  const reactFlowWrapper = useRef(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const [selectedNode, setSelectedNode] = useState(null);
  const [rfInstance, setRfInstance] = useState(null);

  // automations & simulation UI state
  const [automations, setAutomations] = useState([]);
  const [simulationLog, setSimulationLog] = useState([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [validationResult, setValidationResult] = useState({ ok: true, errors: [] });

  // fetch automations once
  useEffect(() => {
    let mounted = true;
    getAutomations().then((data) => {
      if (mounted) setAutomations(data || []);
    });
    return () => (mounted = false);
  }, []);

  const onInit = useCallback((instance) => {
    setRfInstance(instance);
  }, []);

  const onDragOver = useCallback((event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event) => {
      event.preventDefault();
      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const data = event.dataTransfer.getData("application/reactflow");
      if (!data) return;

      let parsed = null;
      try {
        parsed = JSON.parse(data);
      } catch {
        return;
      }

      const { type } = parsed;

      let position;
      if (rfInstance && typeof rfInstance.project === "function") {
        position = rfInstance.project({
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        });
      } else {
        position = {
          x: event.clientX - reactFlowBounds.left,
          y: event.clientY - reactFlowBounds.top,
        };
      }

      const node = createNode(type, position, automations);
      setNodes((nds) => nds.concat(node));
    },
    [rfInstance, setNodes, automations]
  );

  // selection handler
  const onSelectionChange = useCallback(({ nodes: selectedNodes }) => {
    if (selectedNodes && selectedNodes.length > 0) {
      setSelectedNode(selectedNodes[0]);
    } else {
      setSelectedNode(null);
    }
  }, []);

  // deletion handlers
  const onNodesDelete = useCallback(
    (deleted) => {
      // update nodes state (use provided setNodes), clear selection if deleted
      const deletedIds = new Set(deleted.map((n) => n.id));
      setNodes((nds) => nds.filter((n) => !deletedIds.has(n.id)));
      if (selectedNode && deletedIds.has(selectedNode.id)) setSelectedNode(null);
    },
    [setNodes, selectedNode]
  );

  const onEdgesDelete = useCallback(
    (deleted) => {
      const deletedIds = new Set(deleted.map((e) => e.id));
      setEdges((eds) => eds.filter((e) => !deletedIds.has(e.id)));
    },
    [setEdges]
  );

  const onConnect = useCallback(
    (connection) =>
      setEdges((eds) => {
        const exists = eds.some(
          (e) =>
            e.source === connection.source &&
            e.sourceHandle === connection.sourceHandle &&
            e.target === connection.target &&
            e.targetHandle === connection.targetHandle
        );
        return exists ? eds : [...eds, connection];
      }),
    [setEdges]
  );

  // update selected node's data (applies changes instantly)
  const updateSelectedNodeData = useCallback(
    (patch) => {
      if (!selectedNode) return;
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id === selectedNode.id) {
            return { ...n, data: { ...n.data, ...patch } };
          }
          return n;
        })
      );
      setSelectedNode((s) => (s ? { ...s, data: { ...s.data, ...patch } } : s));
    },
    [selectedNode, setNodes]
  );

  // Run simulation: validate first, then call mock simulateWorkflow
  const runSimulation = useCallback(async () => {
    const validation = validateGraph(nodes, edges);
    setValidationResult(validation);
    if (!validation.ok) {
      setSimulationLog([{ message: "Validation failed — fix errors before simulation." }]);
      return;
    }

    setIsSimulating(true);
    setSimulationLog([]);
    try {
      const payload = { nodes, edges };
      const result = await simulateWorkflow(payload);
      if (result && result.steps) {
        setSimulationLog(result.steps);
      } else {
        setSimulationLog([{ message: "No steps returned from simulation." }]);
      }
    } catch (err) {
      setSimulationLog([{ message: `Simulation failed: ${String(err)}` }]);
    } finally {
      setIsSimulating(false);
    }
  }, [nodes, edges]);

  // Export / Import helpers (simple)
  const exportWorkflow = useCallback(() => {
    const payload = { nodes, edges };
    const json = JSON.stringify(payload, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "workflow.json";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }, [nodes, edges]);

  const importWorkflow = useCallback(() => {
    const pasted = prompt("Paste workflow JSON here (nodes + edges). This will replace the current canvas.");
    if (!pasted) return;
    try {
      const parsed = JSON.parse(pasted);
      if (!Array.isArray(parsed.nodes) || !Array.isArray(parsed.edges)) {
        alert("Invalid format: JSON must contain `nodes` and `edges` arrays.");
        return;
      }
      setNodes(parsed.nodes);
      setEdges(parsed.edges);
      setSelectedNode(null);
    } catch (err) {
      alert("Failed to parse JSON: " + String(err));
    }
  }, [setNodes, setEdges]);

  // map live labels (title) into node data for display
  const nodesForRender = nodes.map((n) => ({ ...n, data: { ...n.data, label: n.data.title || n.data.nodeType } }));

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw" }}>
      {/* Left sidebar */}
      <aside style={{ width: 220, padding: 16, borderRight: "1px solid #eee", background: "#f6f7fb" }}>
        <h3 style={{ marginTop: 0 }}>Nodes</h3>
        <div
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("application/reactflow", JSON.stringify({ type: "Start" }));
            e.dataTransfer.effectAllowed = "move";
          }}
          style={sidebarItemStyle}
        >
          Start Node
        </div>
        <div
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("application/reactflow", JSON.stringify({ type: "Task" }));
            e.dataTransfer.effectAllowed = "move";
          }}
          style={sidebarItemStyle}
        >
          Task Node
        </div>
        <div
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("application/reactflow", JSON.stringify({ type: "Approval" }));
            e.dataTransfer.effectAllowed = "move";
          }}
          style={sidebarItemStyle}
        >
          Approval Node
        </div>
        <div
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("application/reactflow", JSON.stringify({ type: "Automated" }));
            e.dataTransfer.effectAllowed = "move";
          }}
          style={sidebarItemStyle}
        >
          Automated Step
        </div>
        <div
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData("application/reactflow", JSON.stringify({ type: "End" }));
            e.dataTransfer.effectAllowed = "move";
          }}
          style={sidebarItemStyle}
        >
          End Node
        </div>

        <hr style={{ margin: "12px 0" }} />

        <div style={{ marginTop: 12 }}>
          <strong>Automations</strong>
          <div style={{ fontSize: 13, color: "#444", marginTop: 6 }}>
            {automations.length === 0 && <div style={{ color: "#888" }}>Loading…</div>}
            {automations.map((a) => (
              <div key={a.id} style={{ padding: "4px 0", fontSize: 13 }}>
                {a.label} <span style={{ color: "#999" }}>({a.id})</span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Canvas area */}
      <div ref={reactFlowWrapper} style={{ flex: 1, position: "relative" }} onDragOver={onDragOver} onDrop={onDrop}>
        <ReactFlow
          nodes={nodesForRender}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onInit={onInit}
          onSelectionChange={onSelectionChange}
          onNodesDelete={onNodesDelete}
          onEdgesDelete={onEdgesDelete}
          fitView
        />
      </div>

      {/* Right-side panel (forms + sandbox) */}
      <aside style={{ width: 380, padding: 16, borderLeft: "1px solid #eee", background: "#fff" }}>
        <NodeConfigPanel
          selectedNode={selectedNode}
          updateSelectedNodeData={updateSelectedNodeData}
          automations={automations}
          runSimulation={runSimulation}
          simulationLog={simulationLog}
          isSimulating={isSimulating}
          exportWorkflow={exportWorkflow}
          importWorkflow={importWorkflow}
          validationResult={validationResult}
          onDeleteSelected={() => {
            if (!selectedNode) return;
            setNodes((nds) => nds.filter((n) => n.id !== selectedNode.id));
            setSelectedNode(null);
          }}
        />
      </aside>
    </div>
  );
}

const sidebarItemStyle = {
  padding: "8px 12px",
  marginBottom: 8,
  background: "#fff",
  borderRadius: 6,
  boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
  cursor: "grab",
  userSelect: "none",
};

/**
 * Wrapper with ReactFlowProvider so FlowCanvasInner can be imported easily.
 */
export function FlowCanvas() {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner />
    </ReactFlowProvider>
  );
}
