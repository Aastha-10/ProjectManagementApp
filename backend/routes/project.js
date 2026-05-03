const express = require("express");
const router = express.Router();
const Project = require("../models/Project");
const User = require("../models/User");
const authMiddleware = require("../middleware/authMiddleware");
const roleMiddleware = require("../middleware/roleMiddleware");

const populateProject = (query) => query
  .populate("createdBy", "name email role")
  .populate("projectLeader", "name email role")
  .populate("members", "name email role");

// POST /api/projects - Create project (Admin only)
router.post("/", authMiddleware, roleMiddleware("admin"), async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) return res.status(400).json({ msg: "Project name is required" });

    const project = new Project({
      name,
      description,
      createdBy: req.user.id,
      members: [req.user.id]
    });

    await project.save();
    res.status(201).json(project);

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// GET /api/projects - Get all projects for logged-in user
router.get("/", authMiddleware, async (req, res) => {
  try {
    const projects = await populateProject(Project.find({ members: req.user.id }));
    res.json(projects);

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// GET /api/projects/:id - Get single project
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const project = await populateProject(Project.findById(req.params.id));

    if (!project) return res.status(404).json({ msg: "Project not found" });

    const isMember = project.members.some((member) => member._id.toString() === req.user.id);
    if (!isMember) return res.status(403).json({ msg: "Access denied" });

    res.json(project);

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// POST /api/projects/:id/members - Add member (Admin only)
router.post("/:id/members", authMiddleware, roleMiddleware("admin"), async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ msg: "Member is required" });

    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ msg: "Project not found" });

    const user = await User.findById(userId);
    if (!user || user.role !== "member") {
      return res.status(400).json({ msg: "Only members can be added to projects" });
    }

    const isAlreadyMember = project.members.some((member) => member.toString() === userId);
    if (isAlreadyMember) {
      return res.status(400).json({ msg: "User already a member" });
    }

    project.members.push(userId);
    await project.save();

    const updatedProject = await populateProject(Project.findById(project._id));
    res.json({ msg: "Member added", project: updatedProject });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// PATCH /api/projects/:id/leader - Assign project leader (Admin only)
router.patch("/:id/leader", authMiddleware, roleMiddleware("admin"), async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ msg: "Project leader is required" });

    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ msg: "Project not found" });

    const user = await User.findById(userId);
    if (!user || user.role !== "member") {
      return res.status(400).json({ msg: "Project leader must be a member user" });
    }

    const isMember = project.members.some((member) => member.toString() === userId);
    if (!isMember) {
      return res.status(400).json({ msg: "Project leader must already be a project member" });
    }

    project.projectLeader = userId;
    await project.save();

    const updatedProject = await populateProject(Project.findById(project._id));
    res.json({ msg: "Project leader updated", project: updatedProject });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// DELETE /api/projects/:id - Delete project (Admin only)
router.delete("/:id", authMiddleware, roleMiddleware("admin"), async (req, res) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) return res.status(404).json({ msg: "Project not found" });

    res.json({ msg: "Project deleted" });

  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

module.exports = router;
