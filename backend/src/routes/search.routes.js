
// ─────────────────────────────────────────────────────────────────────────────
// Search Routes – no auth required (search is public)
//
// Mount in app.js:
//   import searchRouter from "./routes/search.routes.js";
//   app.use("/api/v1/search", searchRouter);
// ─────────────────────────────────────────────────────────────────────────────

import { Router } from "express";
import { globalSearch, suggest } from "../controllers/search.controller.js";

const router = Router();

// GET /api/v1/search?q=<query>&limit=<n>
// Full categorised search across videos, channels, and users
router.get("/", globalSearch);

// GET /api/v1/search/suggest?q=<query>&limit=<n>
// Lightweight autocomplete suggestions (faster, fewer fields)
router.get("/suggest", suggest);

export default router;
