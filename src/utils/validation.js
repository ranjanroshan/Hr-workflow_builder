// src/utils/validation.js
// Graph validation utilities for the workflow designer.
//
// Exports:
//  - validateGraph(nodes, edges)
// Returns:
//  {
//    ok: boolean,
//    errors: [{ type, message, nodeId? }],
//    details: { unreachable: [...ids], cycles: [[id,id,...]], startId?: string }
//  }

function buildAdjacency(nodes = [], edges = []) {
  const adj = new Map();
  const incoming = new Map();

  nodes.forEach((n) => {
    adj.set(n.id, []);
    incoming.set(n.id, []);
  });

  edges.forEach((e) => {
    if (!adj.has(e.source)) adj.set(e.source, []);
    if (!adj.has(e.target)) adj.set(e.target, []);
    adj.get(e.source).push(e.target);

    if (!incoming.has(e.target)) incoming.set(e.target, []);
    incoming.get(e.target).push(e.source);
  });

  return { adj, incoming };
}

/**
 * Find nodes reachable from the given start node id using DFS.
 * Returns a Set of visited node ids.
 */
function findReachableFrom(startId, adj) {
  const visited = new Set();
  const stack = [startId];

  while (stack.length > 0) {
    const cur = stack.pop();
    if (visited.has(cur)) continue;
    visited.add(cur);
    const neighbors = adj.get(cur) || [];
    for (const nb of neighbors) {
      if (!visited.has(nb)) stack.push(nb);
    }
  }

  return visited;
}

/**
 * Detect cycles in the directed graph.
 * Returns an array of cycles, each cycle is an array of node ids (one example cycle).
 *
 * Uses DFS with recursion stack detection.
 */
function detectCycles(nodes = [], adj) {
  const WHITE = 0; // unvisited
  const GRAY = 1; // visiting (in recursion stack)
  const BLACK = 2; // finished

  const color = {};
  nodes.forEach((n) => (color[n.id] = WHITE));

  const cycles = [];
  const parent = {};

  function dfs(u) {
    color[u] = GRAY;
    const neighbors = adj.get(u) || [];
    for (const v of neighbors) {
      if (color[v] === WHITE) {
        parent[v] = u;
        const found = dfs(v);
        if (found) return true;
      } else if (color[v] === GRAY) {
        // found a back edge -> cycle
        // reconstruct cycle path from v -> ... -> u -> v
        const cycle = [v];
        let x = u;
        while (x && x !== v && !cycle.includes(x)) {
          cycle.push(x);
          x = parent[x];
        }
        cycle.push(v);
        cycles.push(cycle.reverse());
      }
    }
    color[u] = BLACK;
    return false;
  }

  for (const n of nodes) {
    if (color[n.id] === WHITE) {
      parent[n.id] = null;
      dfs(n.id);
    }
  }

  // deduplicate cycles (simple)
  const unique = [];
  const seenKeys = new Set();
  for (const c of cycles) {
    const key = c.join("->");
    if (!seenKeys.has(key)) {
      unique.push(c);
      seenKeys.add(key);
    }
  }

  return unique;
}

/**
 * Main validator
 */
export function validateGraph(nodes = [], edges = []) {
  const errors = [];
  const details = { unreachable: [], cycles: [], startId: null };

  // quick maps
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // 1) Start node checks
  const startNodes = nodes.filter((n) => n.data?.nodeType === "Start");
  if (startNodes.length === 0) {
    errors.push({ type: "no_start", message: "No Start node found." });
  } else if (startNodes.length > 1) {
    errors.push({ type: "multiple_start", message: "More than one Start node found." });
  } else {
    const start = startNodes[0];
    details.startId = start.id;
    // start must not have incoming edges
    const incomingToStart = edges.filter((e) => e.target === start.id);
    if (incomingToStart.length > 0) {
      errors.push({
        type: "start_has_incoming",
        message: "Start node must not have incoming edges.",
        nodeId: start.id,
      });
    }
  }

  // 2) Build adjacency and incoming maps
  const { adj, incoming } = buildAdjacency(nodes, edges);

  // 3) Disconnected / unreachable nodes detection
  if (startNodes.length === 1) {
    const startId = startNodes[0].id;
    const reachable = findReachableFrom(startId, adj);

    // any node not reachable is disconnected
    for (const n of nodes) {
      if (!reachable.has(n.id)) {
        details.unreachable.push(n.id);
        errors.push({
          type: "unreachable_node",
          message: `Node "${n.data?.title || n.id}" is not reachable from Start.`,
          nodeId: n.id,
        });
      }
    }
  }

  // 4) Cycle detection
  const cycles = detectCycles(nodes, adj);
  if (cycles.length > 0) {
    details.cycles = cycles;
    cycles.forEach((c, idx) => {
      errors.push({
        type: "cycle",
        message: `Cycle detected: ${c.join(" → ")}`,
        nodeId: c[0],
      });
    });
  }

  return { ok: errors.length === 0, errors, details };
}
