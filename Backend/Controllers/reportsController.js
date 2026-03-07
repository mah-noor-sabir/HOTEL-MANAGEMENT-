import Reservation from "../Models/reservationModel.js";
import Room from "../Models/roomModel.js";
import User from "../Models/userModel.js";
import Invoice from "../Models/billingModel.js";
import ServiceRequest from "../Models/serviceRequestModel.js";
import Feedback from "../Models/feedbackModel.js";
import MaintenanceRequest from "../Models/maintenanceModel.js";
import CleaningTask from "../Models/housekeepingModel.js";

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

// Get dashboard overview statistics
export const getDashboardStats = async (req, res) => {
  try {
    if (!ensureAuth(req, res)) return;

    const role = String(req.user.role || "").toLowerCase();
    if (!isStaff(role)) {
      return res.status(403).json({ message: "Access denied. Staff only." });
    }

    const { period = "month" } = req.query;

    // Date range calculation
    const now = new Date();
    let startDate = new Date();

    if (period === "day") {
      startDate.setHours(0, 0, 0, 0);
    } else if (period === "week") {
      startDate.setDate(now.getDate() - 7);
    } else if (period === "month") {
      startDate.setMonth(now.getMonth() - 1);
    } else if (period === "year") {
      startDate.setFullYear(now.getFullYear() - 1);
    } else if (period === "all") {
      startDate = new Date(2000, 0, 1);
    }

    // Total guests
    const totalGuests = await User.countDocuments({ role: "guest" });

    // Occupied rooms
    const occupiedRooms = await Room.countDocuments({ status: "Occupied" });
    const totalRooms = await Room.countDocuments({ isActive: true });

    // Total reservations
    const totalReservations = await Reservation.countDocuments({
      createdAt: { $gte: startDate },
    });

    // Total revenue
    const revenueAgg = await Invoice.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $in: ["Paid", "PartiallyPaid"] },
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: "$paidAmount" },
        },
      },
    ]);

    const totalRevenue = revenueAgg[0]?.total || 0;

    // Recent activities
    const recentActivities = [];

    const recentReservations = await Reservation.find()
      .populate("guest", "name")
      .sort({ createdAt: -1 })
      .limit(2)
      .lean();

    const recentInvoices = await Invoice.find()
      .populate("guest", "name")
      .sort({ createdAt: -1 })
      .limit(2)
      .lean();

    recentReservations.forEach((r) => {
      recentActivities.push({
        _id: r._id,
        action: `New reservation created`,
        user: r.guest?.name || "Guest",
        time: r.createdAt,
        type: "reservation",
      });
    });

    recentInvoices.forEach((i) => {
      recentActivities.push({
        _id: i._id,
        action: `Payment of $${i.paidAmount} received`,
        user: i.guest?.name || "Guest",
        time: i.createdAt,
        type: "payment",
      });
    });

    recentActivities.sort((a, b) => new Date(b.time) - new Date(a.time));

    return res.json({
      overview: {
        totalGuests,
        occupiedRooms,
        totalRooms,
        occupancyRate: totalRooms > 0 ? ((occupiedRooms / totalRooms) * 100).toFixed(1) : 0,
        totalReservations,
        totalRevenue,
      },
      recentActivities: recentActivities.slice(0, 10),
    });
  } catch (error) {
    console.error("getDashboardStats error:", error);
    return res.status(500).json({
      message: "Failed to fetch dashboard statistics",
      error: error.message,
    });
  }
};

// Get occupancy data by month
export const getOccupancyData = async (req, res) => {
  try {
    if (!ensureAuth(req, res)) return;

    const role = String(req.user.role || "").toLowerCase();
    if (!isStaff(role)) {
      return res.status(403).json({ message: "Access denied. Staff only." });
    }

    const { months = 6 } = req.query;
    const now = new Date();
    const monthCount = parseInt(months) || 6;

    const occupancyData = [];

    for (let i = monthCount - 1; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const totalRooms = await Room.countDocuments({ isActive: true });

      const occupiedCount = await Room.countDocuments({
        status: { $in: ["Occupied", "Cleaning"] },
        isActive: true,
      });

      const occupancy = totalRooms > 0 ? ((occupiedCount / totalRooms) * 100).toFixed(0) : 0;

      occupancyData.push({
        month: monthDate.toLocaleString("default", { month: "short" }),
        occupancy: Number(occupancy),
        totalRooms,
        occupiedRooms: occupiedCount,
      });
    }

    return res.json({ occupancyData });
  } catch (error) {
    console.error("getOccupancyData error:", error);
    return res.status(500).json({
      message: "Failed to fetch occupancy data",
      error: error.message,
    });
  }
};

// Get revenue data by month
export const getRevenueData = async (req, res) => {
  try {
    if (!ensureAuth(req, res)) return;

    const role = String(req.user.role || "").toLowerCase();
    if (!isStaff(role)) {
      return res.status(403).json({ message: "Access denied. Staff only." });
    }

    const { months = 6 } = req.query;
    const now = new Date();
    const monthCount = parseInt(months) || 6;

    const revenueData = [];

    for (let i = monthCount - 1; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

      const revenue = await Invoice.aggregate([
        {
          $match: {
            createdAt: { $gte: monthDate, $lte: monthEnd },
            status: { $in: ["Paid", "PartiallyPaid"] },
          },
        },
        {
          $group: {
            _id: null,
            total: { $sum: "$paidAmount" },
          },
        },
      ]);

      revenueData.push({
        month: monthDate.toLocaleString("default", { month: "short" }),
        revenue: revenue[0]?.total || 0,
      });
    }

    return res.json({ revenueData });
  } catch (error) {
    console.error("getRevenueData error:", error);
    return res.status(500).json({
      message: "Failed to fetch revenue data",
      error: error.message,
    });
  }
};

// Get room type statistics
export const getRoomTypeStats = async (req, res) => {
  try {
    if (!ensureAuth(req, res)) return;

    const role = String(req.user.role || "").toLowerCase();
    if (!isStaff(role)) {
      return res.status(403).json({ message: "Access denied. Staff only." });
    }

    const roomTypeStats = await Room.aggregate([
      {
        $match: { isActive: true },
      },
      {
        $group: {
          _id: "$roomType",
          total: { $sum: 1 },
          occupied: {
            $sum: { $cond: [{ $eq: ["$status", "Occupied"] }, 1, 0] },
          },
          available: {
            $sum: { $cond: [{ $eq: ["$status", "Available"] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          type: "$_id",
          total: 1,
          booked: "$occupied",
          available: 1,
        },
      },
    ]);

    return res.json({ roomTypeStats });
  } catch (error) {
    console.error("getRoomTypeStats error:", error);
    return res.status(500).json({
      message: "Failed to fetch room type statistics",
      error: error.message,
    });
  }
};

// Get comprehensive analytics report
export const getAnalyticsReport = async (req, res) => {
  try {
    if (!ensureAuth(req, res)) return;

    const role = String(req.user.role || "").toLowerCase();
    if (!isStaff(role)) {
      return res.status(403).json({ message: "Access denied. Staff only." });
    }

    const { period = "month" } = req.query;

    const now = new Date();
    let startDate = new Date();

    if (period === "day") {
      startDate.setHours(0, 0, 0, 0);
    } else if (period === "week") {
      startDate.setDate(now.getDate() - 7);
    } else if (period === "month") {
      startDate.setMonth(now.getMonth() - 1);
    } else if (period === "year") {
      startDate.setFullYear(now.getFullYear() - 1);
    }

    // Reservation stats
    const reservationStats = await Reservation.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: "$bookingStatus",
          count: { $sum: 1 },
        },
      },
    ]);

    // Revenue stats
    const revenueStats = await Invoice.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: "$status",
          total: { $sum: "$paidAmount" },
          count: { $sum: 1 },
        },
      },
    ]);

    // Service requests stats
    const serviceRequestStats = await ServiceRequest.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Maintenance stats
    const maintenanceStats = await MaintenanceRequest.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // Feedback stats
    const feedbackStats = await Feedback.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: "$rating" },
          total: { $sum: 1 },
        },
      },
    ]);

    // Housekeeping stats
    const housekeepingStats = await CleaningTask.aggregate([
      { $match: { createdAt: { $gte: startDate } } },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    return res.json({
      analytics: {
        reservations: reservationStats,
        revenue: revenueStats,
        serviceRequests: serviceRequestStats,
        maintenance: maintenanceStats,
        feedback: feedbackStats[0] || { avgRating: 0, total: 0 },
        housekeeping: housekeepingStats,
      },
    });
  } catch (error) {
    console.error("getAnalyticsReport error:", error);
    return res.status(500).json({
      message: "Failed to fetch analytics report",
      error: error.message,
    });
  }
};

// Export data (CSV/Excel format)
export const exportData = async (req, res) => {
  try {
    if (!ensureAuth(req, res)) return;

    const role = String(req.user.role || "").toLowerCase();
    if (!isStaff(role)) {
      return res.status(403).json({ message: "Access denied. Staff only." });
    }

    const { type, period = "month" } = req.query;

    const now = new Date();
    let startDate = new Date();

    if (period === "month") {
      startDate.setMonth(now.getMonth() - 1);
    } else if (period === "year") {
      startDate.setFullYear(now.getFullYear() - 1);
    }

    let data = [];

    if (type === "reservations") {
      data = await Reservation.find({ createdAt: { $gte: startDate } })
        .populate("guest", "name email phone")
        .lean();
    } else if (type === "invoices") {
      data = await Invoice.find({ createdAt: { $gte: startDate } })
        .populate("guest", "name email")
        .lean();
    } else if (type === "guests") {
      data = await User.find({ role: "guest", isActive: true })
        .select("name email phone createdAt")
        .lean();
    } else {
      return res.status(400).json({ message: "Invalid export type" });
    }

    return res.json({
      message: `Exported ${data.length} records`,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error("exportData error:", error);
    return res.status(500).json({
      message: "Failed to export data",
      error: error.message,
    });
  }
};
