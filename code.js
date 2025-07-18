/**
 * @name Hide Layer Hunter 2.0 - Code
 * @description This is the "backend" of the plugin. It finds hidden layers
 * and communicates with the UI.
 */

// Show the UI when the plugin is run.
figma.showUI(__html__, { width: 280, height: 450 });

// --- Function to find hidden layers ---
function findHiddenLayers() {
  const selection = figma.currentPage.selection;

  // If nothing is selected, send a message to the UI to show a prompt.
  if (selection.length === 0) {
    figma.ui.postMessage({ type: 'prompt-selection' });
    return; // Stop the function here.
  }
  
  // If something is selected, proceed with the search.
  const searchNodes = selection;
  const scopeDescription = "in your selection";
  
  // Use a standard for-loop which is more robust than reduce/flatMap with the Figma API.
  let allExplicitlyHidden = [];
  for (const node of searchNodes) {
      const found = node.findAll(n => !n.visible && n.type !== 'COMPONENT' && n.type !== 'INSTANCE');
      for (const item of found) {
          allExplicitlyHidden.push(item);
      }
  }

  const hiddenSelectedNodes = searchNodes.filter(n =>
    !n.visible && n.type !== 'COMPONENT' && n.type !== 'INSTANCE' && n.id !== figma.currentPage.id
  );

  const allHiddenNodes = [...hiddenSelectedNodes, ...allExplicitlyHidden];
  const uniqueHiddenNodesMap = new Map(allHiddenNodes.map(node => [node.id, node]));
  
  const hiddenIds = new Set(uniqueHiddenNodesMap.keys());

  const topLevelHiddenLayers = [];
  for (const node of uniqueHiddenNodesMap.values()) {
    let isTopLevel = true;
    let parent = node.parent;
    
    while (parent && parent.id !== figma.currentPage.id) {
      if (hiddenIds.has(parent.id)) {
        isTopLevel = false;
        break;
      }
      parent = parent.parent;
    }

    if (isTopLevel) {
      topLevelHiddenLayers.push(node);
    }
  }

  const layerData = topLevelHiddenLayers.map(layer => ({
    id: layer.id,
    name: layer.name
  }));

  figma.ui.postMessage({
    type: 'render-layers',
    layers: layerData,
    scope: scopeDescription
  });
}

// --- Listen for messages from the UI ---
figma.ui.onmessage = msg => {
  if (msg.type === 'zoom-to-layer') {
    const nodeToZoom = figma.getNodeById(msg.id);
    if (nodeToZoom) {
      figma.currentPage.selection = [nodeToZoom];
      figma.viewport.scrollAndZoomIntoView([nodeToZoom]);
    }
  } else if (msg.type === 'search-again') {
    findHiddenLayers();
  } else if (msg.type === 'delete-selected') {
    const idsToDelete = msg.ids;
    if (idsToDelete && idsToDelete.length > 0) {
        let deletedCount = 0;
        idsToDelete.forEach(id => {
            const nodeToDelete = figma.getNodeById(id);
            if (nodeToDelete && !nodeToDelete.removed) {
                nodeToDelete.remove();
                deletedCount++;
            }
        });
        figma.notify(`Deleted ${deletedCount} layer(s).`);
        findHiddenLayers();
    }
  }
};

// --- Initial run ---
// Run the check as soon as the plugin starts.
findHiddenLayers();
