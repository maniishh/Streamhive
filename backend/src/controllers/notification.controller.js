import { Notification } from "../models/notification.model.js";
import { ApiError }      from "../utils/ApiError.js";
import { ApiResponse }   from "../utils/ApiResponse.js";
import { asyncHandler }  from "../utils/asyncHandler.js";


const getNotifications = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  const notifications = await Notification.find({ recipient: userId })
    .populate({ path: "sender", select: "fullname username avatar" })
    .sort({ createdAt: -1 })
    .limit(30)
    .lean();

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return res.status(200).json(
    new ApiResponse(200, { notifications, unreadCount }, "Notifications fetched")
  );
});


const markAsRead = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const notification = await Notification.findOneAndUpdate(
    { _id: id, recipient: req.user._id },
    { isRead: true },
    { new: true }
  );
  if (!notification) throw new ApiError(404, "Notification not found");
  return res.status(200).json(new ApiResponse(200, notification, "Marked as read"));
});

// PATCH /api/v1/notifications/read-all  — mark all as read
const markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ recipient: req.user._id, isRead: false }, { isRead: true });
  return res.status(200).json(new ApiResponse(200, {}, "All notifications marked as read"));
});

// DELETE /api/v1/notifications/:id
const deleteNotification = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const notification = await Notification.findOneAndDelete({ _id: id, recipient: req.user._id });
  if (!notification) throw new ApiError(404, "Notification not found");
  return res.status(200).json(new ApiResponse(200, {}, "Notification deleted"));
});

export { getNotifications, markAsRead, markAllRead, deleteNotification };
