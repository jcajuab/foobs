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
const stringUpdateModal = document.getElementById("string-update-modal");

// Forms
const addTargetForm = document.getElementById("add-target-form");
const editTargetForm = document.getElementById("edit-target-form");
const stringUpdateForm = document.getElementById("string-update-form");

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

// String Update Form Elements
const stringTargetIndexInput = document.getElementById("string-target-index");
const stringValueInput = document.getElementById("string-value");
const stringCancelButton = document.getElementById("string-cancel-button");

// Store for targets
let targets = [];

// Event Listeners
startButton.addEventListener("click", () => {
  startScreen.classList.add("hidden");
  mainScreen.classList.remove("hidden");
  loadTargets();
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

stringCancelButton.addEventListener("click", () => {
  stringUpdateModal.classList.add("hidden");
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

stringUpdateForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const index = parseInt(stringTargetIndexInput.value);
  const newValue = stringValueInput.value;

  // Update target content
  targets[index].content = newValue;

  // Write to file
  await ipcRenderer.invoke("write-file", targets[index].path, newValue);

  await saveTargets();
  renderTargets();

  // Hide modal
  stringUpdateModal.classList.add("hidden");
});

// Functions
async function loadTargets() {
  targets = await ipcRenderer.invoke("load-targets");
  renderTargets();
}

async function saveTargets() {
  await ipcRenderer.invoke("save-targets", targets);
}

function renderTargets() {
  targetsContainer.innerHTML = "";

  targets.forEach((target, index) => {
    const targetElement = document.createElement("div");
    targetElement.className = "target-item";

    // Create header
    const headerElement = document.createElement("div");
    headerElement.className = "target-header";

    const nameElement = document.createElement("div");
    nameElement.className = "target-name";
    nameElement.textContent = target.displayName;

    const actionsElement = document.createElement("div");
    actionsElement.className = "target-actions";

    const editButton = document.createElement("button");
    editButton.textContent = "Edit";
    editButton.addEventListener("click", () => openEditModal(index));

    actionsElement.appendChild(editButton);
    headerElement.appendChild(nameElement);
    headerElement.appendChild(actionsElement);

    // Create content
    const contentElement = document.createElement("div");
    contentElement.className = "target-content";

    if (target.type === "integer") {
      const integerContainer = document.createElement("div");
      integerContainer.className = "integer-target-container";

      const integerElement = document.createElement("div");
      integerElement.className = "integer-target";

      const decrementButton = document.createElement("button");
      decrementButton.className = "integer-button";
      decrementButton.textContent = "-";
      decrementButton.addEventListener("click", () =>
        updateIntegerValue(index, -1),
      );

      const valueElement = document.createElement("div");
      valueElement.className = "integer-value";
      valueElement.textContent = target.content;

      const incrementButton = document.createElement("button");
      incrementButton.className = "integer-button";
      incrementButton.textContent = "+";
      incrementButton.addEventListener("click", () =>
        updateIntegerValue(index, 1),
      );

      integerElement.appendChild(decrementButton);
      integerElement.appendChild(valueElement);
      integerElement.appendChild(incrementButton);

      integerContainer.appendChild(integerElement);
      contentElement.appendChild(integerContainer);
    } else {
      const stringElement = document.createElement("div");
      stringElement.className = "string-target";

      const valueElement = document.createElement("div");
      valueElement.className = "string-value";
      valueElement.textContent = target.content;

      const actionsElement = document.createElement("div");
      actionsElement.className = "string-actions";

      const updateButton = document.createElement("button");
      updateButton.textContent = "Update";
      updateButton.addEventListener("click", () =>
        openStringUpdateModal(index),
      );

      actionsElement.appendChild(updateButton);
      stringElement.appendChild(valueElement);
      stringElement.appendChild(actionsElement);

      contentElement.appendChild(stringElement);
    }

    targetElement.appendChild(headerElement);
    targetElement.appendChild(contentElement);

    targetsContainer.appendChild(targetElement);
  });
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

function openStringUpdateModal(index) {
  const target = targets[index];

  stringTargetIndexInput.value = index;
  stringValueInput.value = target.content;

  stringUpdateModal.classList.remove("hidden");
}
