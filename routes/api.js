import express from "express";
import fs from "fs/promises";
import path from "path";
import multer from "multer";
import getFilesList from "../utils/file.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "../../data");

const router = express.Router();
const upload = multer({ dest: "temp/" });

router.get("/files/*", async (req, res) => {
  const subDir = req.params[0];
  const directoryPath = path.join(DATA_DIR, subDir);

  try {
    const stat = await fs.lstat(directoryPath);
    if (stat.isDirectory()) {
      const fileList = await getFilesList(directoryPath);
      res.json(fileList);
    } else {
      res.status(404).send("Not Found");
    }
  } catch (err) {
    res.status(404).send("Not Found");
  }
});

const deleteDirectoryRecursively = async (directoryPath) => {
  try {
    const files = await fs.readdir(directoryPath);
    for (const file of files) {
      const filePath = path.join(directoryPath, file);
      const stat = await fs.lstat(filePath);

      if (stat.isDirectory()) {
        await deleteDirectoryRecursively(filePath);
      } else {
        await fs.unlink(filePath);
      }
    }
    await fs.rmdir(directoryPath);
  } catch (error) {
    console.error(`Error deleting directory ${directoryPath}:`, error);
    throw error;
  }
};

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
  const folderPath = path.join(DATA_DIR, subDir, name);

  try {
    await fs.mkdir(folderPath, { recursive: true });
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
  const targetPath = path.join(DATA_DIR, currentPath, originalName);

  try {
    await fs.mkdir(path.join(DATA_DIR, currentPath), { recursive: true });
    await fs.rename(tempPath, targetPath);
    res.json({ success: true });
  } catch (err) {
    console.error(`Error handling file upload: ${err}`);
    res.status(500).send("Error handling file upload");
  }
});

export default router;
