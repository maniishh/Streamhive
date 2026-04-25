import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';


const app=express();

app.use(cors({
    origin:process.env.CORS_ORIGIN,
    credentials:true
}))
app.use(express.json({
    limit:"16kb"
}));// to parse json data from request body
app.use(express.urlencoded({extended:true,limit:"16kb"}))// to parse urlencoded data from request body
app.use(express.static('public'))// to serve static files from public folder
app.use(cookieParser())// to parse cookies from request headers

//routes
import userRouter from "./routes/user.routes.js";
app.use("/api/v1/users",userRouter)

import searchRouter from "./routes/search.routes.js";
app.use("/api/v1/search", searchRouter);

// ✅ FIX: Register all missing routers
import videoRouter from "./routes/video.routes.js";
app.use("/api/v1/videos", videoRouter);

import commentRouter from "./routes/comment.routes.js";
app.use("/api/v1/comments", commentRouter);

import likeRouter from "./routes/like.routes.js";
app.use("/api/v1/likes", likeRouter);

import playlistRouter from "./routes/playlist.routes.js";
app.use("/api/v1/playlists", playlistRouter);

import tweetRouter from "./routes/tweet.routes.js";
app.use("/api/v1/tweets", tweetRouter);

import subscriptionRouter from "./routes/subscription.routes.js";
app.use("/api/v1/subscriptions", subscriptionRouter);

import dashboardRouter from "./routes/dashboard.routes.js";
app.use("/api/v1/dashboard", dashboardRouter);

import healthcheckRouter from "./routes/healthcheck.routes.js";
app.use("/api/v1/healthcheck", healthcheckRouter);

export { app} 
