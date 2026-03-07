import CleaningTask from "../Models/housekeepingModel.js";
import ChecklistItem from "../Models/checklistModel.js";
import Room from "../Models/roomModel.js";
import User from "../Models/userModel.js";

const ensureAuth = (req, res) => {
  if (!req.user || !req.user._id) {
    res.status(401).json({ message: "Unauthorized" });
    return false;
  }
  return true;
};

const isStaff = (role) =>
  ["admin", "manager", "receptionist", "housekeeping"].includes(
    String(role || "").toLowerCase()
  );

// ==================== CHECKLIST ENDPOINTS ====================

// Get all checklist items
export const getChecklist = async (req, res) => {
  try {
    if (!ensureAuth(req, res)) return;

    const { type, isActive } = req.query;
    const filter = {};

    if (type) filter.type = type;
    if (isActive !== undefined) filter.isActive = isActive === "true";

    const checklist = await ChecklistItem.find(filter)
      .sort({ order: 1, createdAt: -1 })
      .lean();

    return res.json({
      count: checklist.length,
      checklist,
    });
  } catch (error) {
    console.error("getChecklist error:", error);
    return res.status(500).json({
      message: "Failed to fetch checklist",
      error: error.message,
    });
  }
};

// Create checklist item
export const createChecklistItem = async (req, res) => {
  try {
    if (!ensureAuth(req, res)) return;

    const { checkPoint, type, description, order } = req.body;

    if (!checkPoint) {
      return res.status(400).json({ message: "Check point is required" });
    }

    const validTypes = ["House Keeper", "Laundry"];
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({ message: "Invalid type" });
    }

    const item = await ChecklistItem.create({
      checkPoint: checkPoint.trim(),
      type: type || "House Keeper",
      description: description?.trim() || "",
      order: order || 0,
      isActive: true,
      createdBy: req.user._id,
    });

    return res.status(201).json({
      message: "Checklist item created successfully",
      item,
    });
  } catch (error) {
    console.error("createChecklistItem error:", error);
    return res.status(500).json({
      message: "Failed to create checklist item",
      error: error.message,
    });
  }
};

// Update checklist item
export const updateChecklistItem = async (req, res) => {
  try {
    if (!ensureAuth(req, res)) return;

    const { id } = req.params;
    const { checkPoint, type, description, order, isActive } = req.body;

    const item = await ChecklistItem.findById(id);

    if (!item) {
      return res.status(404).json({ message: "Checklist item not found" });
    }

    if (checkPoint) item.checkPoint = checkPoint.trim();
    if (type) {
      const validTypes = ["House Keeper", "Laundry"];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ message: "Invalid type" });
      }
      item.type = type;
    }
    if (description !== undefined) item.description = description.trim();
    if (order !== undefined) item.order = order;
    if (isActive !== undefined) item.isActive = isActive;

    await item.save();

    return res.json({
      message: "Checklist item updated successfully",
      item,
    });
  } catch (error) {
    console.error("updateChecklistItem error:", error);
    return res.status(500).json({
      message: "Failed to update checklist item",
      error: error.message,
    });
  }
};

// Delete checklist item
export const deleteChecklistItem = async (req, res) => {
  try {
    if (!ensureAuth(req, res)) return;

    const { id } = req.params;

    const item = await ChecklistItem.findById(id);

    if (!item) {
      return res.status(404).json({ message: "Checklist item not found" });
    }

    await item.deleteOne();

    return res.json({ message: "Checklist item deleted successfully" });
  } catch (error) {
    console.error("deleteChecklistItem error:", error);
    return res.status(500).json({
      message: "Failed to delete checklist item",
      error: error.message,
    });
  }
};

// ==================== CLEANING TASK ENDPOINTS ====================
export const getCleaningTasks = async (req, res) => {
  try {
    if (!ensureAuth(req, res)) return;

    const { status, date, assignedTo, page = 1, limit = 10 } = req.query;

    const filter = {};

    if (status && status !== "all") {
      filter.status = status;
    }

    if (assignedTo) {
      filter.assignedTo = assignedTo;
    }

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      filter.date = { $gte: startDate, $lte: endDate };
    }

    const tasks = await CleaningTask.find(filter)
      .populate("assignedTo", "name email role")
      .populate("room", "roomNumber roomType floor")
      .sort({ date: -1, createdAt: -1 })
      .lean();

    return res.json({
      count: tasks.length,
      tasks,
    });
  } catch (error) {
    console.error("getCleaningTasks error:", error);
    return res.status(500).json({
      message: "Failed to fetch cleaning tasks",
      error: error.message,
    });
  }
};

// Create cleaning task
export const createCleaningTask = async (req, res) => {
  try {
    if (!ensureAuth(req, res)) return;

    const { roomNumber, empName, empId, date, assignedTo, checklist, notes } = req.body;

    if (!roomNumber || !empName || !date) {
      return res
        .status(400)
        .json({ message: "Room number, employee name, and date are required" });
    }

    // Find room by roomNumber
    const room = await Room.findOne({ roomNumber: roomNumber.trim() });
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // If assignedTo not provided, use current user
    let finalAssignedTo = assignedTo;
    if (!finalAssignedTo) {
      finalAssignedTo = req.user._id;
    }

    // Verify assigned user exists and is housekeeping staff
    const assignedUser = await User.findById(finalAssignedTo);
    if (!assignedUser) {
      return res.status(404).json({ message: "Assigned user not found" });
    }

    const task = await CleaningTask.create({
      room: room._id,
      roomNumber: room.roomNumber,
      roomType: room.roomType,
      floor: room.floor,
      assignedTo: finalAssignedTo,
      empName: empName.trim(),
      empId: empId?.trim() || "",
      assignedBy: req.user._id,
      date: new Date(date),
      status: "Pending",
      checklist: checklist || [],
      notes: notes?.trim() || "",
      isAssigned: true,
    });

    const populatedTask = await CleaningTask.findById(task._id)
      .populate("assignedTo", "name email role")
      .lean();

    return res.status(201).json({
      message: "Cleaning task created successfully",
      task: populatedTask,
    });
  } catch (error) {
    console.error("createCleaningTask error:", error);
    return res.status(500).json({
      message: "Failed to create cleaning task",
      error: error.message,
    });
  }
};

// Update cleaning task
export const updateCleaningTask = async (req, res) => {
  try {
    if (!ensureAuth(req, res)) return;

    const { id } = req.params;
    const { empName, roomNumber, date, status, notes, checklist } = req.body;

    const task = await CleaningTask.findById(id);

    if (!task) {
      return res.status(404).json({ message: "Cleaning task not found" });
    }

    if (empName) task.empName = empName.trim();
    if (roomNumber) {
      const room = await Room.findOne({ roomNumber: roomNumber.trim() });
      if (room) {
        task.room = room._id;
        task.roomNumber = room.roomNumber;
        task.roomType = room.roomType;
        task.floor = room.floor;
      }
    }
    if (date) task.date = new Date(date);
    if (status) {
      const validStatuses = ["Pending", "Under Progress", "Completed"];
      if (!validStatuses.includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      task.status = status;
    }
    if (notes !== undefined) task.notes = notes.trim();
    if (checklist) task.checklist = checklist;

    await task.save();

    const updatedTask = await CleaningTask.findById(task._id)
      .populate("assignedTo", "name email role")
      .lean();

    return res.json({
      message: "Cleaning task updated successfully",
      task: updatedTask,
    });
  } catch (error) {
    console.error("updateCleaningTask error:", error);
    return res.status(500).json({
      message: "Failed to update cleaning task",
      error: error.message,
    });
  }
};

// Delete cleaning task
export const deleteCleaningTask = async (req, res) => {
  try {
    if (!ensureAuth(req, res)) return;

    const { id } = req.params;

    const task = await CleaningTask.findById(id);

    if (!task) {
      return res.status(404).json({ message: "Cleaning task not found" });
    }

    await task.deleteOne();

    return res.json({ message: "Cleaning task deleted successfully" });
  } catch (error) {
    console.error("deleteCleaningTask error:", error);
    return res.status(500).json({
      message: "Failed to delete cleaning task",
      error: error.message,
    });
  }
};

// Assign task to housekeeping staff
export const assignCleaningTask = async (req, res) => {
  try {
    if (!ensureAuth(req, res)) return;

    const { roomId, staffId, roomType } = req.body;

    if (!roomId || !staffId) {
      return res.status(400).json({ message: "Room ID and staff ID are required" });
    }

    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    const staff = await User.findById(staffId);
    if (!staff) {
      return res.status(404).json({ message: "Staff not found" });
    }

    if (staff.role !== "housekeeping") {
      return res.status(400).json({ message: "Can only assign to housekeeping staff" });
    }

    // Check if task already exists for this room today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const existingTask = await CleaningTask.findOne({
      room: roomId,
      date: { $gte: today, $lt: tomorrow },
    });

    if (existingTask) {
      return res.status(400).json({ message: "Task already assigned for this room today" });
    }

    const task = await CleaningTask.create({
      room: room._id,
      roomNumber: room.roomNumber,
      roomType: room.roomType,
      floor: room.floor,
      assignedTo: staffId,
      empName: staff.name,
      empId: staff._id,
      assignedBy: req.user._id,
      date: new Date(),
      status: "Pending",
      isAssigned: true,
    });

    const populatedTask = await CleaningTask.findById(task._id)
      .populate("assignedTo", "name email role")
      .lean();

    return res.status(201).json({
      message: "Cleaning task assigned successfully",
      task: populatedTask,
    });
  } catch (error) {
    console.error("assignCleaningTask error:", error);
    return res.status(500).json({
      message: "Failed to assign cleaning task",
      error: error.message,
    });
  }
};

// Toggle assignment status
export const toggleAssignment = async (req, res) => {
  try {
    if (!ensureAuth(req, res)) return;

    const { id } = req.params;
    const { isAssigned } = req.body;

    const task = await CleaningTask.findById(id);

    if (!task) {
      return res.status(404).json({ message: "Cleaning task not found" });
    }

    task.isAssigned = isAssigned !== undefined ? isAssigned : !task.isAssigned;
    await task.save();

    const updatedTask = await CleaningTask.findById(task._id)
      .populate("assignedTo", "name email role")
      .lean();

    return res.json({
      message: "Assignment status updated",
      task: updatedTask,
    });
  } catch (error) {
    console.error("toggleAssignment error:", error);
    return res.status(500).json({
      message: "Failed to update assignment status",
      error: error.message,
    });
  }
};

// Get cleaning report
export const getCleaningReport = async (req, res) => {
  try {
    if (!ensureAuth(req, res)) return;

    const role = String(req.user.role || "").toLowerCase();
    if (!isStaff(role)) {
      return res.status(403).json({ message: "Access denied. Staff only." });
    }

    const { startDate, endDate, assignedTo } = req.query;

    const filter = {};

    if (startDate && endDate) {
      filter.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate),
      };
    }

    if (assignedTo) {
      filter.assignedTo = assignedTo;
    }

    // Aggregate by employee
    const report = await CleaningTask.aggregate([
      { $match: filter },
      {
        $group: {
          _id: {
            assignedTo: "$assignedTo",
            empName: "$empName",
            empId: "$empId",
          },
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] },
          },
          pending: {
            $sum: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] },
          },
          underProgress: {
            $sum: { $cond: [{ $eq: ["$status", "Under Progress"] }, 1, 0] },
          },
        },
      },
      {
        $project: {
          _id: 0,
          employeeId: "$_id.empId",
          empName: "$_id.empName",
          assignedTo: "$_id.assignedTo",
          total: 1,
          completed: 1,
          pending: 1,
          underProgress: "$underProgress",
          completionRate: {
            $round: [
              {
                $multiply: [
                  { $divide: ["$completed", { $max: ["$total", 1] }] },
                  100,
                ],
              },
              2,
            ],
          },
        },
      },
      { $sort: { completionRate: -1 } },
    ]);

    return res.json({
      count: report.length,
      report,
    });
  } catch (error) {
    console.error("getCleaningReport error:", error);
    return res.status(500).json({
      message: "Failed to fetch cleaning report",
      error: error.message,
    });
  }
};

// Get room status for housekeeping
export const getRoomCleaningStatus = async (req, res) => {
  try {
    if (!ensureAuth(req, res)) return;

    const { roomType, status, floor } = req.query;

    const filter = {};

    if (roomType) filter.roomType = roomType;
    if (status) filter.status = status;
    if (floor) filter.floor = Number(floor);

    const rooms = await Room.find(filter)
      .select("roomNumber roomName roomType floor status isActive")
      .sort({ floor: 1, roomNumber: 1 })
      .lean();

    // Get today's tasks
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const tasks = await CleaningTask.find({
      date: { $gte: today, $lt: tomorrow },
    })
      .select("room roomNumber assignedTo empName status")
      .lean();

    const taskMap = new Map(tasks.map((t) => [String(t.room), t]));

    const roomsWithTasks = rooms.map((room) => ({
      ...room,
      cleaningTask: taskMap.get(String(room._id)) || null,
      isAssigned: taskMap.has(String(room._id)),
    }));

    return res.json({
      count: roomsWithTasks.length,
      rooms: roomsWithTasks,
    });
  } catch (error) {
    console.error("getRoomCleaningStatus error:", error);
    return res.status(500).json({
      message: "Failed to fetch room cleaning status",
      error: error.message,
    });
  }
};

// Get assigned tasks for housekeeping staff
export const getMyAssignedTasks = async (req, res) => {
  try {
    if (!ensureAuth(req, res)) return;

    const role = String(req.user.role || "").toLowerCase();

    // If housekeeping, only show their tasks
    let filter = {};
    if (role === "housekeeping") {
      filter.assignedTo = req.user._id;
    }

    const { status, date } = req.query;

    if (status && status !== "all") {
      filter.status = status;
    }

    if (date) {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      filter.date = { $gte: startDate, $lte: endDate };
    }

    const tasks = await CleaningTask.find(filter)
      .populate("room", "roomNumber roomType floor")
      .sort({ date: -1, createdAt: -1 })
      .lean();

    return res.json({
      count: tasks.length,
      tasks,
    });
  } catch (error) {
    console.error("getMyAssignedTasks error:", error);
    return res.status(500).json({
      message: "Failed to fetch assigned tasks",
      error: error.message,
    });
  }
};

// Update task status
export const updateTaskStatus = async (req, res) => {
  try {
    if (!ensureAuth(req, res)) return;

    const { id } = req.params;
    const { status, checklist } = req.body;

    if (!status) {
      return res.status(400).json({ message: "Status is required" });
    }

    const validStatuses = ["Pending", "Under Progress", "Completed"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const task = await CleaningTask.findById(id);

    if (!task) {
      return res.status(404).json({ message: "Cleaning task not found" });
    }

    task.status = status;

    if (checklist) {
      task.checklist = checklist;
    }

    if (status === "Completed") {
      task.completedBy = req.user._id;
    }

    await task.save();

    const updatedTask = await CleaningTask.findById(task._id)
      .populate("assignedTo", "name email role")
      .lean();

    return res.json({
      message: "Task status updated successfully",
      task: updatedTask,
    });
  } catch (error) {
    console.error("updateTaskStatus error:", error);
    return res.status(500).json({
      message: "Failed to update task status",
      error: error.message,
    });
  }
};

// Get housekeeping dashboard stats
export const getHousekeepingDashboard = async (req, res) => {
  try {
    if (!ensureAuth(req, res)) return;

    const role = String(req.user.role || "").toLowerCase();
    if (!isStaff(role)) {
      return res.status(403).json({ message: "Access denied. Staff only." });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Today's stats
    const todayTasks = await CleaningTask.find({
      date: { $gte: today, $lt: tomorrow },
    });

    const totalToday = todayTasks.length;
    const completedToday = todayTasks.filter((t) => t.status === "Completed").length;
    const pendingToday = todayTasks.filter((t) => t.status === "Pending").length;
    const inProgressToday = todayTasks.filter((t) => t.status === "Under Progress").length;

    // Overall stats
    const totalTasks = await CleaningTask.countDocuments();
    const totalCompleted = await CleaningTask.countDocuments({ status: "Completed" });
    const totalPending = await CleaningTask.countDocuments({ status: "Pending" });

    // Staff stats
    const staffStats = await CleaningTask.aggregate([
      {
        $match: {
          date: { $gte: today, $lt: tomorrow },
        },
      },
      {
        $group: {
          _id: {
            assignedTo: "$assignedTo",
            empName: "$empName",
          },
          total: { $sum: 1 },
          completed: {
            $sum: { $cond: [{ $eq: ["$status", "Completed"] }, 1, 0] },
          },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id.assignedTo",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          staffId: "$_id.assignedTo",
          staffName: "$_id.empName",
          total: 1,
          completed: 1,
          pending: { $subtract: ["$total", "$completed"] },
        },
      },
    ]);

    return res.json({
      todayStats: {
        total: totalToday,
        completed: completedToday,
        pending: pendingToday,
        inProgress: inProgressToday,
      },
      overallStats: {
        total: totalTasks,
        completed: totalCompleted,
        pending: totalPending,
      },
      staffStats,
    });
  } catch (error) {
    console.error("getHousekeepingDashboard error:", error);
    return res.status(500).json({
      message: "Failed to fetch housekeeping dashboard",
      error: error.message,
    });
  }
};
