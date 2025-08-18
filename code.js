/**
 * Hidden Layer Finder
 * - Multi-select + Select all / Clear selection + Delete selected
 * - Focus/zoom triggers ONLY from target icon (UI). Row click does nothing.
 * - First run: UI shows "Scan"; after first successful scan, UI flips to "Rescan".
 * - Skips COMPONENT / INSTANCE / COMPONENT_SET subtrees
 */

figma.showUI(__html__, { width: 340, height: 520 });

// -------------------- helpers --------------------

function isComponentish(node) {
  return (
    node.type === 'COMPONENT' ||
    node.type === 'COMPONENT_SET' ||
    node.type === 'INSTANCE'
  );
}

function hasChildren(node) {
  return 'children' in node && Array.isArray(node.children);
}

/** Iterative DFS that skips component/instance/variant-set subtrees entirely. */
function collectHiddenNonComponentNodes(roots) {
  const hidden = [];
  const stack = [...roots];

  while (stack.length) {
    const node = stack.pop();
    if (!node || node.removed) continue;

    if (isComponentish(node)) continue;

    if ('visible' in node && node.visible === false) {
      hidden.push(node);
      continue;
    }

    if (hasChildren(node)) {
      for (const child of node.children) {
        if (!isComponentish(child)) stack.push(child);
      }
    }
  }

  return hidden;
}

/** Keep only nodes that don't have a hidden ancestor in the same set. */
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

/** Nearest visible ancestor to focus when selection is blocked. */
function closestVisibleAncestor(node) {
  let p = node;
  while (p && p.type !== 'PAGE') {
    if (!('visible' in p) || p.visible) return p;
    p = p.parent;
  }
  return figma.currentPage;
}

/** Try to select; if blocked (hidden/locked), keep old selection and focus parent. */
function trySelectNode(node) {
  if (!node || node.removed) {
    figma.notify('Layer no longer exists.');
    return { selected: false };
  }

  const beforeSel = figma.currentPage.selection.slice();
  figma.currentPage.selection = [node];

  const success =
    figma.currentPage.selection.length === 1 &&
    figma.currentPage.selection[0].id === node.id;

  if (success) {
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

// -------------------- core search --------------------

function findHiddenLayers() {
  const selection = figma.currentPage.selection;

  if (selection.length === 0) {
    figma.ui.postMessage({ type: 'prompt-selection' });
    return;
  }

  const hiddenSelected = selection.filter(
    n => !isComponentish(n) && 'visible' in n && n.visible === false
  );

  const hiddenDesc = collectHiddenNonComponentNodes(selection);

  const allHidden = [...hiddenSelected, ...hiddenDesc];
  const topHidden = toTopLevelHidden(allHidden);

  const layers = topHidden.map(n => ({ id: n.id, name: n.name }));

  figma.ui.postMessage({
    type: 'render-layers',
    layers
  });
}

// -------------------- UI bridge --------------------

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
        } catch (err) {
          // ignore nodes that cannot be removed
        }
      }
    }
    if (deletedIds.length) {
      const n = deletedIds.length;
      figma.notify(`Deleted ${n} layer${n === 1 ? '' : 's'}.`);
      // Preserve UI state: tell the UI exactly which rows to remove, do NOT rescan.
      figma.ui.postMessage({ type: 'deleted-ids', ids: deletedIds });
    } else {
      figma.notify('Nothing to delete.');
    }
  }

  if (msg.type === 'search-again') {
    findHiddenLayers();
  }
};
