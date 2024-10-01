import express from "express";
import bcrypt from "bcrypt";
import { loadUsers, saveUsers } from "../utils/user.js";
import {
  updatePermissionsForNewFolder,
  loadFolderPermissions,
  removePermissionFromFolder,
} from "../utils/permission.js";
import {
  loadGroups,
  saveGroups,
  addGroup,
  deleteGroup,
} from "../utils/groups.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "../../data");

const router = express.Router();

const isAdmin = (req, res, next) => {
  if (req.session.role === "admin") {
    return next();
  }
  return res.status(403).json({ error: "Access denied. Admins only." });
};

router.get("/users", isAdmin, async (req, res) => {
  try {
    const users = await loadUsers();
    res.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Unable to fetch users" });
  }
});

router.post("/users", isAdmin, async (req, res) => {
  const { username, password, role } = req.body;

  if (!username || !password || !role) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const users = await loadUsers();

    if (users.find((user) => user.username === username)) {
      return res.status(400).json({ error: "User already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    users.push({ username, passwordHash, role });
    await saveUsers(users);
    res.json({ success: true });
  } catch (error) {
    console.error("Error adding user:", error);
    res.status(500).json({ error: "Unable to add user" });
  }
});

router.put("/users/:username", isAdmin, async (req, res) => {
  const { username } = req.params;
  const { newUsername, newPassword, group } = req.body;

  try {
    const users = await loadUsers();
    const userIndex = users.findIndex((user) => user.username === username);

    if (userIndex === -1) {
      return res.status(404).json({ error: "User not found" });
    }

    if (newUsername && newUsername !== users[userIndex].username) {
      if (users.find((user) => user.username === newUsername)) {
        return res.status(400).json({ error: "Username already exists" });
      }
      users[userIndex].username = newUsername;
    }

    if (newPassword) {
      users[userIndex].passwordHash = await bcrypt.hash(newPassword, 10);
    }

    if (group) {
      users[userIndex].group = group;
    }

    await saveUsers(users);
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating user:", error.message);
    res.status(500).json({ error: "Unable to update user" });
  }
});

router.delete("/users/:username", isAdmin, async (req, res) => {
  const { username } = req.params;

  try {
    let users = await loadUsers();
    users = users.filter((user) => user.username !== username);

    if (users.length === (await loadUsers()).length) {
      return res.status(404).json({ error: "User not found" });
    }

    await saveUsers(users);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Unable to delete user" });
  }
});

router.put("/permissions", isAdmin, async (req, res) => {
  const { folderPath, groups } = req.body;

  if (
    typeof folderPath !== "string" ||
    folderPath.trim() === "" ||
    !Array.isArray(groups)
  ) {
    return res.status(400).json({ error: "Invalid data" });
  }

  try {
    let absoluteFolderPath = path.resolve(DATA_DIR, folderPath);
    let relativeFolderPath = path
      .relative(DATA_DIR, absoluteFolderPath)
      .replace(/\\/g, "/");

    if (relativeFolderPath.startsWith("../")) {
      relativeFolderPath = relativeFolderPath.replace(/^(\.\.\/)+/, "");
    }

    await updatePermissionsForNewFolder(relativeFolderPath, groups);
    res.json({ success: true });
  } catch (err) {
    console.error("Error updating permissions:", err);
    res.status(500).json({ error: "Unable to update permissions" });
  }
});
router.put("/permissions/remove", isAdmin, async (req, res) => {
  let { path: folderPath, group } = req.body;

  if (!folderPath || !group) {
    return res
      .status(400)
      .json({ error: "Folder path and group are required" });
  }

  try {
    await removePermissionFromFolder(folderPath, group);
    res.json({ success: true });
  } catch (err) {
    console.error("Error removing permission:", err);
    res.status(500).json({ error: "Unable to remove permission" });
  }
});

router.get("/permissions/:path", isAdmin, async (req, res) => {
  let { path: requestedPath } = req.params;

  requestedPath = requestedPath.replace(/^\//, "");

  console.log("Requested path:", requestedPath);

  try {
    const folderPermissions = await loadFolderPermissions();
    const permissions = folderPermissions[requestedPath] || [];

    res.json({ permissions });
  } catch (err) {
    console.error("Error fetching permissions:", err);
    res.status(500).json({ error: "Unable to fetch permissions" });
  }
});

router.get("/groups", isAdmin, async (req, res) => {
  try {
    const groups = await loadGroups();
    res.json(groups);
  } catch (error) {
    console.error("Error fetching groups:", error);
    res.status(500).json({ error: "Unable to fetch groups" });
  }
});

router.post("/groups", isAdmin, async (req, res) => {
  const { group } = req.body;

  if (!group) {
    return res.status(400).json({ error: "Group name is required" });
  }

  try {
    await addGroup(group);
    res.json({ success: true });
  } catch (error) {
    console.error("Error adding group:", error);
    res.status(500).json({ error: "Unable to add group" });
  }
});

router.delete("/groups/:group", isAdmin, async (req, res) => {
  const { group } = req.params;

  try {
    if (group === "Default" || group === "Admin") {
      return res.status(400).json({ error: "You cannot delete this group" });
    }
    await deleteGroup(group);
    res.json({ success: true });
  } catch (error) {
    console.error("Error deleting group:", error);
    res.status(500).json({ error: "Unable to delete group" });
  }
});

export default router;
