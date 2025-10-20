// ============================================
// CREDLY MANUAL VERIFICATION
// User provides badge URL, we verify it
// Works even with private profiles!
// ============================================

const axios = require("axios");
const cheerio = require("cheerio");
const Course = require("../models/Course");
const Resume = require("../models/Resume");

// ============================================
// ADD BADGE BY URL (Manual Entry + Auto-Verify)
// ============================================
exports.addCredlyBadge = async (req, res) => {
  try {
    const { badgeUrl } = req.body;
    const userId = req.user.id;

    console.log(`🔍 Verifying Credly badge: ${badgeUrl}`);

    // Validate URL format
    if (!badgeUrl || !badgeUrl.includes('credly.com/badges/')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid Credly badge URL. Format: https://www.credly.com/badges/xxx'
      });
    }

    // Extract badge ID from URL
    const badgeId = badgeUrl.split('/badges/')[1].split('?')[0].split('/')[0];

    console.log(`📝 Badge ID: ${badgeId}`);

    // Check if already exists
    const exists = await Course.findOne({
      userId,
      credentialId: badgeId
    });

    if (exists) {
      return res.status(400).json({
        success: false,
        error: 'This badge is already in your courses'
      });
    }

    // Verify and fetch badge details
    const badgeDetails = await verifyCredlyBadge(badgeUrl, badgeId);

    if (!badgeDetails.verified) {
      return res.status(400).json({
        success: false,
        error: 'Badge verification failed. Please check the URL.',
        details: badgeDetails
      });
    }

    console.log(`✅ Badge verified: ${badgeDetails.title}`);

    // Create course
    const course = await Course.create({
      userId,
      title: badgeDetails.title,
      issuer: 'Credly',
      credentialId: badgeId,
      credentialUrl: badgeUrl,
      issuedAt: badgeDetails.issuedAt,
      expiresAt: badgeDetails.expiresAt,
      verified: true,
      verificationStatus: 'auto_verified',
      notes: badgeDetails.issuerName ? `Issued by: ${badgeDetails.issuerName}` : null
    });

    // Add to all resumes
    const resumes = await Resume.find({ userId });
    for (const resume of resumes) {
      if (!resume.courses.includes(course._id)) {
        resume.courses.push(course._id);
        resume.lastSyncedAt = new Date();
        await resume.save();
      }
    }

    console.log(`✅ Badge added to ${resumes.length} resume(s)`);

    res.json({
      success: true,
      message: 'Credly badge verified and added!',
      course: {
        id: course._id,
        title: course.title,
        issuer: course.issuer,
        verified: course.verified
      }
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// ============================================
// VERIFY CREDLY BADGE
// ============================================
async function verifyCredlyBadge(badgeUrl, badgeId) {
  try {
    console.log(`🔍 Fetching badge details...`);

    // Method 1: Try JSON API
    try {
      const jsonUrl = `https://www.credly.com/badges/${badgeId}.json`;
      const response = await axios.get(jsonUrl, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0'
        }
      });

      if (response.data) {
        const badge = response.data.data || response.data;
        return {
          verified: true,
          title: badge.name || badge.badge_name || 'Credly Badge',
          issuerName: badge.issuer?.name || badge.issuer_name,
          issuedAt: badge.issued_at ? new Date(badge.issued_at) : null,
          expiresAt: badge.expires_at ? new Date(badge.expires_at) : null,
          method: 'json_api'
        };
      }
    } catch (jsonError) {
      console.log('⚠️  JSON API failed, trying HTML...');
    }

    // Method 2: HTML Scraping
    const response = await axios.get(badgeUrl, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    const $ = cheerio.load(response.data);

    // Extract badge details
    const title = 
      $('h1.badge-name').first().text().trim() ||
      $('.cr-badge-name').first().text().trim() ||
      $('meta[property="og:title"]').attr('content') ||
      'Credly Badge';

    const issuerName = 
      $('.issuer-name').first().text().trim() ||
      $('.cr-organization-name').first().text().trim() ||
      null;

    const issuedDate = 
      $('.issued-date').first().text().trim() ||
      $('.cr-issued-date').first().text().trim() ||
      null;

    // If we found a title, badge is valid
    if (title && title !== 'Credly Badge') {
      return {
        verified: true,
        title,
        issuerName,
        issuedAt: parseCredlyDate(issuedDate),
        expiresAt: null,
        method: 'html_scraping'
      };
    }

    return {
      verified: false,
      error: 'Could not extract badge details'
    };

  } catch (error) {
    console.error('Verification error:', error.message);
    
    if (error.response?.status === 404) {
      return {
        verified: false,
        error: 'Badge not found'
      };
    }

    return {
      verified: false,
      error: error.message
    };
  }
}

// Helper: Parse date
function parseCredlyDate(dateStr) {
  if (!dateStr) return null;
  const cleaned = dateStr.replace(/Issued|Earned on/gi, '').trim();
  const date = new Date(cleaned);
  return isNaN(date.getTime()) ? null : date;
}

// ============================================
// BULK ADD FROM PROFILE (Original feature)
// ============================================
exports.importFromProfile = async (req, res) => {
  try {
    const { credlyUsername } = req.body;
    const userId = req.user.id;

    console.log(`🔍 Importing from Credly profile: ${credlyUsername}`);

    // Try to fetch badges
    const badges = await fetchCredlyBadges(credlyUsername);

    if (badges.length === 0) {
      return res.status(400).json({
        success: false,
        error: `No public badges found for username: ${credlyUsername}. Please ensure your profile is public or add badges manually using their URLs.`
      });
    }

    let imported = 0;
    let skipped = 0;

    for (const badge of badges) {
      const exists = await Course.findOne({
        userId,
        credentialId: badge.id
      });

      if (exists) {
        skipped++;
        continue;
      }

      await Course.create({
        userId,
        title: badge.name,
        issuer: 'Credly',
        credentialId: badge.id,
        credentialUrl: badge.url,
        issuedAt: badge.issuedAt,
        verified: true,
        verificationStatus: 'auto_verified'
      });

      imported++;
    }

    res.json({
      success: true,
      message: `Imported ${imported} badges from Credly`,
      imported,
      skipped
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Fetch badges from profile
async function fetchCredlyBadges(credlyUsername) {
  try {
    const jsonUrl = `https://www.credly.com/users/${credlyUsername}.json`;
    const response = await axios.get(jsonUrl, {
      timeout: 10000,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0'
      }
    });

    if (response.data?.data) {
      return response.data.data.map(badge => ({
        id: badge.id,
        name: badge.name || badge.badge_name,
        url: badge.url || `https://www.credly.com/badges/${badge.id}`,
        issuerName: badge.issuer?.name,
        issuedAt: badge.issued_at ? new Date(badge.issued_at) : null
      }));
    }

    return [];

  } catch (error) {
    console.error('Fetch error:', error.message);
    return [];
  }
}

module.exports = exports;