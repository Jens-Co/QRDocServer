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

const getFilesList = async (directory) => {
  try {
    const files = await fs.readdir(directory);

    const filteredFiles = files.filter((file) => file !== ".DS_Store");

    const fileList = await Promise.all(
      filteredFiles.map(async (file) => {
        const filePath = path.join(directory, file);
        const stat = await fs.lstat(filePath);
        const isDirectory = stat.isDirectory();
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

        return {
          name: file,
          isDirectory: isDirectory,
          url: url,
          qrCode: qrCode,
        };
      })
    );

    return fileList;
  } catch (err) {
    console.error("Error reading directory:", err);
    throw err;
  }
};


export default getFilesList;
