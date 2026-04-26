import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const {videoId} = req.params
    const userId = req.user?._id

    if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Valid video ID is required")
    }

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(401, "User not authenticated")
    }

    const existingLike = await Like.findOne({
        video: new mongoose.Types.ObjectId(videoId),
        LikedBy: new mongoose.Types.ObjectId(userId)
    })

    if (existingLike) {
        await Like.findByIdAndDelete(existingLike._id)
        return res.status(200).json(
            new ApiResponse(200, {isLiked: false}, "Video like removed")
        )
    } else {
        await Like.create({
            video: new mongoose.Types.ObjectId(videoId),
            LikedBy: new mongoose.Types.ObjectId(userId)
        })
        return res.status(201).json(
            new ApiResponse(201, {isLiked: true}, "Video liked successfully")
        )
    }
})

const toggleCommentLike = asyncHandler(async (req, res) => {
    const {commentId} = req.params
    const userId = req.user?._id

    if (!commentId || !mongoose.Types.ObjectId.isValid(commentId)) {
        throw new ApiError(400, "Valid comment ID is required")
    }

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(401, "User not authenticated")
    }

    const existingLike = await Like.findOne({
        comment: new mongoose.Types.ObjectId(commentId),
        LikedBy: new mongoose.Types.ObjectId(userId)
    })

    if (existingLike) {
        await Like.findByIdAndDelete(existingLike._id)
        return res.status(200).json(
            new ApiResponse(200, {isLiked: false}, "Comment like removed")
        )
    } else {
        await Like.create({
            comment: new mongoose.Types.ObjectId(commentId),
            LikedBy: new mongoose.Types.ObjectId(userId)
        })
        return res.status(201).json(
            new ApiResponse(201, {isLiked: true}, "Comment liked successfully")
        )
    }
})

const toggleTweetLike = asyncHandler(async (req, res) => {
    const {tweetId} = req.params
    const userId = req.user?._id

    if (!tweetId || !mongoose.Types.ObjectId.isValid(tweetId)) {
        throw new ApiError(400, "Valid tweet ID is required")
    }

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(401, "User not authenticated")
    }

    const existingLike = await Like.findOne({
        tweet: new mongoose.Types.ObjectId(tweetId),
        LikedBy: new mongoose.Types.ObjectId(userId)
    })

    if (existingLike) {
        await Like.findByIdAndDelete(existingLike._id)
        return res.status(200).json(
            new ApiResponse(200, {isLiked: false}, "Tweet like removed")
        )
    } else {
        await Like.create({
            tweet: new mongoose.Types.ObjectId(tweetId),
            LikedBy: new mongoose.Types.ObjectId(userId)
        })
        return res.status(201).json(
            new ApiResponse(201, {isLiked: true}, "Tweet liked successfully")
        )
    }
})

const getLikedVideos = asyncHandler(async (req, res) => {
    const userId = req.user?._id

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(401, "User not authenticated")
    }

    const likedVideos = await Like.aggregate([
        {
            $match: {
                video: {$exists: true, $ne: null},
                LikedBy: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "video",
                pipeline: [
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
                            owner: {$first: "$owner"}
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                video: {$first: "$video"}
            }
        },
     
        {
            $match: {
                video: {$ne: null}
            }
        },
        {
            $project: {
                video: 1,
                createdAt: 1
            }
        },
        {
            $sort: {createdAt: -1}
        }
    ])

    return res.status(200).json(
        new ApiResponse(200, likedVideos, "Liked videos fetched successfully")
    )
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}
