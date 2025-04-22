const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");

// Store for target files
let targets = [];

function createWindow() {
  // Create the browser window with dimensions that can now be resized
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    backgroundColor: "#202225", // OBS-like dark background
    minWidth: 600, // Set minimum dimensions for usability
    minHeight: 400,
  });

  // Load the index.html file
  mainWindow.loadFile("index.html");

  // Remove menu bar for cleaner look
  mainWindow.setMenuBarVisibility(false);
}

// When Electron is ready, create the window
app.whenReady().then(() => {
  createWindow();

  app.on("activate", function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

// Quit when all windows are closed, except on macOS
app.on("window-all-closed", function () {
  if (process.platform !== "darwin") app.quit();
});

// IPC handlers for file operations
ipcMain.handle("select-file", async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "Text Files", extensions: ["txt"] }],
  });

  if (canceled) return null;
  return filePaths[0];
});

ipcMain.handle("read-file", async (event, filePath) => {
  try {
    const content = fs.readFileSync(filePath, "utf8");
    return content;
  } catch (error) {
    console.error("Error reading file:", error);
    return "";
  }
});

ipcMain.handle("write-file", async (event, filePath, content) => {
  try {
    fs.writeFileSync(filePath, content);
    return true;
  } catch (error) {
    console.error("Error writing file:", error);
    return false;
  }
});

// Handler for deleting files
ipcMain.handle("delete-file", async (event, filePath) => {
  try {
    fs.unlinkSync(filePath);
    return true;
  } catch (error) {
    console.error("Error deleting file:", error);
    return false;
  }
});

// Handle saving and loading targets
ipcMain.handle("save-targets", async (event, newTargets) => {
  targets = newTargets;
  try {
    fs.writeFileSync(
      path.join(app.getPath("userData"), "targets.json"),
      JSON.stringify(targets),
    );
    return true;
  } catch (error) {
    console.error("Error saving targets:", error);
    return false;
  }
});

ipcMain.handle("load-targets", async () => {
  try {
    const filePath = path.join(app.getPath("userData"), "targets.json");
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf8");
      targets = JSON.parse(data);
    }
    return targets;
  } catch (error) {
    console.error("Error loading targets:", error);
    return [];
  }
});
