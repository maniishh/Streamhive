import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const createPlaylist = asyncHandler(async (req, res) => {
    const {name, description} = req.body
    const userId = req.user?._id

    //TODO: create playlist
    if (!name || !description) {
        throw new ApiError(400, "Playlist name and description are required")
    }

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(401, "User not authenticated")
    }

    const playlist = await Playlist.create({
        name: name.trim(),
        description: description.trim(),
        createdBy: new mongoose.Types.ObjectId(userId)
    })

    return res.status(201).json(
        new ApiResponse(201, playlist, "Playlist created successfully")
    )
})

const getUserPlaylists = asyncHandler(async (req, res) => {
    const {userId} = req.params
    //TODO: get user playlists
    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(400, "Valid user ID is required")
    }

    const playlists = await Playlist.find({
        createdBy: new mongoose.Types.ObjectId(userId)
    }).populate({
        path: "videos",
        select: "_id title thumbnail duration"
    })

    return res.status(200).json(
        new ApiResponse(200, playlists, "User playlists fetched successfully")
    )
})

const getPlaylistById = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    //TODO: get playlist by id
    if (!playlistId || !mongoose.Types.ObjectId.isValid(playlistId)) {
        throw new ApiError(400, "Valid playlist ID is required")
    }

    const playlist = await Playlist.findById(playlistId)
        .populate({
            path: "videos",
            select: "_id title description thumbnail duration views owner"
        })
        .populate({
            path: "createdBy",
            select: "_id fullname username avatar"
        })

    if (!playlist) {
        throw new ApiError(404, "Playlist not found")
    }

    return res.status(200).json(
        new ApiResponse(200, playlist, "Playlist fetched successfully")
    )
})

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    const userId = req.user?._id

    if (!playlistId || !mongoose.Types.ObjectId.isValid(playlistId)) {
        throw new ApiError(400, "Valid playlist ID is required")
    }

    if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Valid video ID is required")
    }

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(401, "User not authenticated")
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new ApiError(404, "Playlist not found")
    }

    if (playlist.createdBy.toString() !== userId.toString()) {
        throw new ApiError(403, "You don't have permission to update this playlist")
    }

    if (playlist.videos.includes(new mongoose.Types.ObjectId(videoId))) {
        throw new ApiError(400, "Video already exists in playlist")
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $addToSet: {
                videos: new mongoose.Types.ObjectId(videoId)
            }
        },
        {new: true}
    )

    return res.status(200).json(
        new ApiResponse(200, updatedPlaylist, "Video added to playlist successfully")
    )
})

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const {playlistId, videoId} = req.params
    // TODO: remove video from playlist
    const userId = req.user?._id

    if (!playlistId || !mongoose.Types.ObjectId.isValid(playlistId)) {
        throw new ApiError(400, "Valid playlist ID is required")
    }

    if (!videoId || !mongoose.Types.ObjectId.isValid(videoId)) {
        throw new ApiError(400, "Valid video ID is required")
    }

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(401, "User not authenticated")
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new ApiError(404, "Playlist not found")
    }

    if (playlist.createdBy.toString() !== userId.toString()) {
        throw new ApiError(403, "You don't have permission to update this playlist")
    }

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $pull: {
                videos: new mongoose.Types.ObjectId(videoId)
            }
        },
        {new: true}
    )

    return res.status(200).json(
        new ApiResponse(200, updatedPlaylist, "Video removed from playlist successfully")
    )
})

const deletePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist
    const userId = req.user?._id

    if (!playlistId || !mongoose.Types.ObjectId.isValid(playlistId)) {
        throw new ApiError(400, "Valid playlist ID is required")
    }

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(401, "User not authenticated")
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new ApiError(404, "Playlist not found")
    }

    if (playlist.createdBy.toString() !== userId.toString()) {
        throw new ApiError(403, "You don't have permission to delete this playlist")
    }

    await Playlist.findByIdAndDelete(playlistId)

    return res.status(200).json(
        new ApiResponse(200, {}, "Playlist deleted successfully")
    )
})

const updatePlaylist = asyncHandler(async (req, res) => {
    const {playlistId} = req.params
    const {name, description} = req.body
    //TODO: update playlist
    const userId = req.user?._id

    if (!playlistId || !mongoose.Types.ObjectId.isValid(playlistId)) {
        throw new ApiError(400, "Valid playlist ID is required")
    }

    if (!userId || !mongoose.Types.ObjectId.isValid(userId)) {
        throw new ApiError(401, "User not authenticated")
    }

    const playlist = await Playlist.findById(playlistId)

    if (!playlist) {
        throw new ApiError(404, "Playlist not found")
    }

    if (playlist.createdBy.toString() !== userId.toString()) {
        throw new ApiError(403, "You don't have permission to update this playlist")
    }

    if (!name && !description) {
        throw new ApiError(400, "At least one field (name or description) is required to update")
    }

    const updateData = {}
    if (name) updateData.name = name.trim()
    if (description) updateData.description = description.trim()

    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {$set: updateData},
        {new: true}
    )

    return res.status(200).json(
        new ApiResponse(200, updatedPlaylist, "Playlist updated successfully")
    )
})

export {
    createPlaylist,
    getUserPlaylists,
    getPlaylistById,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    deletePlaylist,
    updatePlaylist
}
