import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const {channelId} = req.params
    // TODO: toggle subscription
    const userId = req.user?._id

    if (!channelId || !mongoose.Types.ObjectId.isValid(channelId)) {
        throw new ApiError(400, "Valid channel ID is required")
    }

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(401, "User not authenticated")
    }

    if (userId.toString() === channelId.toString()) {
        throw new ApiError(400, "You cannot subscribe to your own channel")
    }

    const existingSubscription = await Subscription.findOne({
        subscriber: new mongoose.Types.ObjectId(userId),
        channel: new mongoose.Types.ObjectId(channelId)
    })

    if (existingSubscription) {
        await Subscription.findByIdAndDelete(existingSubscription._id)
        return res.status(200).json(
            new ApiResponse(200, {isSubscribed: false}, "Unsubscribed successfully")
        )
    } else {
        const subscription = await Subscription.create({
            subscriber: new mongoose.Types.ObjectId(userId),
            channel: new mongoose.Types.ObjectId(channelId)
        })
        return res.status(201).json(
            new ApiResponse(201, {isSubscribed: true}, "Subscribed successfully")
        )
    }
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const {channelId} = req.params

    if (!channelId || !mongoose.Types.ObjectId.isValid(channelId)) {
        throw new ApiError(400, "Valid channel ID is required")
    }

    const subscribers = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(channelId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriber",
                pipeline: [
                    {
                        $project: {
                            fullname: 1,
                            username: 1,
                            avatar: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                subscriber: {$first: "$subscriber"}
            }
        },
        {
            $project: {
                subscriber: 1,
                createdAt: 1
            }
        }
    ])

    return res.status(200).json(
        new ApiResponse(200, subscribers, "Channel subscribers fetched successfully")
    )
})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params

    if (!subscriberId || !mongoose.Types.ObjectId.isValid(subscriberId)) {
        throw new ApiError(400, "Valid subscriber ID is required")
    }

    const subscribedChannels = await Subscription.aggregate([
        {
            $match: {
                subscriber: new mongoose.Types.ObjectId(subscriberId)
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "channel",
                foreignField: "_id",
                as: "channel",
                pipeline: [
                    {
                        $project: {
                            fullname: 1,
                            username: 1,
                            avatar: 1,
                            email: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                channel: {$first: "$channel"}
            }
        },
        {
            $project: {
                channel: 1,
                createdAt: 1
            }
        }
    ])

    return res.status(200).json(
        new ApiResponse(200, subscribedChannels, "Subscribed channels fetched successfully")
    )
})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}
