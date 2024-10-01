import express from "express";
import fs from "fs/promises";
import path from "path";
import multer from "multer";
import { loadUsers } from "../utils/user.js";
import getAccessibleFiles from "../utils/file.js"
import { fileURLToPath } from "url";
import {
  initializeDefaultPermissions,
  loadFolderPermissions,
  updatePermissionsForNewFolder,
} from "../utils/permission.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "../../data");
const router = express.Router();
const upload = multer({ dest: "temp/" });


let folderPermissions;
initializeDefaultPermissions().then((perms) => {
  folderPermissions = perms;
  console.log("Permissions initialized.");
});

router.get("/files/*", async (req, res) => {
  const subDir = req.params[0];
  const directoryPath = path.join(DATA_DIR, subDir);
  const user = req.session.username;

  try {
    const users = await loadUsers();
    const currentUser = users.find((u) => u.username === user);
    const userGroups = currentUser ? [currentUser.group] : [];

    const accessibleFiles = await getAccessibleFiles(
      directoryPath,
      userGroups,
      folderPermissions
    );
    res.json(accessibleFiles);
  } catch (err) {
    console.error("Error handling request:", err);
    res.status(500).send("Internal Server Error");
  }
});

router.delete("/files/*", async (req, res) => {
  const subDir = req.params[0];
  const filePath = path.join(DATA_DIR, subDir);

  try {
    const stat = await fs.lstat(filePath);
    if (stat.isDirectory()) {
      await deleteDirectoryRecursively(filePath);
    } else {
      await fs.unlink(filePath);
    }
    res.json({ success: true });
  } catch (err) {
    console.error(`Error deleting file or directory at ${filePath}:`, err);
    res.status(500).json({ error: "Unable to delete file or directory" });
  }
});

router.post("/files/*/create-folder", async (req, res) => {
  const { name } = req.body;
  const subDir = req.params[0];
  const user = req.session.username;
  const folderPath = path.join(DATA_DIR, subDir, name);

  try {
    const users = await loadUsers();
    const currentUser = users.find((u) => u.username === user);
    const userGroup = currentUser ? [currentUser.group] : [];

    await fs.mkdir(folderPath, { recursive: true });

    await updatePermissionsForNewFolder(folderPath, userGroup);

    folderPermissions = await loadFolderPermissions();
    res.json({ success: true });
  } catch (err) {
    console.error(`Error creating folder: ${err}`);
    res.status(500).json({ error: "Unable to create folder" });
  }
});

router.put("/files/*", async (req, res) => {
  const subDir = req.params[0];
  const oldFilePath = path.join(DATA_DIR, subDir);
  const newFileName = req.body.newName;
  const newFilePath = path.join(DATA_DIR, path.dirname(subDir), newFileName);

  try {
    await fs.rename(oldFilePath, newFilePath);
    folderPermissions = await loadFolderPermissions();

    res.json({ success: true });
  } catch (err) {
    console.error(`Error renaming file: ${err}`);
    res.status(500).json({ error: "Unable to rename file" });
  }
});

router.post("/upload", upload.single("file"), async (req, res) => {
  const tempPath = req.file.path;
  const originalName = req.file.originalname;
  const currentPath = req.body.currentPath || "";
  const user = req.session.username;

  try {
    const users = await loadUsers();
    const currentUser = users.find((u) => u.username === user);
    const userGroup = currentUser ? [currentUser.group] : [];

    const targetPath = path.join(DATA_DIR, currentPath, originalName);

    await fs.mkdir(path.join(DATA_DIR, currentPath), { recursive: true });
    await fs.rename(tempPath, targetPath);

    await updatePermissionsForNewFolder(targetPath, userGroup);

    folderPermissions = await loadFolderPermissions();
    res.json({ success: true });
  } catch (err) {
    console.error(`Error handling file upload: ${err}`);
    res.status(500).send("Error handling file upload");
  }
});

export default router;

const deleteDirectoryRecursively = async (dirPath) => {
  const files = await fs.readdir(dirPath);

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const stat = await fs.lstat(filePath);

    if (stat.isDirectory()) {
      await deleteDirectoryRecursively(filePath);
    } else {
      await fs.unlink(filePath);
    }
  }

  await fs.rmdir(dirPath);
};
