import express from "express";
import session from "express-session";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import bcrypt from "bcrypt";
import { fileURLToPath } from "url";
import apiRouter from "./routes/api.js";
import adminRouter from "./routes/admin.js";
import { loadUsers, saveUsers } from "./utils/user.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "../data");

const backendURL = process.env.BACKEND_URL;
const frontendURL = process.env.FRONTEND_URL;

const createDefaultAdmin = async () => {
  const users = await loadUsers();
  const adminExists = users.find((user) => user.username === "admin");

  if (!adminExists) {
    const passwordHash = await bcrypt.hash("admin", 10);
    users.push({ username: "admin", passwordHash, role: "admin" });
    await saveUsers(users);
    console.log("Default admin user created: username=admin, password=admin");
  } else {
    console.log("Default admin user already exists.");
  }
};

app.use(
  cors({
    origin: [frontendURL, backendURL],
    credentials: true,
  })
);

app.set("trust proxy", 1);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    secret: process.env.SESSION_SECRET || "secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    },
  })
);

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  const users = await loadUsers();

  const user = users.find((u) => u.username === username);
  if (!user) {
    return res.status(401).json({ error: "Invalid username or password" });
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (isMatch) {
    req.session.authenticated = true;
    req.session.username = username;
    req.session.role = user.role;
    const redirectTo = req.session.redirectTo || "/files";
    delete req.session.redirectTo;
    res.json({ success: true, redirectTo });
  } else {
    res.status(401).json({ error: "Invalid username or password" });
  }
});

app.get("/check-auth", (req, res) => {
  res.json({
    authenticated: req.session.authenticated || false,
    isAdmin: req.session.role === "admin",
  });
});

const isAuthenticated = (req, res, next) => {
  if (req.session.authenticated) {
    return next();
  }
  if (req.hostname === backendURL) {
    req.session.redirectTo = backendURL + req.originalUrl;
    if (req.originalUrl.startsWith("/data")) {
      return res.redirect(`${frontendURL}/login`);
    }
  }

  return res.status(401).json({ error: "Not authenticated" });
};

app.use("/data", isAuthenticated, express.static(DATA_DIR));
app.use("/api", isAuthenticated, apiRouter);
app.use("/admin", isAuthenticated, adminRouter);

app.use((req, res, next) => {
  if (
    !req.originalUrl.startsWith("/api") &&
    !req.originalUrl.startsWith("/data") &&
    !req.originalUrl.startsWith("localhost")
  ) {
    res.sendFile(path.join(__dirname, "../frontend/build/index.html"));
  } else {
    next();
  }
});

app.listen(PORT, async () => {
  console.log(`Server is running on port: ${PORT}`);
  await createDefaultAdmin();
});
