import express from "express";
import {
  createMaintenanceRequest,
  getMaintenanceRequests,
  getMaintenanceRequestById,
  updateMaintenanceRequest,
  deleteMaintenanceRequest,
  updateMaintenanceStatus,
  assignMaintenanceStaff,
  getMaintenanceDashboard,
  getPendingMaintenanceRequests,
  getMaintenanceHistory,
  getMaintenanceStaffList,
} from "../Controllers/maintenanceController.js";
import { protect } from "../Middlewares/authMiddleware.js";
import { authorizeRoles } from "../Middlewares/roleMiddleware.js";

const maintenanceRoutes = express.Router();

/**
 * Create a new maintenance request
 * Access: All authenticated users
 */
maintenanceRoutes.post(
  "/create",
  protect,
  authorizeRoles("guest", "admin", "manager", "receptionist", "housekeeping", "maintenance"),
  createMaintenanceRequest
);

/**
 * Get all maintenance requests (filtered by role)
 * Access: All authenticated users
 */
maintenanceRoutes.get(
  "/",
  protect,
  authorizeRoles("guest", "admin", "manager", "receptionist", "housekeeping", "maintenance"),
  getMaintenanceRequests
);

/**
 * Get maintenance request by ID
 * Access: All authenticated users (own requests or staff)
 */
maintenanceRoutes.get(
  "/:id",
  protect,
  authorizeRoles("guest", "admin", "manager", "receptionist", "housekeeping", "maintenance"),
  getMaintenanceRequestById
);

/**
 * Update maintenance request
 * Access: Staff or request reporter (if pending/in-progress)
 */
maintenanceRoutes.put(
  "/:id",
  protect,
  authorizeRoles("guest", "admin", "manager", "receptionist", "housekeeping", "maintenance"),
  updateMaintenanceRequest
);

/**
 * Delete maintenance request
 * Access: Admin or request reporter (if pending/cancelled)
 */
maintenanceRoutes.delete(
  "/:id",
  protect,
  authorizeRoles("guest", "admin", "manager", "receptionist", "housekeeping", "maintenance"),
  deleteMaintenanceRequest
);

/**
 * Update maintenance request status
 * Access: Staff only
 */
maintenanceRoutes.patch(
  "/:id/status",
  protect,
  authorizeRoles("admin", "manager", "receptionist", "housekeeping", "maintenance"),
  updateMaintenanceStatus
);

/**
 * Assign staff to maintenance request
 * Access: Staff only
 */
maintenanceRoutes.patch(
  "/:id/assign",
  protect,
  authorizeRoles("admin", "manager", "receptionist", "housekeeping", "maintenance"),
  assignMaintenanceStaff
);

/**
 * Get maintenance dashboard statistics
 * Access: Staff only
 */
maintenanceRoutes.get(
  "/dashboard/stats",
  protect,
  authorizeRoles("admin", "manager", "receptionist", "housekeeping", "maintenance"),
  getMaintenanceDashboard
);

/**
 * Get pending/in-progress requests for status update
 * Access: Staff only
 */
maintenanceRoutes.get(
  "/pending/status-update",
  protect,
  authorizeRoles("admin", "manager", "receptionist", "housekeeping", "maintenance"),
  getPendingMaintenanceRequests
);

/**
 * Get maintenance history (completed/cancelled)
 * Access: All authenticated users
 */
maintenanceRoutes.get(
  "/history",
  protect,
  authorizeRoles("guest", "admin", "manager", "receptionist", "housekeeping", "maintenance"),
  getMaintenanceHistory
);

/**
 * Get staff list for assignment
 * Access: Staff only
 */
maintenanceRoutes.get(
  "/staff-list",
  protect,
  authorizeRoles("admin", "manager", "receptionist", "housekeeping", "maintenance"),
  getMaintenanceStaffList
);

export default maintenanceRoutes;
