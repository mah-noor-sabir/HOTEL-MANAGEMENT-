import express from "express";
import {
  getDashboardStats,
  getOccupancyData,
  getRevenueData,
  getRoomTypeStats,
  getAnalyticsReport,
  exportData,
} from "../Controllers/reportsController.js";
import { protect } from "../Middlewares/authMiddleware.js";
import { authorizeRoles } from "../Middlewares/roleMiddleware.js";

const reportsRoutes = express.Router();

/**
 * Get dashboard overview statistics
 * Access: Staff only
 */
reportsRoutes.get(
  "/dashboard",
  protect,
  authorizeRoles("admin", "manager", "receptionist"),
  getDashboardStats
);

/**
 * Get occupancy data by month
 * Access: Staff only
 */
reportsRoutes.get(
  "/occupancy",
  protect,
  authorizeRoles("admin", "manager", "receptionist"),
  getOccupancyData
);

/**
 * Get revenue data by month
 * Access: Staff only
 */
reportsRoutes.get(
  "/revenue",
  protect,
  authorizeRoles("admin", "manager", "receptionist"),
  getRevenueData
);

/**
 * Get room type statistics
 * Access: Staff only
 */
reportsRoutes.get(
  "/room-types",
  protect,
  authorizeRoles("admin", "manager", "receptionist"),
  getRoomTypeStats
);

/**
 * Get comprehensive analytics report
 * Access: Staff only
 */
reportsRoutes.get(
  "/analytics",
  protect,
  authorizeRoles("admin", "manager", "receptionist"),
  getAnalyticsReport
);

/**
 * Export data (CSV/Excel format)
 * Access: Staff only
 */
reportsRoutes.get(
  "/export",
  protect,
  authorizeRoles("admin", "manager", "receptionist"),
  exportData
);

export default reportsRoutes;
