import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { getCache, setCache, invalidatePattern } from "../utils/redis.js"
import { incrementViewInRedis } from "../utils/viewCounter.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy = "createdAt", sortType = "desc", userId } = req.query
    
    // Deterministic Cache Key Generation
    const cacheKey = sortBy === "views"
        ? `sh:trending:page:${page}:limit:${limit}:query:${query || ''}:userId:${userId || ''}`
        : `sh:feed:page:${page}:limit:${limit}:query:${query || ''}:sortBy:${sortBy}:sortType:${sortType}:userId:${userId || ''}`;

    // Return cached data if present
    const cachedVideos = await getCache(cacheKey);
    if (cachedVideos) {
        return res.status(200).json(
            new ApiResponse(200, cachedVideos, "Videos fetched successfully")
        );
    }

    const matchStage = {}

    if (query) {
        matchStage.$or = [
            {title: {$regex: query, $options: "i"}},
            {description: {$regex: query, $options: "i"}}
        ]
    }

    if (userId && mongoose.Types.ObjectId.isValid(userId)) {
        matchStage.owner = new mongoose.Types.ObjectId(userId)
    }

    matchStage.isPublished = true

    const sortOrder = sortType === "asc" ? 1 : -1
    const sortObject = {}
    if (["title", "views", "duration", "createdAt"].includes(sortBy)) {
        sortObject[sortBy] = sortOrder
    } else {
        sortObject["createdAt"] = sortOrder
    }

    const videos = await Video.aggregate([
        {
            $match: matchStage
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
                owner: {$first: "$owner"}
            }
        },
        {
            $sort: sortObject
        },
        {
            $skip: (parseInt(page, 10) - 1) * parseInt(limit, 10)
        },
        {
            $limit: parseInt(limit, 10)
        }
    ])

    // Set cache (10 minutes for trending, 5 minutes for general feed)
    const ttl = sortBy === "views" ? 600 : 300;
    await setCache(cacheKey, videos, ttl);

    return res.status(200).json(
        new ApiResponse(200, videos, "Videos fetched successfully")
    )
})

const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description} = req.body
    // TODO: get video, upload to cloudinary, create video
    const userId = req.user?._id

    if (!title || !description) {
        throw new ApiError(400, "Title and description are required")
    }

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(401, "User not authenticated")
    }

    const videoLocalPath = req.files?.videoFile?.[0]?.path
    const thumbnailLocalPath = req.files?.thumbnail?.[0]?.path

    if (!videoLocalPath) {
        throw new ApiError(400, "Video file is required")
    }

    if (!thumbnailLocalPath) {
        throw new ApiError(400, "Thumbnail is required")
    }

    const videoFile = await uploadOnCloudinary(videoLocalPath, "videos")
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath, "thumbnails")

    if (!videoFile || !thumbnail) {
        throw new ApiError(500, "Error uploading video or thumbnail")
    }

    const video = await Video.create({
        title: title.trim(),
        description: description.trim(),
        videoFile: videoFile.url,
        thumbnail: thumbnail.url,
        duration: videoFile.duration || 0,
        owner: new mongoose.Types.ObjectId(userId),
        isPublished: true
    })

    const createdVideo = await Video.findById(video._id).populate({
        path: "owner",
        select: "fullName username avatar"
    })

    // Invalidate feeds and trending caches on new video upload
    await invalidatePattern("sh:feed:*");
    await invalidatePattern("sh:trending:*");

    return res.status(201).json(
        new ApiResponse(201, createdVideo, "Video published successfully")
    )
})

const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const userId = req.user?._id

    if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Valid video ID is required")
    }

    // ────────────────────────────────────────────────────────────────────────────
    // VIEW COUNTING: Optimized with Redis + Cron batch sync
    // ────────────────────────────────────────────────────────────────────────────
    // 1. Increment view count in Redis (fast, atomic, ~1ms)
    // 2. Cron job syncs accumulated views to MongoDB every 5 minutes
    // 3. Return current DB view count for consistency
    // ────────────────────────────────────────────────────────────────────────────
    
    // Async increment in Redis (don't wait for it - we want fast response)
    // Views will be synced to MongoDB by the cron job
    incrementViewInRedis(videoId).catch(err => {
        console.error(`[VideoController] Failed to increment view in Redis for ${videoId}:`, err.message)
        // Error logged but not thrown - view counting should not block video delivery
    })

    // Fetch video from database (returns current synced view count)
    const video = await Video.findById(videoId).populate({
        path: "owner",
        select: "fullName username avatar"
    })

    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    // Update user's watch history
    if (userId) {
        await User.findByIdAndUpdate(userId, {
            $pull: { watchHistory: new mongoose.Types.ObjectId(videoId) }
        })
        await User.findByIdAndUpdate(userId, {
            $push: { watchHistory: { $each: [new mongoose.Types.ObjectId(videoId)], $position: 0 } }
        })
    }

    return res.status(200).json(
        new ApiResponse(200, video, "Video fetched successfully")
    )
})

const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: update video details like title, description, thumbnail
    const {title, description} = req.body
    const userId = req.user?._id

    if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Valid video ID is required")
    }

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(401, "User not authenticated")
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    if (video.owner.toString() !== userId.toString()) {
        throw new ApiError(403, "You don't have permission to update this video")
    }

    const updateData = {}
    if (title) updateData.title = title.trim()
    if (description) updateData.description = description.trim()

    if (req.files?.thumbnail?.[0]?.path) {
        const thumbnailLocalPath = req.files.thumbnail[0].path
        const thumbnail = await uploadOnCloudinary(thumbnailLocalPath, "thumbnails")
        if (!thumbnail) {
            throw new ApiError(500, "Error uploading thumbnail")
        }
        updateData.thumbnail = thumbnail.url
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {$set: updateData},
        {new: true}
    ).populate({
        path: "owner",
        select: "fullName username avatar"
    })

    // Invalidate caches related to video feeds
    await invalidatePattern("sh:feed:*");
    await invalidatePattern("sh:trending:*");

    return res.status(200).json(
        new ApiResponse(200, updatedVideo, "Video updated successfully")
    )
})

const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    //TODO: delete video
    const userId = req.user?._id

    if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Valid video ID is required")
    }

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(401, "User not authenticated")
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    if (video.owner.toString() !== userId.toString()) {
        throw new ApiError(403, "You don't have permission to delete this video")
    }

    await Video.findByIdAndDelete(videoId)

    // Invalidate feeds and trending caches on video deletion
    await invalidatePattern("sh:feed:*");
    await invalidatePattern("sh:trending:*");

    return res.status(200).json(
        new ApiResponse(200, {}, "Video deleted successfully")
    )
})

const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params
    const userId = req.user?._id

    if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Valid video ID is required")
    }

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(401, "User not authenticated")
    }

    const video = await Video.findById(videoId)

    if (!video) {
        throw new ApiError(404, "Video not found")
    }

    if (video.owner.toString() !== userId.toString()) {
        throw new ApiError(403, "You don't have permission to update this video")
    }

    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                isPublished: !video.isPublished
            }
        },
        {new: true}
    )

    // Invalidate feeds and trending caches on publish status toggle
    await invalidatePattern("sh:feed:*");
    await invalidatePattern("sh:trending:*");

    return res.status(200).json(
        new ApiResponse(200, updatedVideo, "Video publish status toggled successfully")
    )
})

export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}
