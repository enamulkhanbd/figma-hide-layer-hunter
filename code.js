/**
 * Hidden Layer Finder
 * - Shows top-level hidden layers in the current selection.
 * - Skips COMPONENT / COMPONENT_SET (masters).
 * - Includes hidden INSTANCE nodes, but never lists anything inside an instance.
 * - Focus/zoom via target icon only.
 * - “Scan” → “Rescan” after first successful search.
 * - UI state preserved on delete (UI receives only the deleted IDs).
 */

figma.showUI(__html__, { width: 340, height: 520 });

/* ------------------------ helpers ------------------------ */

function isMasterComponent(node) {
  return node.type === 'COMPONENT' || node.type === 'COMPONENT_SET';
}
function hasChildren(node) {
  return 'children' in node && Array.isArray(node.children);
}
function hasInstanceAncestor(node) {
  let p = node.parent;
  while (p && p.type !== 'PAGE') {
    if (p.type === 'INSTANCE') return true;
    p = p.parent;
  }
  return false;
}

/**
 * Collect hidden nodes from roots with rules:
 *  - Skip COMPONENT / COMPONENT_SET completely.
 *  - For INSTANCE:
 *      * If hidden => include the INSTANCE itself.
 *      * Never descend into its children.
 *  - For other nodes:
 *      * If hidden => include it and do not descend.
 *      * Else descend into children (and apply same rules).
 */
function collectHiddenNodesRespectingInstances(roots) {
  const hidden = [];
  const stack = [...roots];

  while (stack.length) {
    const node = stack.pop();
    if (!node || node.removed) continue;

    if (isMasterComponent(node)) continue;

    if ('visible' in node && node.visible === false) {
      hidden.push(node);
      continue;
    }

    if (node.type === 'INSTANCE') {
      // visible instance: neither list it nor descend
      continue;
    }

    if (hasChildren(node)) {
      for (const child of node.children) stack.push(child);
    }
  }
  return hidden;
}

/** keep only nodes without a hidden ancestor in the same set */
function toTopLevelHidden(nodes) {
  const byId = new Map(nodes.map(n => [n.id, n]));
  const ids = new Set(byId.keys());
  const out = [];

  for (const node of byId.values()) {
    let isTop = true;
    let p = node.parent;
    while (p && p.type !== 'PAGE') {
      if (ids.has(p.id)) { isTop = false; break; }
      p = p.parent;
    }
    if (isTop) out.push(node);
  }
  return out;
}

function closestVisibleAncestor(node) {
  let p = node;
  while (p && p.type !== 'PAGE') {
    if (!('visible' in p) || p.visible) return p;
    p = p.parent;
  }
  return figma.currentPage;
}

function trySelectNode(node) {
  if (!node || node.removed) {
    figma.notify('Layer no longer exists.');
    return { selected: false };
  }
  const beforeSel = figma.currentPage.selection.slice();
  figma.currentPage.selection = [node];

  const ok = figma.currentPage.selection.length === 1 &&
             figma.currentPage.selection[0].id === node.id;

  if (ok) {
    figma.viewport.scrollAndZoomIntoView([node]);
    return { selected: true };
  } else {
    figma.currentPage.selection = beforeSel;
    const focus = closestVisibleAncestor(node);
    figma.viewport.scrollAndZoomIntoView([focus]);
    figma.notify('Cannot select hidden/locked layer. Focused its parent instead.', { timeout: 2000 });
    return { selected: false };
  }
}

/* ------------------------ scan ------------------------ */

function findHiddenLayers() {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    figma.ui.postMessage({ type: 'prompt-selection' });
    return;
  }

  // Hidden among selected roots (no masters; ignore inner items of instances)
  const hiddenSelected = selection.filter(n =>
    !isMasterComponent(n) &&
    'visible' in n &&
    n.visible === false &&
    !hasInstanceAncestor(n)
  );

  // Hidden among descendants (respect instance boundary)
  const hiddenDesc = collectHiddenNodesRespectingInstances(selection);

  const allHidden = [...hiddenSelected, ...hiddenDesc];
  const topHidden = toTopLevelHidden(allHidden);

  const layers = topHidden.map(n => ({
    id: n.id,
    name: n.name,
    isInstance: n.type === 'INSTANCE'
  }));

  figma.ui.postMessage({ type: 'render-layers', layers });

  const count = layers.length;
  if (count === 0) {
    figma.notify('No hidden layers found in the current selection.');
  } else {
    figma.notify(`Found ${count} hidden layer${count === 1 ? '' : 's'}.`);
  }
}

/* ------------------------ UI bridge ------------------------ */

figma.ui.onmessage = (msg) => {
  if (!msg) return;

  if (msg.type === 'zoom-to-layer' && msg.id) {
    const node = figma.getNodeById(msg.id);
    trySelectNode(node);
  }

  if (msg.type === 'delete-selected' && Array.isArray(msg.ids)) {
    const deletedIds = [];
    for (const id of msg.ids) {
      const n = figma.getNodeById(id);
      if (n && !n.removed) {
        try {
          n.remove();
          deletedIds.push(id);
        } catch (err) { /* older runtime needs a binding */ }
      }
    }
    if (deletedIds.length) {
      const n = deletedIds.length;
      figma.notify(`Deleted ${n} layer${n === 1 ? '' : 's'}.`);
      figma.ui.postMessage({ type: 'deleted-ids', ids: deletedIds });
    } else {
      figma.notify('Nothing to delete.');
    }
  }

  if (msg.type === 'search-again') {
    findHiddenLayers();
  }
};
