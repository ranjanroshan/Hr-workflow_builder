import React, { useMemo } from "react";


export default function NodeConfigPanel({
  selectedNode,
  updateSelectedNodeData,
  automations,
  runSimulation,
  simulationLog,
  isSimulating,
  exportWorkflow,
  importWorkflow,
  validationResult,
  onDeleteSelected,
}) {
 
  const selectedAutomationDef = useMemo(() => {
    if (!selectedNode || !selectedNode.data) return null;
    const actionId = selectedNode.data.automationAction;
    return automations.find((a) => a.id === actionId) || null;
  }, [selectedNode, automations]);

  
  const renderKeyValueList = (list = [], onChangeList, listLabel = "Fields") => {
    return (
      <div style={{ marginBottom: 12 }}>
        <div style={{ fontSize: 13, marginBottom: 6 }}>{listLabel}</div>
        {list.length === 0 && <div style={{ color: "#888", marginBottom: 8 }}>No entries yet.</div>}
        {list.map((item, idx) => (
          <div key={idx} style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
            <input
              placeholder="key"
              value={item.key || ""}
              onChange={(e) => {
                const next = list.map((r, i) => (i === idx ? { ...r, key: e.target.value } : r));
                onChangeList(next);
              }}
              style={{ flex: 1, padding: 8, borderRadius: 6, border: "1px solid #ddd" }}
            />
            <input
              placeholder="value"
              value={item.value || ""}
              onChange={(e) => {
                const next = list.map((r, i) => (i === idx ? { ...r, value: e.target.value } : r));
                onChangeList(next);
              }}
              style={{ flex: 1, padding: 8, borderRadius: 6, border: "1px solid #ddd" }}
            />
            <button
              onClick={() => {
                const next = list.filter((_, i) => i !== idx);
                onChangeList(next);
              }}
              style={{
                padding: "6px 8px",
                borderRadius: 6,
                border: "1px solid #ddd",
                background: "#fff",
                cursor: "pointer",
              }}
            >
              Remove
            </button>
          </div>
        ))}

        <button
          onClick={() => {
            const next = [...list, { key: "", value: "" }];
            onChangeList(next);
          }}
          style={{
            padding: "6px 10px",
            borderRadius: 6,
            border: "none",
            background: "#2563eb",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          Add
        </button>
      </div>
    );
  };

  
  const renderActionParams = () => {
    if (!selectedAutomationDef) return null;
    const params = Array.isArray(selectedAutomationDef.params) ? selectedAutomationDef.params : [];

    return (
      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 13, marginBottom: 6 }}>Action parameters</div>
        {params.length === 0 && <div style={{ color: "#888", marginBottom: 8 }}>No parameters for this action.</div>}
        {params.map((p) => {
          const value =
            (selectedNode && selectedNode.data && selectedNode.data.actionParams && selectedNode.data.actionParams[p]) ||
            "";

          return (
            <div key={p} style={{ marginBottom: 10 }}>
              <label style={{ display: "block", fontSize: 13 }}>{p}</label>
              <input
                value={value}
                onChange={(e) => {
                  const next = { ...(selectedNode.data.actionParams || {}) };
                  next[p] = e.target.value;
                  updateSelectedNodeData({ actionParams: next });
                }}
                placeholder={p}
                style={{
                  width: "100%",
                  padding: 8,
                  borderRadius: 6,
                  border: "1px solid #ddd",
                }}
              />
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <h3 style={{ marginTop: 0 }}>Node Configuration</h3>

      {!selectedNode && <div style={{ color: "#666", marginBottom: 12 }}>Select a node on the canvas to edit it.</div>}

      {selectedNode && (
        <div style={{ marginBottom: 12 }}>
          <div style={{ marginBottom: 8 }}>
            <strong>Type:</strong> {selectedNode.data.nodeType}
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", fontSize: 13 }}>Title</label>
            <input
              value={selectedNode.data.title || ""}
              onChange={(e) => updateSelectedNodeData({ title: e.target.value })}
              style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ddd" }}
            />
          </div>

          {/* START NODE - metadata key/value pairs */}
          {selectedNode.data.nodeType === "Start" && (
            <>
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, marginBottom: 6 }}>Metadata (key → value)</div>
                {renderKeyValueList(
                  selectedNode.data.metadata || [],
                  (next) => updateSelectedNodeData({ metadata: next }),
                  "Metadata"
                )}
              </div>
            </>
          )}

          
          {selectedNode.data.nodeType === "Task" && (
            <>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13 }}>Description</label>
                <textarea
                  value={selectedNode.data.description || ""}
                  onChange={(e) => updateSelectedNodeData({ description: e.target.value })}
                  style={{ width: "100%", padding: 8, borderRadius: 6 }}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13 }}>Assignee</label>
                <input
                  value={selectedNode.data.assignee || ""}
                  onChange={(e) => updateSelectedNodeData({ assignee: e.target.value })}
                  style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ddd" }}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13 }}>Due Date</label>
                <input
                  type="date"
                  value={selectedNode.data.dueDate || ""}
                  onChange={(e) => updateSelectedNodeData({ dueDate: e.target.value })}
                  style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ddd" }}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 13, marginBottom: 6 }}>Custom Fields</div>
                {renderKeyValueList(
                  selectedNode.data.customFields || [],
                  (next) => updateSelectedNodeData({ customFields: next }),
                  "Custom Fields"
                )}
              </div>
            </>
          )}

          
          {selectedNode.data.nodeType === "Approval" && (
            <>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13 }}>Approver Role</label>
                <input
                  value={selectedNode.data.approverRole || ""}
                  onChange={(e) => updateSelectedNodeData({ approverRole: e.target.value })}
                  style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ddd" }}
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13 }}>Auto-approve threshold</label>
                <input
                  type="number"
                  value={selectedNode.data.autoApproveThreshold || 0}
                  onChange={(e) => updateSelectedNodeData({ autoApproveThreshold: Number(e.target.value) })}
                  style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ddd" }}
                />
              </div>
            </>
          )}

          
          {selectedNode.data.nodeType === "Automated" && (
            <>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13 }}>Automation Action</label>
                <select
                  value={selectedNode.data.automationAction || ""}
                  onChange={(e) => {
                    const actionId = e.target.value;
                    const def = automations.find((a) => a.id === actionId) || null;
                    const params = Array.isArray(def?.params) ? def.params : [];
                    const nextParams = {};
                    params.forEach((p) => {
                      nextParams[p] = (selectedNode.data.actionParams && selectedNode.data.actionParams[p]) || "";
                    });
                    updateSelectedNodeData({ automationAction: actionId, actionParams: nextParams });
                  }}
                  style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ddd" }}
                >
                  <option value="">(choose)</option>
                  {automations.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Dynamic params */}
              {renderActionParams()}
            </>
          )}

          
          {selectedNode.data.nodeType === "End" && (
            <>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13 }}>End Message</label>
                <input
                  value={selectedNode.data.endMessage || ""}
                  onChange={(e) => updateSelectedNodeData({ endMessage: e.target.value })}
                  style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #ddd" }}
                />
              </div>
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 13 }}>Summary flag</label>
                <input type="checkbox" checked={!!selectedNode.data.summary} onChange={(e) => updateSelectedNodeData({ summary: e.target.checked })} />
              </div>
            </>
          )}

          <div style={{ marginTop: 8, color: "#666", fontSize: 13 }}>Changes are applied instantly.</div>

          <div style={{ marginTop: 8 }}>
            <button onClick={onDeleteSelected} style={deleteButtonStyle}>
              Delete Node
            </button>
          </div>
        </div>
      )}

      {/* Sandbox / Test UI */}
      <div style={{ marginTop: "auto" }}>
        <hr />
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
          <button onClick={exportWorkflow} style={exportButtonStyle}>
            Export Workflow
          </button>
          <button onClick={importWorkflow} style={importButtonStyle}>
            Import Workflow
          </button>

          <div style={{ flex: 1 }} />
          <button onClick={runSimulation} disabled={isSimulating} style={runButtonStyle}>
            {isSimulating ? "Running…" : "Run Simulation"}
          </button>
        </div>

        {/* validation results */}
        {!validationResult?.ok && validationResult?.errors?.length > 0 && (
          <div style={{ marginBottom: 8, color: "#b91c1c" }}>
            <strong>Validation errors:</strong>
            <ul>
              {validationResult.errors.map((e, i) => (
                <li key={i}>{e.message}</li>
              ))}
            </ul>
          </div>
        )}

        <div style={{ fontSize: 13, color: "#555", marginBottom: 8 }}>
          Run simulation to send the current graph to the mock API and see an execution log.
        </div>

        <div style={{ maxHeight: 220, overflow: "auto", border: "1px solid #eee", padding: 8, borderRadius: 6, background: "#fafafa" }}>
          {simulationLog.length === 0 && <div style={{ color: "#888" }}>No simulation run yet.</div>}
          {simulationLog.map((s, idx) => (
            <div key={s.id ?? idx} style={{ marginBottom: 8 }}>
              <div style={{ fontWeight: 600 }}>{s.title ?? `Step ${idx + 1}`}</div>
              <div style={{ color: "#333" }}>{s.message ?? JSON.stringify(s)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const deleteButtonStyle = {
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid #ddd",
  background: "#fff",
  color: "#111",
  cursor: "pointer",
};

const exportButtonStyle = {
  padding: "6px 10px",
  borderRadius: 6,
  border: "none",
  background: "#10b981",
  color: "#fff",
  cursor: "pointer",
};

const importButtonStyle = {
  padding: "6px 10px",
  borderRadius: 6,
  border: "1px solid #ddd",
  background: "#fff",
  color: "#111",
  cursor: "pointer",
};

const runButtonStyle = {
  padding: "6px 10px",
  borderRadius: 6,
  border: "none",
  background: "#2563eb",
  color: "#fff",
  cursor: "pointer",
};
