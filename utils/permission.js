import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../../data');
const PERMISSIONS_FILE_PATH = path.join(__dirname, 'folderPermissions.json');
  
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


export const loadFolderPermissions = async () => {
    try {
        let data = await fs.readFile(PERMISSIONS_FILE_PATH, 'utf8');
        let folderPermissions = JSON.parse(data);
        
        if (typeof folderPermissions !== 'object') {
            throw new Error('Permissions file should be an object');
        }
        
        return folderPermissions;
    } catch (err) {
        console.error("Error loading permissions:", err);
        return {};
    }
};

export const savePermissions = async (permissions) => {
    console.log('Saving Permissions:', permissions);
    await fs.writeFile(PERMISSIONS_FILE_PATH, JSON.stringify(permissions, null, 2));
};

export const updatePermissionsForNewFolder = async (folderPath, groups = ["Default"]) => {
    const absoluteFolderPath = path.resolve(DATA_DIR, folderPath);
    let relativeFolderPath = path.relative(DATA_DIR, absoluteFolderPath).replace(/\\/g, '/');

    if (relativeFolderPath.startsWith('..')) {
        console.error('Relative path calculated incorrectly:', relativeFolderPath);
        return;
    }

    if (relativeFolderPath.startsWith('/')) {
        relativeFolderPath = relativeFolderPath.substring(1);
    }

    const permissions = await loadFolderPermissions();

    if (!permissions[relativeFolderPath]) {
        permissions[relativeFolderPath] = [...new Set(["Default", ...groups])];
    } else {
        permissions[relativeFolderPath] = [...new Set([...permissions[relativeFolderPath], ...groups])];
    }

    await savePermissions(permissions);
};

