import express from "express";
import {
  getChecklist,
  createChecklistItem,
  updateChecklistItem,
  deleteChecklistItem,
  getCleaningTasks,
  createCleaningTask,
  updateCleaningTask,
  deleteCleaningTask,
  assignCleaningTask,
  toggleAssignment,
  getCleaningReport,
  getRoomCleaningStatus,
  getMyAssignedTasks,
  updateTaskStatus,
  getHousekeepingDashboard,
} from "../Controllers/housekeepingController.js";
import { protect } from "../Middlewares/authMiddleware.js";
import { authorizeRoles } from "../Middlewares/roleMiddleware.js";

const housekeepingRoutes = express.Router();

/**
 * Get housekeeping dashboard statistics
 * Access: Staff only
 */
housekeepingRoutes.get(
  "/dashboard",
  protect,
  authorizeRoles("admin", "manager", "receptionist", "housekeeping"),
  getHousekeepingDashboard
);

/**
 * ==================== CHECKLIST ROUTES ====================
 */

/**
 * Get all checklist items
 * Access: Staff only
 */
housekeepingRoutes.get(
  "/checklist",
  protect,
  authorizeRoles("admin", "manager", "receptionist", "housekeeping"),
  getChecklist
);

/**
 * Create checklist item
 * Access: Admin, Manager only
 */
housekeepingRoutes.post(
  "/checklist",
  protect,
  authorizeRoles("admin", "manager"),
  createChecklistItem
);

/**
 * Update checklist item
 * Access: Admin, Manager only
 */
housekeepingRoutes.put(
  "/checklist/:id",
  protect,
  authorizeRoles("admin", "manager"),
  updateChecklistItem
);

/**
 * Delete checklist item
 * Access: Admin only
 */
housekeepingRoutes.delete(
  "/checklist/:id",
  protect,
  authorizeRoles("admin"),
  deleteChecklistItem
);

/**
 * ==================== CLEANING TASK ROUTES ====================
 */

/**
 * Get all cleaning tasks
 * Access: Staff only
 */
housekeepingRoutes.get(
  "/cleaning-tasks",
  protect,
  authorizeRoles("admin", "manager", "receptionist", "housekeeping"),
  getCleaningTasks
);

/**
 * Create cleaning task
 * Access: Staff only
 */
housekeepingRoutes.post(
  "/cleaning-tasks",
  protect,
  authorizeRoles("admin", "manager", "receptionist"),
  createCleaningTask
);

/**
 * Update cleaning task
 * Access: Staff only
 */
housekeepingRoutes.put(
  "/cleaning-tasks/:id",
  protect,
  authorizeRoles("admin", "manager", "receptionist", "housekeeping"),
  updateCleaningTask
);

/**
 * Delete cleaning task
 * Access: Staff only
 */
housekeepingRoutes.delete(
  "/cleaning-tasks/:id",
  protect,
  authorizeRoles("admin", "manager", "receptionist"),
  deleteCleaningTask
);

/**
 * Assign cleaning task to staff
 * Access: Staff only
 */
housekeepingRoutes.post(
  "/assign-task",
  protect,
  authorizeRoles("admin", "manager", "receptionist"),
  assignCleaningTask
);

/**
 * Toggle task assignment status
 * Access: Staff only
 */
housekeepingRoutes.patch(
  "/toggle-assignment/:id",
  protect,
  authorizeRoles("admin", "manager", "receptionist", "housekeeping"),
  toggleAssignment
);

/**
 * Get cleaning report (aggregated by employee)
 * Access: Staff only
 */
housekeepingRoutes.get(
  "/report",
  protect,
  authorizeRoles("admin", "manager", "receptionist"),
  getCleaningReport
);

/**
 * Get room cleaning status
 * Access: Staff only
 */
housekeepingRoutes.get(
  "/room-status",
  protect,
  authorizeRoles("admin", "manager", "receptionist", "housekeeping"),
  getRoomCleaningStatus
);

/**
 * Get assigned tasks (for housekeeping staff - their own tasks)
 * Access: All authenticated users (housekeeping sees own, staff sees all)
 */
housekeepingRoutes.get(
  "/my-tasks",
  protect,
  authorizeRoles("admin", "manager", "receptionist", "housekeeping"),
  getMyAssignedTasks
);

/**
 * Update task status
 * Access: Staff only
 */
housekeepingRoutes.patch(
  "/tasks/:id/status",
  protect,
  authorizeRoles("admin", "manager", "receptionist", "housekeeping"),
  updateTaskStatus
);

export default housekeepingRoutes;
