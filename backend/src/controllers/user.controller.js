import mongoose from "mongoose";import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User}  from "../models/user.model.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";

const generateAcessTokenAndRefreshToken=async(userId)=>{
    try{
        const user=await User.findById(userId)
        const accessToken=user.generateAccessToken();
        const refreshToken=user.generateRefreshToken();
        user.refreshToken=refreshToken;
        await user.save({validateBeforeSave:false});
        return {accessToken,refreshToken}
    }catch(error){
        throw new ApiError(500,"Error generating tokens")
    }
}

const registerUser =asyncHandler(async(req,res)=>{
    //get user data from frontend
    //validation -not empty
    //chack if user already exists:username or email
    //chack for images ,check for avatar
    //upload them to cloudinary,avatar
    //create user object -create entry in db
    //remove password and refresh token field from response
    //check for user creation 
    //return response 
    const {fullName,email,username,password} = req.body;
    console.log("body:",req.body);
    
   if(//validation
    [fullName,email,username,password].some((field)=>field?.trim()==="")
    )  {
    throw new ApiError(400,"All fields are required")
    }
    const existedUser = await User.findOne({
        $or:[
            {email},
            {username}
        ]
    })
    if(existedUser){
        throw new ApiError(409,"User already exists with this email or username")
    }
    //console.log(req.files);
    const avatarLocalPath = req.files?.avatar?.[0]?.path;//multer saves the uploaded file in req.files object,avatar is the field name we used in multer middleware,0 is the index of the file in case of multiple files with same field name,path is the local path of the uploaded file
    //const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
    let coverImageLocalPath;
    if(req.files && Array){
        coverImageLocalPath = req.files.coverImage[0].path;
    }

        if(!avatarLocalPath){
            throw new ApiError(400,"Avatar is required")//if avatar is not uploaded,throw an error with status code 400 and message "Avatar is required"
        }
        // if(!coverImageLocalPath){
        //     throw new ApiError(400,"Cover image is required")
        // }
     
        const avatar = await uploadOnCloudinary(avatarLocalPath,"avatars")//uploadOnCloudinary is a utility function that uploads the file at the given local path to cloudinary and returns the url of the uploaded file,avatars is the folder name in cloudinary where the file will be stored
        const coverImage = await uploadOnCloudinary(coverImageLocalPath,"coverImages")
        if(!avatar || !coverImage){//if the upload fails,throw an error with status code 500 and message "Error uploading images"
            throw new ApiError(500,"Error uploading images")
        }
     
    const user = await User.create({
        fullname:fullName,
        avatar:avatar.url,
        coverImage:coverImage.url,
        email:email,
        username:username.toLowerCase(),
        password:password
    })
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if(!createdUser){
        throw new ApiError(500,"Error creating user")
    }
    return res.status(201).json(
        new ApiResponse(201, createdUser, "User registered successfully")
    );
})
const loginUser=asyncHandler(async(req,res)=>{
    //req  body -email,username,password
    //find user by email or username
    //password comparison
    //generate refresh token and access token
    //send cookies and response

    const {email,username,password}= req.body;
     if(!username && !email){
        throw new ApiError(400,"Email or username is required")
     }

     const user=await User.findOne({
        $or:[
            {email},
            {username}]
     })
if(!user){  
  throw new ApiError(404,"User not found with this email or username")
}
const isPasswordValid=await user.isPasswordCorrect(password)
if(!isPasswordValid){
    throw new ApiError(401,"Invalid password")  }

const {accessToken,refreshToken}=await generateAcessTokenAndRefreshToken(user._id)
const loggedInUser=await User.findById(user._id).select("-password -refreshToken")

const options={
    httpOnly:true,
    secure:true,
     sameSite: "None"
}
return res.status(200)
.cookie("refreshToken",refreshToken,options)
.cookie("accessToken",accessToken,options)
.json(new ApiResponse(200,
    {
       user: loggedInUser,
        accessToken,
        refreshToken
    },
    "User logged in successfully"
)
)

})
const logOutUser=asyncHandler(async(req,res)=>{
    //get user id from req.user
    //find user in db and remove refresh token
    //clear cookies and send response
    User.findByIdAndUpdate(req.user._id,
        {
            $unset:{
                refreshToken:1//1 means delete the refreshToken field from the user document    
        }
    },
    {
        new:true
    }
    )
    const options={
    httpOnly:true,
    secure:true,
   sameSite: "None"
}
return res.status(200)
.clearCookie("refreshToken",options)
.clearCookie("accessToken",options)
.json(new ApiResponse(200,{},"User logged out successfully")) 
     })

const refreshAccessToken=asyncHandler(async(req,res)=>{  
   //get refresh token from cookies
   const incomingRefreshToken=req.cookies.refreshToken || req.body.refreshToken
   if(!incomingRefreshToken){
    throw new ApiError(401,"Refresh token is missing")
   }
    //verify refresh token
  try {
     const decodedToken=jwt.verify(incomingRefreshToken,
          process.env.REFRESH_TOKEN_SECRET
      )
     const user= await User.findById(decodedToken?._id)
     if(!user){
      throw new ApiError(401,"Invalid refresh token")
     }
     if(user.refreshToken !== incomingRefreshToken){
      throw new ApiError(401,"Refresh token is expired")  
     }
     const options={
      httpOnly:true,
      secure:true,
    sameSite: "None"
     }
     
     const {accessToken,refreshToken:newrefreshToken}=await generateAcessTokenAndRefreshToken(user._id)
  
     return res
     .status(200)
     .cookie("accessToken",accessToken,options)
     .cookie("refreshToken",newrefreshToken,options)
     .json(
      new ApiResponse(200,
          {accessToken,
          refreshToken:newrefreshToken
      },
      "Access token refreshed successfully"
          
     )
  )
  } catch (error) {
    throw new ApiError(401,error?.message || "Invalid refresh token")
  }
})
 const changeCurrentUserPassword=asyncHandler(async(req,res)=>{
//get user id from req.user
//get current password and new password from req.body
//find user in db
//compare current password
//if valid,update with new password
//send response
const {oldPassword,newPassword}=req.body;
const user =await User.findOne(req.user?._id)
const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
if(!isPasswordCorrect){
    throw new ApiError(401,"old password is incorrect")
}
user.password=newPassword;
await user.save({validateBeforeSave:true}); 
return res.status(200).json(new ApiResponse(200,{},"Password changed successfully"))    

 })
const getCurrentUser=asyncHandler(async(req,res)=>{
    return res.
    status(200).
    json(new ApiResponse(200,req.user,"Current user fetched successfully"))
})
const updateAccountDetails=asyncHandler(async(req,res)=>{
    //get user id from req.user
    //get updated details from req.body and files from req.files
    //find user in db and update details
    //send response
    const {fullName,email}=req.body;

    if([fullName,email].some((field)=>field?.trim()==="")){
        throw new ApiError(400,"Full name and email cannot be empty")
    }

    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                fullName,
                email:email
            }
        },
        {new:true}
    ).select("-password");

    return res.status(200).json(new ApiResponse(200,user,"Account details updated successfully"))

})
 
const updateUserAvatar=asyncHandler(async(req,res)=>{
     //get user id from req.user
     //get avatar from req.files
     //upload avatar to cloudinary
    const avatarLocalPath=req.file?.path
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar image is required")
    }
    //
    const avatar=await uploadOnCloudinary(avatarLocalPath,"avatars")
    if(!avatar.url){
        throw new ApiError(500,"Error uploading avatar")
    }
    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar:avatar.url
            }
        },
        {new:true}
    ).select("-password");

    return res.status(200).json(new ApiResponse(200,user,"Avatar updated successfully"))

})

const updateCoverImage=asyncHandler(async(req,res)=>{
     //get user id from req.user
     //get cover image from req.files
     //upload cover image to cloudinary
    const coverImageLocalPath=req.file?.path
    if(!coverImageLocalPath){
        throw new ApiError(400,"Cover image is required")
    }
    const coverImage=await uploadOnCloudinary(coverImageLocalPath)
    if(!coverImage.url){
        throw new ApiError(500,"Error uploading cover image")
    }
    const user=await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage:coverImage.url
            }
        },
        {new:true}
    ).select("-password");

    return res.
    status(200).
    json(new ApiResponse(200,user,"Cover image updated successfully"))

})

const getUserChannelProfile=asyncHandler(async(req,res)=>{
    //get user id from req.params
    //find user in db and populate subscriber count and isSubscribed
    //send response
    const {username}=req.params;
    if(!username){
        throw new ApiError(400,"Username is required")
    }
     const channel=await User.aggregate([
        {
            $match:{
                username:username?.toLowerCase()
            }
        },
        { 
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"channel",
                as:"subscribers"
                
            }
        },
        {
            $lookup:{
                from:"subscriptions",
                localField:"_id",
                foreignField:"subscriber",
                as:"subscribedTo"
                
        }
    },
    {
        $addFields:{
            subscriberCount:{
                $size:"$subscribers"
            },
            channelSubscribedToCount:{
                $size:"$subscribedTo"
            }      ,
            isSubscribed:{
                $cond:{
                    if:{
                        $in:[req.user?._id,"$subscribers.subscriber"]
                    },
                    then:true,
                    else:false
                    }
                }
            }
},
{
    $project:{
        fullName:1,
        username:1,
        avatar:1,
        subscriberCount:1,
        channelSubscribedToCount:1,
        isSubscribed:1,
        coverImage:1,
        email:1
    }
}
    
     ])
     if(!channel || channel.length===0){
        throw new ApiError(404,"Channel not found")
     }
    return res
    .status(200)
    .json(new ApiResponse(200,channel[0],"Channel profile fetched successfully"))

})

const getWatchHistory=asyncHandler(async(req,res)=>{
    const user=await User.aggregate([
        {
            $match:{
                _id:new mongoose.Types.ObjectId(req.user._id)
            }
        },
        {
            $lookup:{
                from:"videos",
                localField:"watchHistory",
                foreignField:"_id",
                as:"watchHistory",
                pipeline:[
                    {
                        $lookup:{
                            from:"users",
                            localField:"owner",
                            foreignField:"_id",
                            as:"owner",
                            pipeline:[{
                                $project:{
                                    fullName:1,
                                    username:1,
                                    avatar:1
                                }
                            }]
                        }
                    },
                    {
                        $addFields:{
                            owner:{ $first:"$owner" }
                        }
                    }
                ]
            }
        },
    ])
    return res
    .status(200)
    .json(new ApiResponse(200,user[0]?.watchHistory || [],"Watch history fetched successfully"))
})
export {
    registerUser,
    loginUser,
    logOutUser,
    refreshAccessToken,
    changeCurrentUserPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateCoverImage,
    getUserChannelProfile,
    getWatchHistory
}

