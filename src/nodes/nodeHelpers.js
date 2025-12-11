// src/nodes/nodeHelpers.js
// Helper to create nodes with consistent default data shapes.

let idCounter = 0;
const getId = () => `node_${idCounter++}`;

export function createNode(type, position = { x: 0, y: 0 }, automations = []) {
  const base = {
    id: getId(),
    type: "default",
    position,
    data: {
      nodeType: type,
      title: `${type} title`,
    },
  };

  switch (type) {
    case "Start":
      return {
        ...base,
        data: {
          ...base.data,
          metadata: [], // array of { key, value }
        },
      };
    case "Task":
      return {
        ...base,
        data: {
          ...base.data,
          description: "",
          assignee: "",
          dueDate: "",
          customFields: [], // array of { key, value }
        },
      };
    case "Approval":
      return {
        ...base,
        data: {
          ...base.data,
          approverRole: "Manager",
          autoApproveThreshold: 0,
        },
      };
    case "Automated":
      return {
        ...base,
        data: {
          ...base.data,
          automationAction: automations.length > 0 ? automations[0].id : "",
          actionParams: {}, // object keyed by param names
        },
      };
    case "End":
      return {
        ...base,
        data: {
          ...base.data,
          endMessage: "",
          summary: false,
        },
      };
    default:
      return base;
  }
}
