import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GROUPS_FILE_PATH = path.join(__dirname, '/groups.json');

export const loadGroups = async () => {
  const data = await fs.readFile(GROUPS_FILE_PATH, "utf8");
  return JSON.parse(data).groups;
};

export const saveGroups = async (groups) => {
  const data = JSON.stringify({ groups }, null, 2);
  await fs.writeFile(GROUPS_FILE_PATH, data);
};

export const addGroup = async (newGroup) => {
  const groups = await loadGroups();
  if (!groups.includes(newGroup)) {
    groups.push(newGroup);
    await saveGroups(groups);
  }
};

export const deleteGroup = async (groupToDelete) => {
  let groups = await loadGroups();
  groups = groups.filter(group => group !== groupToDelete);
  await saveGroups(groups);
};
