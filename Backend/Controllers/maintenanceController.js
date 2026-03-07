import MaintenanceRequest from "../Models/maintenanceModel.js";
import User from "../Models/userModel.js";
import { deleteFromCloudinary } from "../config/uploadCloudinary.js";

const ensureAuth = (req, res) => {
  if (!req.user || !req.user._id) {
    res.status(401).json({ message: "Unauthorized" });
    return false;
  }
  return true;
};

const isStaff = (role) =>
  ["admin", "manager", "receptionist", "housekeeping", "maintenance"].includes(
    String(role || "").toLowerCase()
  );

const canAccessRequest = (reqUser, request) => {
  const role = String(reqUser?.role || "").toLowerCase();
  if (isStaff(role)) return true;
  if (role === "guest" && String(request.reportedBy) === String(reqUser._id))
    return true;
  return false;
};

// Create maintenance request
export const createMaintenanceRequest = async (req, res) => {
  try {
    if (!ensureAuth(req, res)) return;

    const { title, description, location, category, priority, notes } = req.body;

    if (!title || !description || !location || !category) {
      return res
        .status(400)
        .json({ message: "Title, description, location, and category are required" });
    }

    const validCategories = ["Electrical", "Plumbing", "HVAC", "Carpentry", "Appliances", "Other"];
    if (!validCategories.includes(category)) {
      return res.status(400).json({ message: "Invalid category" });
    }

    const validPriorities = ["Low", "Medium", "High"];
    if (priority && !validPriorities.includes(priority)) {
      return res.status(400).json({ message: "Invalid priority" });
    }

    const user = req.user;

    const request = await MaintenanceRequest.create({
      title: title.trim(),
      description: description.trim(),
      location: location.trim(),
      category,
      priority: priority || "Medium",
      status: "pending",
      reportedBy: user._id,
      reporterSnapshot: {
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        role: user.role || "",
      },
      notes: notes?.trim() || "",
    });

    const populatedRequest = await MaintenanceRequest.findById(request._id)
      .populate("reportedBy", "name email phone role")
      .lean();

    return res.status(201).json({
      message: "Maintenance request created successfully",
      request: populatedRequest,
    });
  } catch (error) {
    console.error("createMaintenanceRequest error:", error);
    return res.status(500).json({
      message: "Failed to create maintenance request",
      error: error.message,
    });
  }
};

// Get all maintenance requests (staff) or user's requests (guest)
export const getMaintenanceRequests = async (req, res) => {
  try {
    if (!ensureAuth(req, res)) return;

    const role = String(req.user.role || "").toLowerCase();
    const { status, priority, category, q, page = 1, limit = 10 } = req.query;

    const filter = {};

    // Guests can only see their own requests
    if (role === "guest") {
      filter.reportedBy = req.user._id;
    }

    // Apply filters
    if (status && status !== "all") {
      filter.status = status;
    }

    if (priority && priority !== "all") {
      filter.priority = priority;
    }

    if (category && category !== "all") {
      filter.category = category;
    }

    // Search query
    if (q) {
      const query = String(q).trim();
      filter.$or = [
        { title: { $regex: query, $options: "i" } },
        { location: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
        { requestNumber: { $regex: query, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const requests = await MaintenanceRequest.find(filter)
      .populate("reportedBy", "name email phone role")
      .populate("assignedTo", "name email role")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await MaintenanceRequest.countDocuments(filter);

    return res.json({
      count: requests.length,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      requests,
    });
  } catch (error) {
    console.error("getMaintenanceRequests error:", error);
    return res.status(500).json({
      message: "Failed to fetch maintenance requests",
      error: error.message,
    });
  }
};

// Get maintenance request by ID
export const getMaintenanceRequestById = async (req, res) => {
  try {
    if (!ensureAuth(req, res)) return;

    const { id } = req.params;

    const request = await MaintenanceRequest.findById(id)
      .populate("reportedBy", "name email phone role")
      .populate("assignedTo", "name email role")
      .lean();

    if (!request) {
      return res.status(404).json({ message: "Maintenance request not found" });
    }

    if (!canAccessRequest(req.user, request)) {
      return res.status(403).json({ message: "Access denied" });
    }

    return res.json({ request });
  } catch (error) {
    console.error("getMaintenanceRequestById error:", error);
    return res.status(500).json({
      message: "Failed to fetch maintenance request",
      error: error.message,
    });
  }
};

// Update maintenance request
export const updateMaintenanceRequest = async (req, res) => {
  try {
    if (!ensureAuth(req, res)) return;

    const { id } = req.params;
    const { title, description, location, category, priority, notes } = req.body;

    const request = await MaintenanceRequest.findById(id);

    if (!request) {
      return res.status(404).json({ message: "Maintenance request not found" });
    }

    // Only allow updates if pending or in-progress
    if (["completed", "cancelled"].includes(request.status)) {
      return res
        .status(400)
        .json({ message: `Cannot update. Current status: ${request.status}` });
    }

    // Guests can only update their own requests
    if (req.user.role === "guest" && String(request.reportedBy) !== String(req.user._id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Staff can update any request
    if (!isStaff(req.user.role) && req.user.role !== "guest") {
      return res.status(403).json({ message: "Access denied" });
    }

    if (title) request.title = title.trim();
    if (description) request.description = description.trim();
    if (location) request.location = location.trim();
    if (category) {
      const validCategories = ["Electrical", "Plumbing", "HVAC", "Carpentry", "Appliances", "Other"];
      if (!validCategories.includes(category)) {
        return res.status(400).json({ message: "Invalid category" });
      }
      request.category = category;
    }
    if (priority) {
      const validPriorities = ["Low", "Medium", "High"];
      if (!validPriorities.includes(priority)) {
        return res.status(400).json({ message: "Invalid priority" });
      }
      request.priority = priority;
    }
    if (notes !== undefined) request.notes = notes.trim();

    await request.save();

    const updatedRequest = await MaintenanceRequest.findById(request._id)
      .populate("reportedBy", "name email phone role")
      .populate("assignedTo", "name email role")
      .lean();

    return res.json({
      message: "Maintenance request updated successfully",
      request: updatedRequest,
    });
  } catch (error) {
    console.error("updateMaintenanceRequest error:", error);
    return res.status(500).json({
      message: "Failed to update maintenance request",
      error: error.message,
    });
  }
};

// Delete maintenance request
export const deleteMaintenanceRequest = async (req, res) => {
  try {
    if (!ensureAuth(req, res)) return;

    const { id } = req.params;

    const request = await MaintenanceRequest.findById(id);

    if (!request) {
      return res.status(404).json({ message: "Maintenance request not found" });
    }

    // Only admin or the reporter can delete
    if (req.user.role !== "admin" && String(request.reportedBy) !== String(req.user._id)) {
      return res.status(403).json({ message: "Access denied" });
    }

    // Only delete if pending or cancelled
    if (["in-progress", "completed"].includes(request.status)) {
      return res
        .status(400)
        .json({ message: `Cannot delete. Current status: ${request.status}` });
    }

    // Delete images from Cloudinary
    if (request.images?.length > 0) {
      await Promise.all(
        request.images.map(async (img) => {
          if (img.public_id) await deleteFromCloudinary(img.public_id);
        })
      );
    }

    await request.deleteOne();

    return res.json({ message: "Maintenance request deleted successfully" });
  } catch (error) {
    console.error("deleteMaintenanceRequest error:", error);
    return res.status(500).json({
      message: "Failed to delete maintenance request",
      error: error.message,
    });
  }
};

// Update maintenance request status
export const updateMaintenanceStatus = async (req, res) => {
  try {
    if (!ensureAuth(req, res)) return;

    const { id } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const validStatuses = ["pending", "in-progress", "completed", "cancelled"];
    if (!validStatuses.includes(status.toLowerCase())) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const request = await MaintenanceRequest.findById(id);

    if (!request) {
      return res.status(404).json({ message: "Maintenance request not found" });
    }

    // Only staff can update status
    if (!isStaff(req.user.role)) {
      return res.status(403).json({ message: "Access denied. Staff only." });
    }

    // Cannot change status of completed/cancelled requests
    if (["completed", "cancelled"].includes(request.status)) {
      return res
        .status(400)
        .json({ message: `Cannot update. Current status: ${request.status}` });
    }

    request.status = status.toLowerCase();

    if (notes) {
      request.notes = notes.trim();
    }

    // Track who completed/cancelled
    if (status === "completed") {
      request.completedBy = req.user._id;
    } else if (status === "cancelled") {
      request.cancelledBy = req.user._id;
    }

    await request.save();

    const updatedRequest = await MaintenanceRequest.findById(request._id)
      .populate("reportedBy", "name email phone role")
      .populate("assignedTo", "name email role")
      .lean();

    return res.json({
      message: "Maintenance status updated successfully",
      request: updatedRequest,
    });
  } catch (error) {
    console.error("updateMaintenanceStatus error:", error);
    return res.status(500).json({
      message: "Failed to update maintenance status",
      error: error.message,
    });
  }
};

// Assign staff to maintenance request
export const assignMaintenanceStaff = async (req, res) => {
  try {
    if (!ensureAuth(req, res)) return;

    const { id } = req.params;
    const { assignedTo } = req.body;

    if (!assignedTo) {
      return res.status(400).json({ message: "assignedTo (staff ID) is required" });
    }

    const request = await MaintenanceRequest.findById(id);

    if (!request) {
      return res.status(404).json({ message: "Maintenance request not found" });
    }

    // Only staff can assign
    if (!isStaff(req.user.role)) {
      return res.status(403).json({ message: "Access denied. Staff only." });
    }

    // Verify the assigned user exists and is staff
    const staff = await User.findById(assignedTo);
    if (!staff) {
      return res.status(404).json({ message: "Staff not found" });
    }

    if (!isStaff(staff.role)) {
      return res.status(400).json({ message: "Can only assign to staff members" });
    }

    request.assignedTo = assignedTo;
    request.assignedBy = req.user._id;
    request.assignedAt = new Date();
    request.assigneeSnapshot = {
      name: staff.name || "",
      role: staff.role || "",
    };

    // Auto-update status to in-progress if pending
    if (request.status === "pending") {
      request.status = "in-progress";
    }

    await request.save();

    const updatedRequest = await MaintenanceRequest.findById(request._id)
      .populate("reportedBy", "name email phone role")
      .populate("assignedTo", "name email role")
      .lean();

    return res.json({
      message: "Staff assigned successfully",
      request: updatedRequest,
    });
  } catch (error) {
    console.error("assignMaintenanceStaff error:", error);
    return res.status(500).json({
      message: "Failed to assign staff",
      error: error.message,
    });
  }
};

// Get dashboard statistics for maintenance
export const getMaintenanceDashboard = async (req, res) => {
  try {
    if (!ensureAuth(req, res)) return;

    const role = String(req.user.role || "").toLowerCase();
    if (!isStaff(role)) {
      return res.status(403).json({ message: "Access denied. Staff only." });
    }

    const total = await MaintenanceRequest.countDocuments();
    const pending = await MaintenanceRequest.countDocuments({ status: "pending" });
    const inProgress = await MaintenanceRequest.countDocuments({ status: "in-progress" });
    const completed = await MaintenanceRequest.countDocuments({ status: "completed" });
    const cancelled = await MaintenanceRequest.countDocuments({ status: "cancelled" });

    // Recent requests
    const recentRequests = await MaintenanceRequest.find()
      .populate("reportedBy", "name email")
      .populate("assignedTo", "name role")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    // Priority breakdown
    const highPriority = await MaintenanceRequest.countDocuments({
      priority: "High",
      status: { $in: ["pending", "in-progress"] },
    });
    const mediumPriority = await MaintenanceRequest.countDocuments({
      priority: "Medium",
      status: { $in: ["pending", "in-progress"] },
    });
    const lowPriority = await MaintenanceRequest.countDocuments({
      priority: "Low",
      status: { $in: ["pending", "in-progress"] },
    });

    // Category breakdown
    const categoryStats = await MaintenanceRequest.aggregate([
      {
        $match: {
          status: { $in: ["pending", "in-progress"] },
        },
      },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
    ]);

    return res.json({
      statistics: {
        total,
        pending,
        inProgress,
        completed,
        cancelled,
      },
      priorityBreakdown: {
        high: highPriority,
        medium: mediumPriority,
        low: lowPriority,
      },
      categoryStats,
      recentRequests,
    });
  } catch (error) {
    console.error("getMaintenanceDashboard error:", error);
    return res.status(500).json({
      message: "Failed to fetch maintenance dashboard",
      error: error.message,
    });
  }
};

// Get pending requests for assignment (for UpdateStatus page)
export const getPendingMaintenanceRequests = async (req, res) => {
  try {
    if (!ensureAuth(req, res)) return;

    const role = String(req.user.role || "").toLowerCase();
    if (!isStaff(role)) {
      return res.status(403).json({ message: "Access denied. Staff only." });
    }

    const requests = await MaintenanceRequest.find({
      status: { $in: ["pending", "in-progress"] },
    })
      .populate("reportedBy", "name email phone")
      .populate("assignedTo", "name email role")
      .sort({ priority: -1, createdAt: -1 })
      .lean();

    return res.json({
      count: requests.length,
      requests,
    });
  } catch (error) {
    console.error("getPendingMaintenanceRequests error:", error);
    return res.status(500).json({
      message: "Failed to fetch pending maintenance requests",
      error: error.message,
    });
  }
};

// Get maintenance history (completed/cancelled)
export const getMaintenanceHistory = async (req, res) => {
  try {
    if (!ensureAuth(req, res)) return;

    const role = String(req.user.role || "").toLowerCase();
    const { status, priority, category, q, page = 1, limit = 10 } = req.query;

    const filter = {
      status: { $in: ["completed", "cancelled"] },
    };

    // Guests can only see their own history
    if (role === "guest") {
      filter.reportedBy = req.user._id;
    }

    if (status && status !== "all") {
      filter.status = status;
    }

    if (priority && priority !== "all") {
      filter.priority = priority;
    }

    if (category && category !== "all") {
      filter.category = category;
    }

    if (q) {
      const query = String(q).trim();
      filter.$or = [
        { title: { $regex: query, $options: "i" } },
        { location: { $regex: query, $options: "i" } },
        { requestNumber: { $regex: query, $options: "i" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);

    const history = await MaintenanceRequest.find(filter)
      .populate("reportedBy", "name email phone role")
      .populate("assignedTo", "name email role")
      .sort({ completedAt: -1, updatedAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await MaintenanceRequest.countDocuments(filter);

    return res.json({
      count: history.length,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / Number(limit)),
      history,
    });
  } catch (error) {
    console.error("getMaintenanceHistory error:", error);
    return res.status(500).json({
      message: "Failed to fetch maintenance history",
      error: error.message,
    });
  }
};

// Get staff list for assignment (reusable from auth or here)
export const getMaintenanceStaffList = async (req, res) => {
  try {
    if (!ensureAuth(req, res)) return;

    const role = String(req.user.role || "").toLowerCase();
    if (!isStaff(role)) {
      return res.status(403).json({ message: "Access denied. Staff only." });
    }

    const staff = await User.find({
      role: { $in: ["admin", "manager", "maintenance", "housekeeping"] },
      isActive: true,
    })
      .select("name email role phone department")
      .sort({ name: 1 })
      .lean();

    return res.json({
      count: staff.length,
      staff,
    });
  } catch (error) {
    console.error("getMaintenanceStaffList error:", error);
    return res.status(500).json({
      message: "Failed to fetch staff list",
      error: error.message,
    });
  }
};
