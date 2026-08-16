import mongoose from "mongoose"
import {Comment}      from "../models/comment.model.js"
import {Video}        from "../models/video.model.js"
import {Notification} from "../models/notification.model.js"
import {ApiError}     from "../utils/ApiError.js"
import {ApiResponse}  from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {notifyUser}   from "../utils/socket.js"


async function sendNotification({ recipient, sender, type, message, link }) {
  if (String(recipient) === String(sender)) return   // don't notify yourself
  const doc = await Notification.create({ recipient, sender, type, message, link })
  const populated = await Notification.findById(doc._id)
    .populate({ path: "sender", select: "fullname username avatar" })
    .lean()
  notifyUser(recipient, populated)
}

const getVideoComments = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Valid video ID is required")
    }

    const commentsAggregate = Comment.aggregate([
        { $match: { video: new mongoose.Types.ObjectId(videoId), parentComment: null } },
        {
            $lookup: {
                from: "users", localField: "owner", foreignField: "_id", as: "owner",
                pipeline: [{ $project: { fullname: 1, username: 1, avatar: 1 } }]
            }
        },
        { $addFields: { owner: { $first: "$owner" } } },
        {
            $lookup: {
                from: "comments", localField: "_id", foreignField: "parentComment", as: "_repliesList"
            }
        },
        { $addFields: { replyCount: { $size: "$_repliesList" } } },
        { $project: { _repliesList: 0 } },
        { $sort: { createdAt: -1 } }
    ])

    const options = { page: parseInt(page, 10), limit: parseInt(limit, 10) }
    const result = await Comment.aggregatePaginate(commentsAggregate, options)

    return res.status(200).json(new ApiResponse(200, result, "Comments fetched successfully"))
})

// ── Get replies for a comment ─────────────────────────────────────────────────
const getReplies = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
        throw new ApiError(400, "Valid comment ID is required")
    }

    const replies = await Comment.find({ parentComment: commentId })
        .populate({ path: "owner", select: "fullname username avatar" })
        .sort({ createdAt: 1 }).lean()

    return res.status(200).json(new ApiResponse(200, replies, "Replies fetched successfully"))
})

// ── Add a top-level comment ───────────────────────────────────────────────────
const addComment = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    const {content} = req.body
    const userId = req.user?._id

    if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) throw new ApiError(400, "Valid video ID is required")
    if (!userId)                                                 throw new ApiError(401, "User not authenticated")
    if (!content || content.trim() === "")                      throw new ApiError(400, "Comment content is required")

    const comment = await Comment.create({
        content: content.trim(),
        video: new mongoose.Types.ObjectId(videoId),
        owner: new mongoose.Types.ObjectId(userId),
        parentComment: null
    })

    const createdComment = await Comment.findById(comment._id)
        .populate({ path: "owner", select: "fullname username avatar" })

    // Notify video owner
    const video = await Video.findById(videoId).select("owner title")
    if (video?.owner) {
        await sendNotification({
            recipient: video.owner,
            sender:    userId,
            type:      "comment",
            message:   `commented on your video "${video.title}"`,
            link:      `/watch/${videoId}`
        })
    }

    return res.status(201).json(new ApiResponse(201, createdComment, "Comment added successfully"))
})

// ── Add a reply to a comment ──────────────────────────────────────────────────
const addReply = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    const {content}   = req.body
    const userId      = req.user?._id

    if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) throw new ApiError(400, "Valid comment ID is required")
    if (!userId)                                                     throw new ApiError(401, "User not authenticated")
    if (!content || content.trim() === "")                          throw new ApiError(400, "Reply content is required")

    const parentComment = await Comment.findById(commentId)
    if (!parentComment) throw new ApiError(404, "Comment not found")

    const reply = await Comment.create({
        content: content.trim(),
        video: parentComment.video,
        owner: new mongoose.Types.ObjectId(userId),
        parentComment: new mongoose.Types.ObjectId(commentId)
    })

    const createdReply = await Comment.findById(reply._id)
        .populate({ path: "owner", select: "fullname username avatar" })

    // Notify the comment author
    await sendNotification({
        recipient: parentComment.owner,
        sender:    userId,
        type:      "reply",
        message:   "replied to your comment",
        link:      `/watch/${parentComment.video}`
    })

    return res.status(201).json(new ApiResponse(201, createdReply, "Reply added successfully"))
})

// ── Update a comment ──────────────────────────────────────────────────────────
const updateComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    const {content}   = req.body
    const userId      = req.user?._id

    if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) throw new ApiError(400, "Valid comment ID is required")
    if (!content || content.trim() === "")                          throw new ApiError(400, "Comment content is required")

    const comment = await Comment.findById(commentId)
    if (!comment) throw new ApiError(404, "Comment not found")
    if (comment.owner.toString() !== userId.toString()) throw new ApiError(403, "No permission")

    const updatedComment = await Comment.findByIdAndUpdate(
        commentId, { $set: { content: content.trim() } }, { new: true }
    ).populate({ path: "owner", select: "fullname username avatar" })

    return res.status(200).json(new ApiResponse(200, updatedComment, "Comment updated successfully"))
})

// ── Delete a comment (cascades to replies) ────────────────────────────────────
const deleteComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    const userId      = req.user?._id

    if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) throw new ApiError(400, "Valid comment ID is required")

    const comment = await Comment.findById(commentId)
    if (!comment) throw new ApiError(404, "Comment not found")
    if (comment.owner.toString() !== userId.toString()) throw new ApiError(403, "No permission")

    await Comment.deleteMany({ $or: [{ _id: commentId }, { parentComment: commentId }] })

    return res.status(200).json(new ApiResponse(200, {}, "Comment deleted successfully"))
})

export { getVideoComments, getReplies, addComment, addReply, updateComment, deleteComment }
