import fs from "fs/promises";
import path from "path";
import QRCode from "qrcode";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config();

const DATA_DIR = path.join(__dirname, "../../data");
const backendURL = process.env.BACKEND_URL;
const frontendURL = process.env.FRONTEND_URL;

const getAccessibleFiles = async (dirPath, userGroups, folderPermissions) => {
  const files = await fs.readdir(dirPath, { withFileTypes: true });
  const accessibleFiles = [];

  for (const file of files) {
    const filePath = path.join(dirPath, file.name);
    const isDirectory = file.isDirectory();
    const relativePath = path.relative(DATA_DIR, filePath).replace(/\\/g, "/");

    const filePermissions = folderPermissions[relativePath] || ["Default"];

    if (userHasAccess(userGroups, filePermissions)) {
      const url = filePath.replace(DATA_DIR, "/data");
      let qrCode = "";

      try {
        if (isDirectory) {
          const folderPath = url.replace("/data", "/files");
          qrCode = await QRCode.toDataURL(`${frontendURL}${folderPath}`);
        } else {
          qrCode = await QRCode.toDataURL(`${backendURL}${url}`);
        }
      } catch (qrError) {
        console.error("Error generating QR code:", qrError);
      }

      if (isDirectory) {
        const subFiles = await getAccessibleFiles(
          filePath,
          userGroups,
          folderPermissions
        );
        accessibleFiles.push({
          name: file.name,
          isDirectory: true,
          children: subFiles,
          qrCode,
        });
      } else {
        accessibleFiles.push({
          name: file.name,
          isDirectory: false,
          qrCode,
        });
      }
    }
  }

  return accessibleFiles;
};

const userHasAccess = (userGroups, allowedGroups) => {
  if (allowedGroups.includes("Default")) {
    return true;
  }
  if (userGroups.includes("Admin")) {
    return true;
  }
  return allowedGroups.some((group) => userGroups.includes(group));
};

export default getAccessibleFiles;
