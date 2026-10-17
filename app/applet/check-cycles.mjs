import fs from 'fs';
import path from 'path';

const srcDir = path.resolve('src');
const files = {};

function getFiles(dir) {
  if (!fs.existsSync(dir)) return;
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getFiles(fullPath);
    } else if (fullPath.endsWith('.ts') || fullPath.endsWith('.tsx')) {
      const relPath = path.relative(srcDir, fullPath);
      files[relPath] = fullPath;
    }
  });
}
getFiles(srcDir);

const graph = {};

for (const [rel, fullPath] of Object.entries(files)) {
  const content = fs.readFileSync(fullPath, 'utf8');
  const importRegex = /import\s+(?:.*?\s+from\s+)?['"](\..*?)['"]/g;
  const deps = [];
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    const importPath = match[1];
    const resolved = path.relative(srcDir, path.resolve(path.dirname(fullPath), importPath));
    const found = Object.keys(files).find(f => f === resolved || f.startsWith(resolved + '.'));
    if (found) {
      deps.push(found);
    }
  }
  graph[rel] = deps;
}

function detectCycles() {
  const visited = new Set();
  const stack = new Set();
  let foundCycle = false;

  function dfs(node, path = []) {
    visited.add(node);
    stack.add(node);
    path.push(node);

    for (const neighbor of (graph[node] || [])) {
      if (!visited.has(neighbor)) {
        dfs(neighbor, [...path]);
      } else if (stack.has(neighbor)) {
        console.log('CYCLE DETECTED:', [...path, neighbor].join(' -> '));
        foundCycle = true;
      }
    }

    stack.delete(node);
  }

  for (const node of Object.keys(graph)) {
    if (!visited.has(node)) {
      dfs(node);
    }
  }
  if (!foundCycle) {
    console.log('No circular dependencies detected in src/.');
  }
}

detectCycles();
