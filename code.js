/**
 * @name Hide Layer Hunter
 * @description A Figma plugin to find and select all hidden layers within the user's selection, or on the entire page if nothing is selected. Excludes components and instances.
 */

// Helper function to check if a node is a component or instance (including nested ones)
function isComponentOrInstance(node) {
  // Check if the node itself is a component or instance
  if (node.type === 'COMPONENT' || node.type === 'INSTANCE') {
    return true;
  }
  
  // Check if any parent is a component or instance
  let parent = node.parent;
  while (parent) {
    if (parent.type === 'COMPONENT' || parent.type === 'INSTANCE') {
      return true;
    }
    parent = parent.parent;
  }
  
  return false;
}

// This is the main function that runs when the plugin is executed.
function huntHiddenLayers() {
  // --- 1. Determine the search scope ---
  const selection = figma.currentPage.selection;
  let searchNodes;
  let scopeDescription;

  if (selection.length > 0) {
    // If the user has selected one or more items, search within them.
    searchNodes = selection;
    scopeDescription = "in your selection";
  } else {
    // If nothing is selected, search the entire page.
    // We put the page in an array to keep the logic consistent.
    searchNodes = [figma.currentPage];
    scopeDescription = "on this page";
  }

  // --- 2. Find all hidden layers within the determined scope ---
  // We use `flatMap` to iterate through our search nodes (either the selection or the page)
  // and then run `findAll` on each one, collecting all results into a single array.
  const hiddenLayers = searchNodes.flatMap(node => 
    node.findAll(child =>
      !child.visible &&
      !isComponentOrInstance(child)
    )
  );

  const count = hiddenLayers.length;

  // --- 3. Select layers and notify the user ---
  if (count > 0) {
    // If we found one or more hidden layers:
    
    // a) Select them in the Layers panel.
    figma.currentPage.selection = hiddenLayers;

    // b) Create a user-friendly message.
    const layerText = count === 1 ? 'layer' : 'layers';
    
    // c) Show a toast notification with the correct scope.
    figma.notify(`Found and selected ${count} hidden ${layerText} ${scopeDescription}`, { timeout: 5000 });

  } else {
    // If no hidden layers were found, let the user know, specifying the scope.
    figma.notify(`No hidden layers found ${scopeDescription}`, { timeout: 5000 });
  }

  // --- 4. Close the plugin ---
  figma.closePlugin();
}

// Execute the main function.
huntHiddenLayers();
