import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    //TODO: create tweet
    const {content} = req.body
    const userId = req.user?._id

    if (!content || content.trim() === "") {
        throw new ApiError(400, "Tweet content is required")
    }

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(401, "User not authenticated")
    }

    const tweet = await Tweet.create({
        content: content.trim(),
        owner: new mongoose.Types.ObjectId(userId)
    })

    const createdTweet = await Tweet.findById(tweet._id).populate({
        path: "owner",
        select: "fullname username avatar"
    })

    return res.status(201).json(
        new ApiResponse(201, createdTweet, "Tweet created successfully")
    )
})

const getUserTweets = asyncHandler(async (req, res) => {
    // TODO: get user tweets
    const {userId} = req.params

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Valid user ID is required")
    }

    const tweets = await Tweet.find({
        owner: new mongoose.Types.ObjectId(userId)
    }).populate({
        path: "owner",
        select: "fullname username avatar"
    }).sort({createdAt: -1})

    return res.status(200).json(
        new ApiResponse(200, tweets, "User tweets fetched successfully")
    )
})

const updateTweet = asyncHandler(async (req, res) => {
    //TODO: update tweet
    const {tweetId} = req.params
    const {content} = req.body
    const userId = req.user?._id

    if (!tweetId || !mongoose.Types.ObjectId.isValid(tweetId)) {
        throw new ApiError(400, "Valid tweet ID is required")
    }

    if (!content || content.trim() === "") {
        throw new ApiError(400, "Tweet content is required")
    }

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(401, "User not authenticated")
    }

    const tweet = await Tweet.findById(tweetId)

    if (!tweet) {
        throw new ApiError(404, "Tweet not found")
    }

    if (tweet.owner.toString() !== userId.toString()) {
        throw new ApiError(403, "You don't have permission to update this tweet")
    }

    const updatedTweet = await Tweet.findByIdAndUpdate(
        tweetId,
        {$set: {content: content.trim()}},
        {new: true}
    ).populate({
        path: "owner",
        select: "fullname username avatar"
    })

    return res.status(200).json(
        new ApiResponse(200, updatedTweet, "Tweet updated successfully")
    )
})

const deleteTweet = asyncHandler(async (req, res) => {
    //TODO: delete tweet
    const {tweetId} = req.params
    const userId = req.user?._id

    if (!tweetId || !mongoose.Types.ObjectId.isValid(tweetId)) {
        throw new ApiError(400, "Valid tweet ID is required")
    }

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(401, "User not authenticated")
    }

    const tweet = await Tweet.findById(tweetId)

    if (!tweet) {
        throw new ApiError(404, "Tweet not found")
    }

    if (tweet.owner.toString() !== userId.toString()) {
        throw new ApiError(403, "You don't have permission to delete this tweet")
    }

    await Tweet.findByIdAndDelete(tweetId)

    return res.status(200).json(
        new ApiResponse(200, {}, "Tweet deleted successfully")
    )
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}
