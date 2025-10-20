#  Resume System – Trial Task - Backend System
##  Trial Task Overview

This project is the **backend component** of a Resume Building & Career Ecosystem. It demonstrates:

- **Real-time resume updates** from multiple platforms (GitHub, Credly, Internshala, DevFolio)
- **Cross-platform integration** via webhooks and APIs
- **Automated verification** of achievements and credentials
- **Production-ready architecture** with security and scalability in mind

### Task Category Chosen
**Backend Development** - APIs for managing resume data, authentication, and cross-platform integration  
**Database Architecture** - Designed schemas for users, projects, courses, internships, and hackathons

## API Documentation - Postman Collection
[Postman Collection Link ](https://spaceflight-operator-63958023-382415.postman.co/workspace/Aeshna-Jain's-Workspace~b7907cc8-abb5-4489-82ca-daba0f39c503/collection/47076302-80b3a193-e65b-4931-b689-d64bf5ec8b61?action=share&source=copy-link&creator=47076302)
[Documentation Notion File](https://www.notion.so/Resume-System-API-Documentation-292198a4deba80b8b569d536a2d7058b?source=copy_link)


##  Approach & Design Decisions

### Problem Analysis
The challenge was to create a system where:
- Student achievements on the platfroms automatically update resumes
- Multiple platforms can send data to one central resume

### Solution Architecture

#### 1. **Webhook-Based Integration**
Instead of requiring users to manually add Internships and Hackathons, I implemented a webhook system that:
- Receives events from partner platforms (Internshala, DevFolio, Coursera)
- Verifies webhook signatures for security
- Auto-extracts relevant data and updates resumes
- **Why?** This creates a truly "automatic" resume that updates in real-time

#### 2. **Real-time GitHub Sync**
- Polls GitHub API every 5 minutes (configurable)
- Detects new repos, updates stats, removes deleted projects
- Survives server restarts (syncs automatically restart)
- **Why?** Students' GitHub profiles are constantly evolving - manual updates are tedious , this gives real-time updation of project section of users. 

#### 3. **Credly Badge Verification**
- Works even with private profiles (user provides badge URL)
- Auto-verifies using Credly's JSON API or HTML scraping
- Prevents duplicate entries
- **Why?** Courses are a major resume component but hard to verify manually, credly badges are verified and user can choose badges which are publicly shareable.

#### 4. **Modular Database Design**
```
User (1) ─── (M) Resume (1) ─┬─ (M) Projects
                              ├─ (M) Courses
                              ├─ (M) Internships
                              └─ (M) Hackathons
```
- One user can have multiple resumes (personal, professional, academic)
- Each resume references independent collections
- Easy to add/remove items without duplication
- **Why?** Flexibility + data integrity

#### 5. **Security-First Approach**
Implemented:
- Rate limiting (prevents abuse)
- Input validation & sanitization (prevents injection attacks)
- JWT authentication (secure API access)
- Webhook signature verification (prevents fake data)
- **Why?** This is a career platform - security breaches could damage users' professional profiles

### Technology Choices

| Technology | Reason |
|-----------|--------|
| **Express.js** | Lightweight, fast, industry-standard for REST APIs |
| **MongoDB** | Flexible schema for evolving resume formats |
| **JWT** | Stateless authentication, scales horizontally |
| **Cloudinary** | Managed image hosting (no server storage needed) |
| **PDFKit** | Generates professional PDFs without external services |
| **Axios + Cheerio** | Scrapes data when APIs unavailable (Credly badges) |

### What Makes This Production-Ready?

1. **Error Handling**: Every endpoint has try-catch with meaningful errors
2. **Validation**: Input validation on all user data
3. **Rate Limiting**: Prevents API abuse
4. **Restart Resilience**: GitHub syncs automatically restart on server boot
5. **Webhook Retry Logic**: (Can be added) Handles failed webhook deliveries
6. **Documentation**: Clear API docs for integration partners

##  How This Fits into the Resume Ecosystem

This backend serves as the **central hub** that connects:
```
┌─────────────────────────────────────────────────────────────┐
│                    RESUME ECOSYSTEM                          │
└─────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │   Backend API     │ ← THIS PROJECT
                    │   (Node.js)       │
                    └─────────┬─────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
   ┌────▼────┐         ┌──────▼──────┐      ┌──────▼──────┐
   │Frontend │         │  Partner    │      │   Storage   │
   │ (React) │         │  Platforms  │      │ (MongoDB +  │
   │         │         │             │      │  Cloudinary)│
   └─────────┘         └──────┬──────┘      └─────────────┘
                              │
                 ┌────────────┼────────────┐
                 │            │            │
            ┌────▼────┐  ┌────▼────┐  ┌───▼────┐
            │ GitHub  │  │ Credly  │  │Webhooks│
            │   API   │  │   API   │  │ (APIs) │
            └─────────┘  └─────────┘  └────────┘
```

### Integration Points

1. **Frontend Integration**
   - Provides RESTful APIs for UI to consume
   - Real-time updates trigger frontend refresh
   - PDF export for download/print

2. **Partner Platform Integration**
   - Webhooks receive achievement data
   - API keys for secure communication

3. **Data Storage**
   - MongoDB for structured resume data
   - Cloudinary for profile pictures

### Extensibility

The architecture supports adding new platforms:
```javascript
// Add a new platform adapter in webhookController.js
const adapters = {
  internshala: (d) => ({ ... }),
  devfolio: (d) => ({ ... }),
  
  // Easy to add new ones:
  leetcode: (d) => ({
    company: "LeetCode",
    role: `${d.problems_solved} Problems Solved`,
    description: `Rating: ${d.rating}, Rank: ${d.rank}`
  })
};
```

## Testing the System

### Quick Start Demo ( more APIs for resume data management is in postman collection attached )

1. **Register a user**
```bash
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test User",
    "email": "test@example.com",
    "password": "SecurePass123!"
  }'
```

2. **Enable GitHub Sync**
```bash
curl -X POST http://localhost:5000/api/github/enable-sync \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"githubUsername": "torvalds"}'
```

3. **Simulate a hackathon webhook**
```bash
curl -X POST http://localhost:5000/api/webhooks/simulate \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "devfolio",
    "eventType": "hackathon.participated",
    "userEmail": "test@example.com"
  }'
```

4. **Export resume as PDF**
```bash
curl -X GET "http://localhost:5000/api/resume/RESUME_ID/export?format=pdf" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  --output resume.pdf
```

### Testing Webhooks

The system includes a **webhook simulator** for testing without actual platform integration:
```javascript
// Supports: internshala, devfolio, coursera, angellist
POST /api/webhooks/simulate
{
  "platform": "internshala",
  "eventType": "internship.completed",
  "userEmail": "test@example.com"
}
```

This generates realistic test data and processes it through the full webhook pipeline.

##  Challenges Faced & Solutions

### Challenge 1: Private Credly Profiles
**Problem**: Credly API doesn't work for private profiles  
**Solution**: Built a hybrid approach - try JSON API first, fallback to HTML scraping  
**Result**: Manual badge verification for public and private profiles and tried to scrape public profiles

### Challenge 2: GitHub Sync Persistence
**Problem**: Server restart would stop all active syncs  
**Solution**: Store sync preferences in Resume model, auto-restart on boot  
**Result**: Syncs survive deployments and crashes

### Challenge 3: Webhook Security
**Problem**: Anyone could send fake achievement data  
**Solution**: signature verification with platform-specific secrets  
**Result**: Only authenticated webhooks are processed

### Challenge 4: Resume Data Duplication
**Problem**: Same project/course appearing multiple times  
**Solution**: Check for duplicates before creating (by credentialId/repoUrl)  
**Result**: Clean, duplicate-free resumes

### Challenge 5: PDF Generation Quality
**Problem**: Basic PDFs looked unprofessional  
**Solution**: Implemented sections, formatting, proper spacing, and metadata  
**Result**: Professional-looking PDFs ready for job applications

##  Future Enhancements (Post-Trial)

### Phase 2: Advanced Integrations
- [ ] **LinkedIn Integration** - Import experience, education, endorsements
- [ ] **LeetCode/CodeChef** - Competitive programming achievements
- [ ] **Behance/Dribbble** - Design portfolio integration
- [ ] **Medium/Dev.to** - Technical writing showcase

### Phase 3: Collaboration Features
- [ ] **Resume Templates** - Multiple professional designs
- [ ] **Version History** - Track resume changes over time
- [ ] **Shareable Links** - Public portfolio pages
- [ ] **Team Features** - Mentors can review student resumes

### Phase 5: Analytics & Insights
- [ ] **Resume Views** - Track who viewed your resume
- [ ] **Skill Demand Trends** - Which skills are in demand
- [ ] **Career Path Suggestions** - Based on current achievements
- [ ] **Achievement Milestones** - Gamification of career growth

##  Submission Details

### What's Included

1. **Complete Backend API** 
   - Authentication & user management
   - Resume CRUD operations
   - GitHub real-time sync
   - Credly badge verification
   - Webhook system for multiple platforms
   - PDF export functionality

2. **Database Schema** (6 models)
   - User, Resume, Project, Course, Internship, Hackathon

3. **Security & Validation** (5 middleware files)
   - Rate limiting, input validation, XSS protection , storage and auth middleware

4. **Integration Examples**
   - Webhook simulators for testing
   - API documentation with curl examples

5. **Documentation**
   - Comprehensive README
   - Inline code comments
   - API endpoint documentation

### GitHub Repository Structure
```
resume-builder-backend/
├── config/              # Configuration files
│   ├── cloudinary.js
│   ├── cors.js
│   └── db.js
├── controllers/         # Business logic
│   ├── authController.js
│   ├── resumeController.js
│   ├── githubController.js
│   ├── credlyController.js
│   └── webhookController.js
├── middleware/          # Request processors
│   ├── authMiddleware.js
│   ├── uploadMiddleware.js
│   ├── rateLimiter.js
│   ├── validation.js
│   └── securityHeaders.js
├── models/              # Database schemas
│   ├── User.js
│   ├── Resume.js
│   ├── Project.js
│   ├── Course.js
│   ├── Internship.js
│   └── Hackathon.js
├── routes/
│   ├── authRoutes.js
│   ├── credlyRoutes.js
│   ├── githubRoutes.js
│   ├── resumeRoutes.js
│   └── webhookRoutes.js           # API endpoints
├── .env.example         # Environment template
├── package.json
├── server.js
└── README.md           # This file
```

