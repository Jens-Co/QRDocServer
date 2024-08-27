import express from "express";
import session from "express-session";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import apiRouter from "./routes/api.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "../data");

const backendURL = process.env.BACKEND_URL;
const frontendURL = process.env.FRONTEND_URL;

app.set('trust proxy', 1);

app.use(cors({
  origin: [
    frontendURL, 
    backendURL
  ],
  credentials: true, 
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "your_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

const isAuthenticated = (req, res, next) => {
  if (req.session.authenticated) {
    return next();
  }
  if (req.hostname === "vpkbackend.collaert.net") { 
    req.session.redirectTo = backendURL + req.originalUrl;
    if (req.originalUrl.startsWith('/data')) {
      return res.redirect( `${frontendURL}/login` );
    }
  }

  return res.status(401).json({ error: "Not authenticated" });
};

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username === process.env.USERNAME && password === process.env.PASSWORD) {
    req.session.authenticated = true;
    const redirectTo = req.session.redirectTo || '/files';
    delete req.session.redirectTo; 
    res.json({ success: true, redirectTo });
  } else {
    res.json({ success: false });
  }
});

app.get("/check-auth", (req, res) => {
  res.json({ authenticated: req.session.authenticated || false });
});

app.use("/data", isAuthenticated, express.static(DATA_DIR));
app.use("/api", isAuthenticated, apiRouter);

app.use((req, res, next) => {
  if (!req.originalUrl.startsWith('/api') && !req.originalUrl.startsWith('/data')) {
    res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
  } else {
    next();
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port: ${PORT}`);
});
