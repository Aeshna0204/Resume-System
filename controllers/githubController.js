
const axios = require("axios");
const Project = require("../models/Project");
const Resume = require("../models/Resume");
const User = require("../models/User");

// In-memory storage for active syncs
const activeSyncs = new Map(); // userId -> { intervalId, githubUsername }

// ENABLE REAL-TIME SYNC

exports.enableRealtimeSync = async (req, res) => {
  try {
    const { githubUsername } = req.body;
    const userId = req.user.id;

    // Stop existing sync if any
    stopSync(userId);

    // Update user with GitHub username
    await User.findByIdAndUpdate(userId, {
      'socials.github': githubUsername
    });

    // Do initial sync
    await syncGitHubRepos(userId, githubUsername);

    // Start polling every 5 minutes (300000 ms)
    const intervalId = setInterval(async () => {
      console.log(`🔄 Auto-syncing GitHub for user ${userId}`);
      await syncGitHubRepos(userId, githubUsername);
    }, 5 * 60 * 1000); // 5 minutes

    // Store in memory
    activeSyncs.set(userId, { intervalId, githubUsername });

    console.log(` Real-time sync ENABLED for ${githubUsername}`);

    res.json({
      success: true,
      message: `Real-time sync enabled! Checking GitHub every 5 minutes.`,
      githubUsername,
      nextSyncIn: '5 minutes'
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// DISABLE REAL-TIME SYNC

exports.disableRealtimeSync = async (req, res) => {
  try {
    const userId = req.user.id;
    stopSync(userId);

    res.json({
      success: true,
      message: 'Real-time sync disabled'
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


//  MANUAL SYNC (For immediate demo)

exports.syncNow = async (req, res) => {
  try {
    const userId = req.user.id;
    const { githubUsername } = req.body;

    const result = await syncGitHubRepos(userId, githubUsername);

    res.json({
      success: true,
      message: 'Sync completed',
      ...result
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


//  CHECK SYNC STATUS

exports.getSyncStatus = async (req, res) => {
  try {
    const userId = req.user.id;
    const syncInfo = activeSyncs.get(userId);

    if (!syncInfo) {
      return res.json({
        isActive: false,
        message: 'Real-time sync is not enabled'
      });
    }

    res.json({
      isActive: true,
      githubUsername: syncInfo.githubUsername,
      syncInterval: '5 minutes',
      message: 'Real-time sync is active'
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// CORE SYNC LOGIC

async function syncGitHubRepos(userId, githubUsername) {
  try {
    console.log(` Syncing GitHub: ${githubUsername}`);

    // Fetch repos from GitHub
    const response = await axios.get(
      `https://api.github.com/users/${githubUsername}/repos`,
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Resume-Builder-App'
        },
        params: {
          sort: 'updated',
          per_page: 100
        }
      }
    );

    const githubRepos = response.data;

    // Get existing projects
    const existingProjects = await Project.find({
      userId,
      repoUrl: { $regex: /github\.com/ }
    });

    const existingUrls = new Set(existingProjects.map(p => p.repoUrl));
    const githubUrls = new Set(githubRepos.map(r => r.html_url));

    let newRepos = 0;
    let updatedRepos = 0;
    let deletedRepos = 0;

    // Check for NEW repos
    for (const repo of githubRepos) {
      if (repo.fork) continue; // Skip forks

      if (!existingUrls.has(repo.html_url)) {
        //  NEW REPO DETECTED!
        const project = await Project.create({
          userId,
          title: repo.name,
          shortDescription: repo.description || `GitHub repository: ${repo.name}`,
          description: repo.description,
          techStack: repo.language ? [repo.language] : [],
          repoUrl: repo.html_url,
          liveUrl: repo.homepage || null,
          startDate: new Date(repo.created_at),
          endDate: new Date(repo.updated_at),
          visibility: 'public',
          contributions: [
            ` ${repo.stargazers_count} stars`,
            ` ${repo.forks_count} forks`,
            ` ${repo.open_issues_count} issues`
          ]
        });

        // AUTO-ADD TO ALL RESUMES
        await addToAllResumes(userId, project._id);

        newRepos++;
        console.log(` NEW REPO: ${repo.name} → Added to resume automatically!`);
      } else {
        // Update existing repo stats
        const project = existingProjects.find(p => p.repoUrl === repo.html_url);
        if (project) {
          project.contributions = [
            `${repo.stargazers_count} stars`,
            ` ${repo.forks_count} forks`,
            ` ${repo.open_issues_count} issues`
          ];
          project.endDate = new Date(repo.updated_at);
          await project.save();
          updatedRepos++;
        }
      }
    }

    // Check for DELETED repos
    for (const project of existingProjects) {
      if (!githubUrls.has(project.repoUrl)) {
        // REPO DELETED FROM GITHUB
        await Resume.updateMany(
          { userId },
          { $pull: { projects: project._id } }
        );
        await project.deleteOne();
        deletedRepos++;
        console.log(` DELETED: ${project.title} → Removed from resume`);
      }
    }

    if (newRepos > 0 || deletedRepos > 0) {
      console.log(` Sync Results: +${newRepos} new, -${deletedRepos} deleted, ~${updatedRepos} updated`);
    }

    return { newRepos, updatedRepos, deletedRepos };

  } catch (error) {
    console.error('Sync error:', error.message);
    throw error;
  }
}

// Helper: Add project to all resumes
async function addToAllResumes(userId, projectId) {
  const resumes = await Resume.find({ userId });

  for (const resume of resumes) {
    if (!resume.projects.includes(projectId)) {
      resume.projects.push(projectId);
      resume.lastSyncedAt = new Date();
      await resume.save();
    }
  }

  return resumes.length;
}

// Helper: Stop sync for a user
function stopSync(userId) {
  const syncInfo = activeSyncs.get(userId);
  if (syncInfo) {
    clearInterval(syncInfo.intervalId);
    activeSyncs.delete(userId);
    console.log(`Stopped sync for user ${userId}`);
  }
}


// RESTART SYNCS ON SERVER START

exports.restartAllSyncs = async () => {
  try {
    // Find all users with GitHub connected
    const users = await User.find({
      'socials.github': { $exists: true, $ne: null }
    });

    console.log(` Restarting syncs for ${users.length} users`);

    for (const user of users) {
      const githubUsername = user.socials.github;
      
      // Start sync
      const intervalId = setInterval(async () => {
        await syncGitHubRepos(user._id, githubUsername);
      }, 5 * 60 * 1000);

      activeSyncs.set(user._id.toString(), { intervalId, githubUsername });
    }

    console.log(` All syncs restarted`);

  } catch (error) {
    console.error('Error restarting syncs:', error);
  }
};

module.exports = exports;