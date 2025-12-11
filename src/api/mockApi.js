// src/api/mockApi.js
// Mocks GET /automations and POST /simulate

const AUTOMATIONS = [
  {
    id: "send_email",
    label: "Send Email",
    params: ["to", "subject", "body"],
  },
  {
    id: "generate_doc",
    label: "Generate Document",
    params: ["template", "recipient"],
  },
  {
    id: "call_webhook",
    label: "Call Webhook",
    params: ["url", "payload"],
  },
];

// ----------------------
// GET /automations
// ----------------------
export function getAutomations(delay = 300) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(AUTOMATIONS), delay);
  });
}

// ----------------------
// POST /simulate
// ----------------------
export function simulateWorkflow(workflow, delay = 600) {
  return new Promise((resolve) => {
    setTimeout(() => {
      const nodes = workflow.nodes || [];
      const edges = workflow.edges || [];

      const findNode = (id) => nodes.find((n) => n.id === id);

      // Find Start
      const start = nodes.find((n) => n.data?.nodeType === "Start") || nodes[0];

      const log = [];
      const visited = new Set();

      const visit = (node) => {
        if (!node || visited.has(node.id)) return;
        visited.add(node.id);

        const t = node.data?.nodeType;
        const title = node.data?.title || t;

        if (t === "Start") {
          log.push({
            id: node.id,
            title,
            message: `Workflow started. Metadata: ${JSON.stringify(node.data.metadata || {})}`,
          });
        }

        if (t === "Task") {
          log.push({
            id: node.id,
            title,
            message: `Task assigned to ${node.data.assignee || "N/A"}, due ${
              node.data.dueDate || "N/A"
            }. Custom fields: ${JSON.stringify(node.data.customFields || [])}`,
          });
        }

        if (t === "Approval") {
          log.push({
            id: node.id,
            title,
            message: `Approval by ${node.data.approverRole}. Auto-approve threshold = ${node.data.autoApproveThreshold}`,
          });
        }

        if (t === "Automated") {
          log.push({
            id: node.id,
            title,
            message: `Automated Action: ${node.data.automationAction}. Params: ${JSON.stringify(
              node.data.actionParams || {}
            )}`,
          });
        }

        if (t === "End") {
          log.push({
            id: node.id,
            title,
            message: `Workflow ended. Summary required: ${node.data.summary ? "Yes" : "No"}`,
          });
        }

        // Visit children
        const outs = edges.filter((e) => e.source === node.id).map((e) => e.target);
        outs.forEach((id) => visit(findNode(id)));
      };

      if (start) visit(start);

      resolve({ ok: true, steps: log });
    }, delay);
  });
}
