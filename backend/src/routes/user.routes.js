import {Router} from "express";
import { 
 logOutUser, registerUser, loginUser,refreshAccessToken,
 changeCurrentUserPassword,getCurrentUser,updateAccountDetails,updateUserAvatar,updateCoverImage,
 getUserChannelProfile,getWatchHistory 
        } from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js";
import { optionalVerifyJWT, verifyJWT } from "../middlewares/auth.middleware.js";


const router=Router();

router.route("/register").post(
    upload.fields([//to upload multiple files with different field names
       {
        name:"avatar",
        maxCount:1
       },
       {
        name:"coverImage",
        maxCount:1
       }
    ]),
    registerUser)

router.route("/login").post(loginUser)

//secured routes
router.route("/logout").post(verifyJWT,logOutUser)
router.route("/refresh-token").post(refreshAccessToken)
router.route("/change-password").post(verifyJWT,changeCurrentUserPassword)
router.route("/current-user").get(verifyJWT,getCurrentUser)
router.route("/update-account").patch(verifyJWT,updateAccountDetails)
router.route("/avatar").patch(verifyJWT, upload.single("avatar"), updateUserAvatar)
router.route("/cover-image").patch(verifyJWT, upload.single("coverImage"), updateCoverImage)
router.route("/c/:username").get(optionalVerifyJWT, getUserChannelProfile)
router.route("/history").get(verifyJWT, getWatchHistory)


export default router
