import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../../data');
const PERMISSIONS_FILE_PATH = path.join(__dirname, 'folderPermissions.json');

export const loadFolderPermissions = async () => {
    try {
      let data = await fs.readFile(PERMISSIONS_FILE_PATH, 'utf8');
      let folderPermissions = JSON.parse(data);
      
      if (Array.isArray(folderPermissions)) {
        throw new Error('Permissions file should be an object');
      }
      
      return folderPermissions;
    } catch (err) {
      return {};
    }
  };
  
  export const initializeDefaultPermissions = async () => {
    const folderPermissions = await loadFolderPermissions();
  
    const updatePermissionsRecursively = async (dirPath) => {
      const files = await fs.readdir(dirPath, { withFileTypes: true });
  
      for (const file of files) {
        const filePath = path.join(dirPath, file.name);
        const relativePath = path.relative(DATA_DIR, filePath).replace(/\\/g, '/');
  
        if (!folderPermissions[relativePath]) {
          folderPermissions[relativePath] = ["Default"];
        }
  
        if (file.isDirectory()) {
          await updatePermissionsRecursively(filePath);
        }
      }
    };
  
    await updatePermissionsRecursively(DATA_DIR);
    await savePermissions(folderPermissions);
    return folderPermissions;
  };
  
  

export const savePermissions = async (permissions) => {
  await fs.writeFile(PERMISSIONS_FILE_PATH, JSON.stringify(permissions, null, 2));
};

export const updatePermissionsForNewFolder = async (folderPath, groups = ["Default"]) => {
  const permissions = await loadFolderPermissions();
  const relativePath = path.relative(DATA_DIR, folderPath).replace(/\\/g, '/');
  if (!permissions.some(entry => Object.keys(entry)[0] === relativePath)) {
    permissions.push({ [relativePath]: groups });
  }
  await savePermissions(permissions);
};
