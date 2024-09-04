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
    // Resolve the absolute path relative to DATA_DIR
    const absoluteFolderPath = path.resolve(DATA_DIR, folderPath);

    // Calculate the relative path from DATA_DIR to the target folder
    let relativeFolderPath = path.relative(DATA_DIR, absoluteFolderPath).replace(/\\/g, '/');

    // Ensure the relative path does not start with any invalid characters or go beyond the root
    if (relativeFolderPath.startsWith('..')) {
        // This indicates that the relative path calculation went wrong
        // You can either throw an error here or correct the path
        console.error('Relative path calculated incorrectly:', relativeFolderPath);
        return;
    }

    // If the path starts with a slash, remove it (since we're using relative paths)
    if (relativeFolderPath.startsWith('/')) {
        relativeFolderPath = relativeFolderPath.substring(1);
    }

    console.log('Absolute Path:', absoluteFolderPath);
    console.log('Relative Path:', relativeFolderPath);

    const permissions = await loadFolderPermissions();

    // Update permissions for the correct relative path
    if (!permissions[relativeFolderPath]) {
        permissions[relativeFolderPath] = groups;
    } else {
        // Merge the groups if permissions already exist
        permissions[relativeFolderPath] = [...new Set([...permissions[relativeFolderPath], ...groups])];
    }

    await savePermissions(permissions);
};

