import express from "express";
import bcrypt from "bcrypt";
import { loadUsers, saveUsers } from "../utils/user.js";

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
  const { newUsername, newPassword } = req.body;

  try {
    const users = await loadUsers();
    const userIndex = users.findIndex((user) => user.username === username);

    if (userIndex === -1) {
      return res.status(404).json({ error: "User not found" });
    }

    if (newUsername) {
      users[userIndex].username = newUsername;
    }

    if (newPassword) {
      users[userIndex].passwordHash = await bcrypt.hash(newPassword, 10);
    }

    await saveUsers(users);
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating user:", error);
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

router.get("/groups", isAdmin, (req, res) => {
  const groups = process.env.USER_GROUPS.split(",");
  res.json(groups);
});

router.put("/users/:username/group", isAdmin, async (req, res) => {
  const { username } = req.params;
  const { group } = req.body;

  if (!group) {
    return res.status(400).json({ error: "Group is required" });
  }

  try {
    const users = await loadUsers();
    const user = users.find((user) => user.username === username);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    user.group = group;
    await saveUsers(users);
    res.json({ success: true });
  } catch (error) {
    console.error("Error updating user group:", error);
    res.status(500).json({ error: "Unable to update user group" });
  }
});

export default router;
