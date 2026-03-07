import express from "express";
import {
  createServiceRequest,
  getServiceRequests,
  getServiceRequestById,
  updateServiceRequest,
  createFeedback,
  getFeedback,
  getFeedbackById,
  updateFeedback,
  getFeedbackStats,
  getServiceRequestStats,
} from "../Controllers/guestServicesController.js";
import { protect } from "../Middlewares/authMiddleware.js";
import { authorizeRoles } from "../Middlewares/roleMiddleware.js";

const guestServicesRoutes = express.Router();

/**
 * ==================== SERVICE REQUESTS ====================
 */

/**
 * Create service request
 * Access: All authenticated users
 */
guestServicesRoutes.post(
  "/service-request",
  protect,
  authorizeRoles("guest", "admin", "manager", "receptionist"),
  createServiceRequest
);

/**
 * Get service requests
 * Access: All authenticated users (guests see own, staff see all)
 */
guestServicesRoutes.get(
  "/service-request",
  protect,
  authorizeRoles("guest", "admin", "manager", "receptionist"),
  getServiceRequests
);

/**
 * Get service request by ID
 * Access: All authenticated users (guests see own, staff see all)
 */
guestServicesRoutes.get(
  "/service-request/:id",
  protect,
  authorizeRoles("guest", "admin", "manager", "receptionist"),
  getServiceRequestById
);

/**
 * Update service request
 * Access: Staff only
 */
guestServicesRoutes.put(
  "/service-request/:id",
  protect,
  authorizeRoles("admin", "manager", "receptionist"),
  updateServiceRequest
);

/**
 * Get service request statistics
 * Access: Staff only
 */
guestServicesRoutes.get(
  "/service-request/stats",
  protect,
  authorizeRoles("admin", "manager", "receptionist"),
  getServiceRequestStats
);

/**
 * ==================== FEEDBACK ====================
 */

/**
 * Create feedback
 * Access: All authenticated users
 */
guestServicesRoutes.post(
  "/feedback",
  protect,
  authorizeRoles("guest", "admin", "manager", "receptionist"),
  createFeedback
);

/**
 * Get feedback
 * Access: All authenticated users (guests see own, staff see all)
 */
guestServicesRoutes.get(
  "/feedback",
  protect,
  authorizeRoles("guest", "admin", "manager", "receptionist"),
  getFeedback
);

/**
 * Get feedback by ID
 * Access: All authenticated users (guests see own, staff see all)
 */
guestServicesRoutes.get(
  "/feedback/:id",
  protect,
  authorizeRoles("guest", "admin", "manager", "receptionist"),
  getFeedbackById
);

/**
 * Update feedback (add admin response)
 * Access: Staff only
 */
guestServicesRoutes.put(
  "/feedback/:id",
  protect,
  authorizeRoles("admin", "manager", "receptionist"),
  updateFeedback
);

/**
 * Get feedback statistics
 * Access: Staff only
 */
guestServicesRoutes.get(
  "/feedback/stats",
  protect,
  authorizeRoles("admin", "manager", "receptionist"),
  getFeedbackStats
);

export default guestServicesRoutes;
