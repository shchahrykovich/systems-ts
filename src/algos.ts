/**
 * Collection of reused algorithms.
 */

export interface Graph {
  [node: string]: string[];
}

export interface CycleResult {
  hasCycle: boolean;
  cycles: Graph;
  initialPath: string[];
}

/**
 * Find cycles in a directed graph.
 * Returns whether there are cycles, the remaining cycles, and the dependency path.
 */
export function findCycles(inGraph: Graph, outGraph: Graph): CycleResult {
  const cycles: Graph = {};
  for (const node in outGraph) {
    cycles[node] = [...outGraph[node]];
  }

  const deps: string[] = [];
  let changed = true;

  while (changed) {
    changed = false;
    for (const node in cycles) {
      const edges = cycles[node];
      // If you have no incoming edges and do have outgoing edges,
      // then trim those edges away
      if (inGraph[node].length === 0 && edges.length > 0) {
        for (const edge of edges) {
          const index = inGraph[edge].indexOf(node);
          if (index > -1) {
            inGraph[edge].splice(index, 1);
          }
          cycles[node] = [];
        }
        deps.push(node);
        changed = true;
      }
    }
  }

  const hasCycle = Object.values(cycles).some((x) => x.length > 0);
  const initialPath = deps.reverse();

  return { hasCycle, cycles, initialPath };
}
