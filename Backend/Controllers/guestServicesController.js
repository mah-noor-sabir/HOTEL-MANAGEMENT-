import ServiceRequest from "../Models/serviceRequestModel.js";
import Feedback from "../Models/feedbackModel.js";
import User from "../Models/userModel.js";

const ensureAuth = (req, res) => {
  if (!req.user || !req.user._id) {
    res.status(401).json({ message: "Unauthorized" });
    return false;
  }
  return true;
};

const isStaff = (role) =>
  ["admin", "manager", "receptionist"].includes(
    String(role || "").toLowerCase()
  );

// ==================== SERVICE REQUESTS ====================

// Create service request
export const createServiceRequest = async (req, res) => {
  try {
    if (!ensureAuth(req, res)) return;

    const { serviceType, description, priority, roomNumber } = req.body;

    if (!serviceType || !description || !roomNumber) {
      return res
        .status(400)
        .json({ message: "Service type, description, and room number are required" });
    }

    const validTypes = ["Housekeeping", "Room Service", "Maintenance", "Concierge", "Laundry", "Other"];
    if (!validTypes.includes(serviceType)) {
      return res.status(400).json({ message: "Invalid service type" });
    }

    const validPriorities = ["Low", "Normal", "High", "Urgent"];
    if (priority && !validPriorities.includes(priority)) {
      return res.status(400).json({ message: "Invalid priority" });
    }

    const user = req.user;

    const request = await ServiceRequest.create({
      guest: user._id,
      guestSnapshot: {
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
      },
      roomNumber: roomNumber.trim(),
      serviceType,
      description: description.trim(),
      priority: priority || "Normal",
      status: "Pending",
    });

    const populatedRequest = await ServiceRequest.findById(request._id)
      .populate("guest", "name email phone")
      .lean();

    return res.status(201).json({
      message: "Service request submitted successfully",
      request: populatedRequest,
    });
  } catch (error) {
    console.error("createServiceRequest error:", error);
    return res.status(500).json({
      message: "Failed to create service request",
      error: error.message,
    });
  }
};

// Get service requests (guest sees own, staff sees all)
export const getServiceRequests = async (req, res) => {
  try {
    if (!ensureAuth(req, res)) return;

    const role = String(req.user.role || "").toLowerCase();
    const { status, serviceType, priority, page = 1, limit = 10 } = req.query;

    const filter = {};

    // Guests can only see their own requests
    if (role === "guest") {
      filter.guest = req.user._id;
    }

    if (status && status !== "all") {
      filter.status = status;
    }

    if (serviceType && serviceType !== "all") {
      filter.serviceType = serviceType;
    }

    if (priority && priority !== "all") {
      filter.priority = priority;
    }

    const requests = await ServiceRequest.find(filter)
      .populate("guest", "name email phone")
      .populate("assignedTo", "name email role")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error("getServiceRequests error:", error);
    return res.status(500).json({
      message: "Failed to fetch service requests",
      error: error.message,
    });
  }
};

// Get service request by ID
export const getServiceRequestById = async (req, res) => {
  try {
    if (!ensureAuth(req, res)) return;

    const { id } = req.params;

    const request = await ServiceRequest.findById(id)
      .populate("guest", "name email phone")
      .populate("assignedTo", "name email role")
      .lean();

    if (!request) {
      return res.status(404).json({ message: "Service request not found" });
    }

    // Guests can only view their own requests
    if (req.user.role === "guest" && String(request.guest) !== String(req.user._id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    return res.json({ request });
  } catch (error) {
    console.error("getServiceRequestById error:", error);
    return res.status(500).json({
      message: "Failed to fetch service request",
      error: error.message,
    });
  }
};

// Update service request (staff only)
export const updateServiceRequest = async (req, res) => {
  try {
    if (!ensureAuth(req, res)) return;

    const role = String(req.user.role || "").toLowerCase();
    if (!isStaff(role)) {
      return res.status(403).json({ message: "Access denied. Staff only." });
    }

    const { id } = req.params;
    const { status, assignedTo, response } = req.body;

    const request = await ServiceRequest.findById(id);

    if (!request) {
      return res.status(404).json({ message: "Service request not found" });
    }

    if (status) {
      const validStatuses = ["Pending", "In Progress", "Completed", "Cancelled"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      request.status = status;
    }

    if (assignedTo) {
      const staff = await User.findById(assignedTo);
      if (!staff || !isStaff(staff.role)) {
        return res.status(400).json({ message: "Invalid staff assignment" });
      }
      request.assignedTo = assignedTo;
      request.assignedAt = new Date();
    }

    if (response !== undefined) {
      request.response = response.trim();
      request.responseBy = req.user._id;
      request.responseAt = new Date();
    }

    await request.save();

    const updatedRequest = await ServiceRequest.findById(request._id)
      .populate("guest", "name email phone")
      .populate("assignedTo", "name email role")
      .lean();

    return res.json({
      message: "Service request updated successfully",
      request: updatedRequest,
    });
  } catch (error) {
    console.error("updateServiceRequest error:", error);
    return res.status(500).json({
      message: "Failed to update service request",
      error: error.message,
    });
  }
};

// ==================== FEEDBACK ====================

// Create feedback
export const createFeedback = async (req, res) => {
  try {
    if (!ensureAuth(req, res)) return;

    const { guestName, guestEmail, roomNumber, rating, category, title, comments } = req.body;

    if (!guestName || !guestEmail || !title || !comments || !rating) {
      return res
        .status(400)
        .json({ message: "Name, email, title, comments, and rating are required" });
    }

    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }

    const validCategories = ["Service", "Cleanliness", "Facilities", "Staff", "Food", "Other"];
    if (category && !validCategories.includes(category)) {
      return res.status(400).json({ message: "Invalid category" });
    }

    const user = req.user;

    const feedback = await Feedback.create({
      guest: user._id,
      guestName: guestName.trim(),
      guestEmail: guestEmail.toLowerCase().trim(),
      roomNumber: roomNumber?.trim() || "",
      rating: Number(rating),
      category: category || "Service",
      title: title.trim(),
      comments: comments.trim(),
      status: "New",
    });

    const populatedFeedback = await Feedback.findById(feedback._id)
      .populate("guest", "name email")
      .lean();

    return res.status(201).json({
      message: "Feedback submitted successfully",
      feedback: populatedFeedback,
    });
  } catch (error) {
    console.error("createFeedback error:", error);
    return res.status(500).json({
      message: "Failed to create feedback",
      error: error.message,
    });
  }
};

// Get feedback (guest sees own, staff sees all)
export const getFeedback = async (req, res) => {
  try {
    if (!ensureAuth(req, res)) return;

    const role = String(req.user.role || "").toLowerCase();
    const { rating, category, status, page = 1, limit = 10 } = req.query;

    const filter = {};

    // Guests can only see their own feedback
    if (role === "guest") {
      filter.guest = req.user._id;
    }

    if (rating && rating !== "all") {
      filter.rating = Number(rating);
    }

    if (category && category !== "all") {
      filter.category = category;
    }

    if (status && status !== "all") {
      filter.status = status;
    }

    const feedback = await Feedback.find(filter)
      .populate("guest", "name email")
      .sort({ createdAt: -1 })
      .lean();

    return res.json({
      count: feedback.length,
      feedback,
    });
  } catch (error) {
    console.error("getFeedback error:", error);
    return res.status(500).json({
      message: "Failed to fetch feedback",
      error: error.message,
    });
  }
};

// Get feedback by ID
export const getFeedbackById = async (req, res) => {
  try {
    if (!ensureAuth(req, res)) return;

    const { id } = req.params;

    const feedback = await Feedback.findById(id)
      .populate("guest", "name email")
      .lean();

    if (!feedback) {
      return res.status(404).json({ message: "Feedback not found" });
    }

    // Guests can only view their own feedback
    if (req.user.role === "guest" && String(feedback.guest) !== String(req.user._id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    return res.json({ feedback });
  } catch (error) {
    console.error("getFeedbackById error:", error);
    return res.status(500).json({
      message: "Failed to fetch feedback",
      error: error.message,
    });
  }
};

// Update feedback (staff only - add response)
export const updateFeedback = async (req, res) => {
  try {
    if (!ensureAuth(req, res)) return;

    const role = String(req.user.role || "").toLowerCase();
    if (!isStaff(role)) {
      return res.status(403).json({ message: "Access denied. Staff only." });
    }

    const { id } = req.params;
    const { status, adminResponse, isPublic } = req.body;

    const feedback = await Feedback.findById(id);

    if (!feedback) {
      return res.status(404).json({ message: "Feedback not found" });
    }

    if (status) {
      const validStatuses = ["New", "Acknowledged", "In Review", "Resolved"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      feedback.status = status;
    }

    if (adminResponse !== undefined) {
      feedback.adminResponse = adminResponse.trim();
      feedback.respondedBy = req.user._id;
      feedback.respondedAt = new Date();
    }

    if (isPublic !== undefined) {
      feedback.isPublic = isPublic;
    }

    await feedback.save();

    const updatedFeedback = await Feedback.findById(feedback._id)
      .populate("guest", "name email")
      .lean();

    return res.json({
      message: "Feedback updated successfully",
      feedback: updatedFeedback,
    });
  } catch (error) {
    console.error("updateFeedback error:", error);
    return res.status(500).json({
      message: "Failed to update feedback",
      error: error.message,
    });
  }
};

// Get feedback statistics
export const getFeedbackStats = async (req, res) => {
  try {
    if (!ensureAuth(req, res)) return;

    const role = String(req.user.role || "").toLowerCase();
    if (!isStaff(role)) {
      return res.status(403).json({ message: "Access denied. Staff only." });
    }

    const total = await Feedback.countDocuments();
    const averageRating = await Feedback.aggregate([
      { $group: { _id: null, avgRating: { $avg: "$rating" } } },
    ]);

    const byCategory = await Feedback.aggregate([
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
          avgRating: { $avg: "$rating" },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const byRating = await Feedback.aggregate([
      {
        $group: {
          _id: "$rating",
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: -1 } },
    ]);

    const recentFeedback = await Feedback.find()
      .populate("guest", "name email")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    return res.json({
      statistics: {
        total,
        averageRating: averageRating[0]?.avgRating?.toFixed(1) || 0,
        byCategory,
        byRating,
      },
      recentFeedback,
    });
  } catch (error) {
    console.error("getFeedbackStats error:", error);
    return res.status(500).json({
      message: "Failed to fetch feedback statistics",
      error: error.message,
    });
  }
};

// Get service request dashboard stats
export const getServiceRequestStats = async (req, res) => {
  try {
    if (!ensureAuth(req, res)) return;

    const role = String(req.user.role || "").toLowerCase();
    if (!isStaff(role)) {
      return res.status(403).json({ message: "Access denied. Staff only." });
    }

    const total = await ServiceRequest.countDocuments();
    const pending = await ServiceRequest.countDocuments({ status: "Pending" });
    const inProgress = await ServiceRequest.countDocuments({ status: "In Progress" });
    const completed = await ServiceRequest.countDocuments({ status: "Completed" });

    const byType = await ServiceRequest.aggregate([
      {
        $group: {
          _id: "$serviceType",
          count: { $sum: 1 },
          pending: {
            $sum: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] },
          },
        },
      },
      { $sort: { count: -1 } },
    ]);

    const recentRequests = await ServiceRequest.find()
      .populate("guest", "name email")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    return res.json({
      statistics: {
        total,
        pending,
        inProgress,
        completed,
        byType,
      },
      recentRequests,
    });
  } catch (error) {
    console.error("getServiceRequestStats error:", error);
    return res.status(500).json({
      message: "Failed to fetch service request statistics",
      error: error.message,
    });
  }
};
