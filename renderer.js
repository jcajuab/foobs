const { ipcRenderer } = require("electron");

// DOM Elements
const startScreen = document.getElementById("start-screen");
const mainScreen = document.getElementById("main-screen");
const startButton = document.getElementById("start-button");
const exitButton = document.getElementById("exit-button");
const addTargetButton = document.getElementById("add-target-button");
const targetsContainer = document.getElementById("targets-container");

// Modals
const addTargetModal = document.getElementById("add-target-modal");
const editTargetModal = document.getElementById("edit-target-modal");
const deleteModal = document.getElementById("delete-modal");

// Forms
const addTargetForm = document.getElementById("add-target-form");
const editTargetForm = document.getElementById("edit-target-form");

// Add Target Form Elements
const targetPathInput = document.getElementById("target-path");
const displayNameInput = document.getElementById("display-name");
const targetTypeSelect = document.getElementById("target-type");
const chooseFileButton = document.getElementById("choose-file-button");
const cancelButton = document.getElementById("cancel-button");

// Edit Target Form Elements
const editTargetIndexInput = document.getElementById("edit-target-index");
const editTargetPathInput = document.getElementById("edit-target-path");
const editDisplayNameInput = document.getElementById("edit-display-name");
const editTargetTypeSelect = document.getElementById("edit-target-type");
const editChooseFileButton = document.getElementById("edit-choose-file-button");
const editCancelButton = document.getElementById("edit-cancel-button");

// Delete Modal Elements
const deleteTargetIndexInput = document.getElementById("delete-target-index");
const deleteFromFoobsButton = document.getElementById("delete-from-foobs");
const deleteFileTooButton = document.getElementById("delete-file-too");
const deleteCancelButton = document.getElementById("delete-cancel-button");

// Store for targets
let targets = [];
// Track currently editing string index
let currentlyEditingStringIndex = null;

// Add keyboard shortcut hint to the UI
function addKeyboardHint() {
  const hintElement = document.createElement("div");
  hintElement.className = "keyboard-hint";
  hintElement.innerHTML =
    "Shortcuts: <kbd>Ctrl+N</kbd> New Target | <kbd>Esc</kbd> Close Modal | <kbd>Ctrl+S</kbd> Save";
  document.body.appendChild(hintElement);
}

// Event Listeners
startButton.addEventListener("click", () => {
  startScreen.classList.add("hidden");
  mainScreen.classList.remove("hidden");
  loadTargets();
  addKeyboardHint();
});

exitButton.addEventListener("click", () => {
  window.close();
});

addTargetButton.addEventListener("click", () => {
  // Reset form
  addTargetForm.reset();
  targetPathInput.value = "";

  // Show modal
  addTargetModal.classList.remove("hidden");
});

chooseFileButton.addEventListener("click", async () => {
  const filePath = await ipcRenderer.invoke("select-file");
  if (filePath) {
    targetPathInput.value = filePath;
  }
});

editChooseFileButton.addEventListener("click", async () => {
  const filePath = await ipcRenderer.invoke("select-file");
  if (filePath) {
    editTargetPathInput.value = filePath;
  }
});

cancelButton.addEventListener("click", () => {
  addTargetModal.classList.add("hidden");
});

editCancelButton.addEventListener("click", () => {
  editTargetModal.classList.add("hidden");
});

deleteCancelButton.addEventListener("click", () => {
  deleteModal.classList.add("hidden");
});

// Delete target handlers
deleteFromFoobsButton.addEventListener("click", async () => {
  const index = parseInt(deleteTargetIndexInput.value);

  // Remove target from array
  targets.splice(index, 1);

  // Save and re-render
  await saveTargets();
  renderTargets();

  // Hide modal
  deleteModal.classList.add("hidden");
});

deleteFileTooButton.addEventListener("click", async () => {
  const index = parseInt(deleteTargetIndexInput.value);
  const filePath = targets[index].path;

  // Delete the file
  const success = await ipcRenderer.invoke("delete-file", filePath);

  if (success) {
    // Remove target from array
    targets.splice(index, 1);

    // Save and re-render
    await saveTargets();
    renderTargets();
  } else {
    alert("Failed to delete the file. The target will remain in FOOBS.");
  }

  // Hide modal
  deleteModal.classList.add("hidden");
});

// Add keyboard shortcut handling
document.addEventListener("keydown", (e) => {
  // Ctrl/Cmd + N: Add new target
  if ((e.ctrlKey || e.metaKey) && e.key === "n") {
    e.preventDefault();
    addTargetButton.click();
  }

  // Escape: Close any open modal
  if (e.key === "Escape") {
    if (!addTargetModal.classList.contains("hidden")) {
      addTargetModal.classList.add("hidden");
    }
    if (!editTargetModal.classList.contains("hidden")) {
      editTargetModal.classList.add("hidden");
    }
    if (!deleteModal.classList.contains("hidden")) {
      deleteModal.classList.add("hidden");
    }

    // Also cancel any string editing
    if (currentlyEditingStringIndex !== null) {
      cancelStringEdit();
    }
  }

  // Ctrl/Cmd + S: Save targets
  if ((e.ctrlKey || e.metaKey) && e.key === "s") {
    e.preventDefault();
    saveTargets();
  }
});

// Form Submissions
addTargetForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const filePath = targetPathInput.value;
  const displayName = displayNameInput.value;
  const type = targetTypeSelect.value;

  if (!filePath) {
    alert("Please select a target file");
    return;
  }

  // Read initial content
  let content = await ipcRenderer.invoke("read-file", filePath);

  // For integer type, ensure content is a valid number
  if (type === "integer") {
    if (isNaN(parseInt(content))) {
      content = "0";
      await ipcRenderer.invoke("write-file", filePath, content);
    }
  }

  // Add new target
  const newTarget = {
    path: filePath,
    displayName,
    type,
    content,
  };

  targets.push(newTarget);
  await saveTargets();
  renderTargets();

  // Hide modal
  addTargetModal.classList.add("hidden");
});

editTargetForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const index = parseInt(editTargetIndexInput.value);
  const filePath = editTargetPathInput.value;
  const displayName = editDisplayNameInput.value;
  const type = editTargetTypeSelect.value;

  if (!filePath) {
    alert("Please select a target file");
    return;
  }

  // Read content if file path changed
  let content = targets[index].content;
  if (filePath !== targets[index].path) {
    content = await ipcRenderer.invoke("read-file", filePath);
  }

  // For integer type, ensure content is a valid number
  if (type === "integer" && isNaN(parseInt(content))) {
    content = "0";
    await ipcRenderer.invoke("write-file", filePath, content);
  }

  // Update target
  targets[index] = {
    path: filePath,
    displayName,
    type,
    content,
  };

  await saveTargets();
  renderTargets();

  // Hide modal
  editTargetModal.classList.add("hidden");
});

// Functions
async function loadTargets() {
  targets = await ipcRenderer.invoke("load-targets");
  renderTargets();
}

async function saveTargets() {
  await ipcRenderer.invoke("save-targets", targets);
}

async function updateIntegerValue(index, change) {
  const target = targets[index];
  let value = parseInt(target.content) || 0;
  value += change;

  // Update target content
  target.content = value.toString();

  // Write to file
  await ipcRenderer.invoke("write-file", target.path, target.content);

  await saveTargets();
  renderTargets();
}

function openEditModal(index) {
  const target = targets[index];

  editTargetIndexInput.value = index;
  editTargetPathInput.value = target.path;
  editDisplayNameInput.value = target.displayName;
  editTargetTypeSelect.value = target.type;

  editTargetModal.classList.remove("hidden");
}

function openDeleteModal(index) {
  deleteTargetIndexInput.value = index;
  deleteModal.classList.remove("hidden");
}

// String editing functions
function startStringEdit(index) {
  // If already editing another string, cancel that edit first
  if (
    currentlyEditingStringIndex !== null &&
    currentlyEditingStringIndex !== index
  ) {
    cancelStringEdit();
  }

  currentlyEditingStringIndex = index;

  const target = targets[index];
  const targetElement = document.querySelector(
    `.target-item[data-index="${index}"]`,
  );
  const stringValueElement = targetElement.querySelector(".string-value");

  // Replace the string value display with an input
  const stringValueContainer = stringValueElement.parentElement;

  // Create textarea
  const textarea = document.createElement("textarea");
  textarea.className = "string-input";
  textarea.value = target.content;
  textarea.rows = 3;

  // Create action buttons
  const actionsDiv = document.createElement("div");
  actionsDiv.className = "string-actions";

  const saveButton = document.createElement("button");
  saveButton.textContent = "Save";
  saveButton.addEventListener("click", () =>
    saveStringEdit(index, textarea.value),
  );

  const cancelButton = document.createElement("button");
  cancelButton.textContent = "Cancel";
  cancelButton.addEventListener("click", cancelStringEdit);

  actionsDiv.appendChild(cancelButton);
  actionsDiv.appendChild(saveButton);

  // Replace content
  stringValueContainer.innerHTML = "";
  stringValueContainer.appendChild(textarea);
  stringValueContainer.appendChild(actionsDiv);

  // Focus the textarea
  textarea.focus();
}

async function saveStringEdit(index, newValue) {
  const target = targets[index];

  // Update target content
  target.content = newValue;

  // Write to file
  await ipcRenderer.invoke("write-file", target.path, newValue);

  currentlyEditingStringIndex = null;

  await saveTargets();
  renderTargets();
}

function cancelStringEdit() {
  currentlyEditingStringIndex = null;
  renderTargets();
}

// Drag and drop functionality
let draggedItem = null;

function handleDragStart(e) {
  // Don't allow dragging if we're editing a string
  if (currentlyEditingStringIndex !== null) {
    e.preventDefault();
    return;
  }

  draggedItem = this;
  this.classList.add("dragging");
  e.dataTransfer.effectAllowed = "move";
  e.dataTransfer.setData("text/plain", this.dataset.index);
}

function handleDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = "move";
  return false;
}

function handleDragEnter(e) {
  this.classList.add("drag-over");
}

function handleDragLeave(e) {
  this.classList.remove("drag-over");
}

function handleDrop(e) {
  e.stopPropagation();

  if (draggedItem !== this) {
    const fromIndex = parseInt(draggedItem.dataset.index);
    const toIndex = parseInt(this.dataset.index);

    // Reorder the targets array
    const movedItem = targets.splice(fromIndex, 1)[0];
    targets.splice(toIndex, 0, movedItem);

    // Save and re-render
    saveTargets();
    renderTargets();
  }

  return false;
}

function handleDragEnd(e) {
  const items = document.querySelectorAll(".target-item");
  items.forEach((item) => {
    item.classList.remove("dragging");
    item.classList.remove("drag-over");
  });

  draggedItem = null;
}

function renderTargets() {
  targetsContainer.innerHTML = "";

  targets.forEach((target, index) => {
    const targetElement = document.createElement("div");
    targetElement.className = "target-item";
    targetElement.draggable = true;
    targetElement.dataset.index = index;

    // Add drag and drop event listeners
    targetElement.addEventListener("dragstart", handleDragStart);
    targetElement.addEventListener("dragover", handleDragOver);
    targetElement.addEventListener("dragenter", handleDragEnter);
    targetElement.addEventListener("dragleave", handleDragLeave);
    targetElement.addEventListener("drop", handleDrop);
    targetElement.addEventListener("dragend", handleDragEnd);

    // Create header
    const headerElement = document.createElement("div");
    headerElement.className = "target-header";

    // Create header left section with drag handle, name and badge
    const headerLeftElement = document.createElement("div");
    headerLeftElement.className = "target-header-left";

    // Add drag handle
    const dragHandle = document.createElement("div");
    dragHandle.className = "drag-handle";

    const nameElement = document.createElement("div");
    nameElement.className = "target-name";
    nameElement.textContent = target.displayName;

    // Add type badge
    const typeBadge = document.createElement("div");
    typeBadge.className = `type-badge type-badge-${target.type}`;
    typeBadge.textContent = target.type;

    headerLeftElement.appendChild(dragHandle);
    headerLeftElement.appendChild(nameElement);
    headerLeftElement.appendChild(typeBadge);

    // Create header actions
    const actionsElement = document.createElement("div");
    actionsElement.className = "target-actions";

    // Edit button
    const editButton = document.createElement("button");
    editButton.className = "button-icon edit";
    editButton.innerHTML = "✎";
    editButton.title = "Edit target";
    editButton.addEventListener("click", () => openEditModal(index));

    // Delete button
    const deleteButton = document.createElement("button");
    deleteButton.className = "button-icon delete";
    deleteButton.innerHTML = "✕";
    deleteButton.title = "Delete target";
    deleteButton.addEventListener("click", () => openDeleteModal(index));

    actionsElement.appendChild(editButton);
    actionsElement.appendChild(deleteButton);

    headerElement.appendChild(headerLeftElement);
    headerElement.appendChild(actionsElement);

    // Create content
    const contentElement = document.createElement("div");
    contentElement.className = "target-content";

    if (target.type === "integer") {
      const integerContainer = document.createElement("div");
      integerContainer.className = "integer-target-container";

      const integerElement = document.createElement("div");
      integerElement.className = "integer-target";

      // Create integer controls - FIXED: Only create one set of controls
      const integerControls = document.createElement("div");
      integerControls.className = "integer-controls";

      // Create decrement group (-1 and -2)
      const decrementGroup = document.createElement("div");
      decrementGroup.className = "integer-control-group";

      const decrementButton2 = document.createElement("button");
      decrementButton2.className = "integer-button decrement-2";
      decrementButton2.textContent = "-2";
      decrementButton2.addEventListener("click", () =>
        updateIntegerValue(index, -2),
      );

      const decrementButton = document.createElement("button");
      decrementButton.className = "integer-button decrement";
      decrementButton.textContent = "-";
      decrementButton.addEventListener("click", () =>
        updateIntegerValue(index, -1),
      );

      decrementGroup.appendChild(decrementButton2);
      decrementGroup.appendChild(decrementButton);

      // Create increment group (+1 and +2)
      const incrementGroup = document.createElement("div");
      incrementGroup.className = "integer-control-group";

      const incrementButton = document.createElement("button");
      incrementButton.className = "integer-button increment";
      incrementButton.textContent = "+";
      incrementButton.addEventListener("click", () =>
        updateIntegerValue(index, 1),
      );

      const incrementButton2 = document.createElement("button");
      incrementButton2.className = "integer-button increment-2";
      incrementButton2.textContent = "+2";
      incrementButton2.addEventListener("click", () =>
        updateIntegerValue(index, 2),
      );

      incrementGroup.appendChild(incrementButton);
      incrementGroup.appendChild(incrementButton2);

      integerControls.appendChild(decrementGroup);
      integerControls.appendChild(incrementGroup);

      const valueElement = document.createElement("div");
      valueElement.className = "integer-value";
      valueElement.textContent = target.content;

      // FIXED: Only add controls once
      integerElement.appendChild(integerControls);
      integerElement.appendChild(valueElement);

      integerContainer.appendChild(integerElement);
      contentElement.appendChild(integerContainer);
    } else {
      // String target
      const stringElement = document.createElement("div");
      stringElement.className = "string-target";

      // Check if this is the string we're currently editing
      if (currentlyEditingStringIndex === index) {
        // Create textarea
        const textarea = document.createElement("textarea");
        textarea.className = "string-input";
        textarea.value = target.content;
        textarea.rows = 3;

        // Create action buttons
        const actionsDiv = document.createElement("div");
        actionsDiv.className = "string-actions";

        const saveButton = document.createElement("button");
        saveButton.textContent = "Save";
        saveButton.addEventListener("click", () =>
          saveStringEdit(index, textarea.value),
        );

        const cancelButton = document.createElement("button");
        cancelButton.textContent = "Cancel";
        cancelButton.addEventListener("click", cancelStringEdit);

        actionsDiv.appendChild(cancelButton);
        actionsDiv.appendChild(saveButton);

        stringElement.appendChild(textarea);
        stringElement.appendChild(actionsDiv);
      } else {
        // Regular display mode
        const valueElement = document.createElement("div");
        valueElement.className = "string-value editable";
        valueElement.textContent = target.content;
        valueElement.addEventListener("click", () => startStringEdit(index));

        stringElement.appendChild(valueElement);
      }

      contentElement.appendChild(stringElement);
    }

    targetElement.appendChild(headerElement);
    targetElement.appendChild(contentElement);

    targetsContainer.appendChild(targetElement);
  });
}
