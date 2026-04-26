import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    const {page = 1, limit = 10} = req.query

    if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Valid video ID is required")
    }


    const commentsAggregate = Comment.aggregate([
        {
            $match: {
                video: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $project: {
                            fullName: 1,
                            username: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                owner: {
                    $first: "$owner"
                }
            }
        },
        {
            $sort: {
                createdAt: -1
            }
        }
    ])

    const options = {
        page: parseInt(page, 10),
        limit: parseInt(limit, 10)
    }

    const result = await Comment.aggregatePaginate(commentsAggregate, options)

    return res.status(200).json(
        new ApiResponse(200, result, "Comments fetched successfully")
    )
})

const addComment = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    const {content} = req.body
    const userId = req.user?._id

    if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Valid video ID is required")
    }

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(401, "User not authenticated")
    }

    if (!content || content.trim() === "") {
        throw new ApiError(400, "Comment content is required")
    }

    const comment = await Comment.create({
        content: content.trim(),
        video: new mongoose.Types.ObjectId(videoId),
        owner: new mongoose.Types.ObjectId(userId)
    })

    const createdComment = await Comment.findById(comment._id).populate(
        {
            path: "owner",
            select: "fullName username avatar"
        }
    )

    return res.status(201).json(
        new ApiResponse(201, createdComment, "Comment added successfully")
    )
})

const updateComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    const {content} = req.body
    const userId = req.user?._id

    if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
        throw new ApiError(400, "Valid comment ID is required")
    }

    if (!content || content.trim() === "") {
        throw new ApiError(400, "Comment content is required")
    }

    const comment = await Comment.findById(commentId)

    if (!comment) {
        throw new ApiError(404, "Comment not found")
    }

    if (comment.owner.toString() !== userId.toString()) {
        throw new ApiError(403, "You don't have permission to update this comment")
    }

    const updatedComment = await Comment.findByIdAndUpdate(
        commentId,
        {
            $set: {
                content: content.trim()
            }
        },
        {new: true}
    ).populate(
        {
            path: "owner",
            select: "fullName username avatar"
        }
    )

    return res.status(200).json(
        new ApiResponse(200, updatedComment, "Comment updated successfully")
    )
})

const deleteComment = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    const userId = req.user?._id

    if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
        throw new ApiError(400, "Valid comment ID is required")
    }

    const comment = await Comment.findById(commentId)

    if (!comment) {
        throw new ApiError(404, "Comment not found")
    }

    if (comment.owner.toString() !== userId.toString()) {
        throw new ApiError(403, "You don't have permission to delete this comment")
    }

    await Comment.findByIdAndDelete(commentId)

    return res.status(200).json(
        new ApiResponse(200, {}, "Comment deleted successfully")
    )
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
    deleteComment
}
