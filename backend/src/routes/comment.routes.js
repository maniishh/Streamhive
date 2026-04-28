import { Router } from 'express';
import {
    addComment,
    addReply,
    deleteComment,
    getVideoComments,
    getReplies,
    updateComment,
} from "../controllers/comment.controller.js"
import {verifyJWT} from "../middlewares/auth.middleware.js"

const router = Router();

// ── Public routes (no auth required) ────────────────────────────────────────
router.route("/:videoId").get(getVideoComments);
router.route("/replies/:commentId").get(getReplies);

// ── Protected routes (auth required) ────────────────────────────────────────
router.use(verifyJWT);

router.route("/:videoId").post(addComment);
router.route("/c/:commentId").delete(deleteComment).patch(updateComment);
router.route("/replies/:commentId").post(addReply);

export default router
