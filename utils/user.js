import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const USERS_FILE_PATH = path.join(__dirname, "/users.json");

export const loadUsers = async () => {
  try {
    const data = await fs.readFile(USERS_FILE_PATH, "utf8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading users file:", error);
    throw new Error("Unable to read users file");
  }
};

export const saveUsers = async (users) => {
  try {
    await fs.writeFile(USERS_FILE_PATH, JSON.stringify(users, null, 2));
  } catch (error) {
    console.error("Error writing to users file:", error);
    throw new Error("Unable to write to users file");
  }
};
