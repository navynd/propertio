# MongoDB Schema Analysis & Updates for Molumulk Project

## 1. High-Level Understanding of SOW

The Molumulk platform is a comprehensive real estate search and discovery system connecting:
- **Property Seekers** (Buyers/Renters) - Users
- **Property Listers** (Agents, Agencies, Developers)

### Core Features:
1. Property search and discovery (Buy, Rent, Commercial, New Projects)
2. Agent/Agency/Developer discovery and profiles
3. User account management with saved properties, alerts, and contacted properties
4. Agent/Agency dashboards with lead management and deal closure
5. Subscription management for agencies
6. Admin panel for content and user management

---

## 2. API-Driven Schema Analysis

### 2.1 User Account APIs (Section 2 & 3 of SOW)

**Required APIs:**
- `POST /api/auth/login` - Email, phone, Google, Apple ID
- `POST /api/auth/signup` - Multiple auth providers
- `POST /api/auth/reset-password`
- `GET /api/users/profile` - User profile with saved properties, alerts, contacted properties
- `PUT /api/users/profile` - Update profile, upload picture, change country
- `GET /api/users/saved-properties` - List saved properties with pagination
- `DELETE /api/users/saved-properties/:id` - Delete individual or all
- `GET /api/users/search-alerts` - List alerts
- `DELETE /api/users/search-alerts/:id` - Delete individual or all
- `GET /api/users/contacted-properties` - List contacted properties
- `POST /api/users/contacted-properties/:id/report` - Report property
- `DELETE /api/users/contacted-properties/:id` - Delete individual or all

**Schema Status:** ✅ User schema covers all requirements
- Authentication fields: ✅
- Saved properties: ✅
- Search alerts with frequency (hourly, daily, every-3-days): ✅
- Contacted properties with report functionality: ✅
- Profile management: ✅

**Missing/Updates Needed:**
- None identified

---

### 2.2 Property Search & Listing APIs (Section 4 & 5 of SOW)

**Required APIs:**
- `GET /api/properties/search` - Search with filters (location, type, beds, baths, amenities, furnished, completion status, area, virtual tours)
- `GET /api/properties/search/map` - Map view with geolocation
- `POST /api/properties/search/alerts` - Create search alert
- `GET /api/properties/:id` - Property details with images, virtual tours, price insights, mortgage calculator, regulatory info
- `GET /api/properties/:id/recommended` - Recommended properties based on user interests
- `POST /api/properties/:id/contact` - Contact agent (call, email, whatsapp)
- `POST /api/properties/:id/like` - Save property
- `POST /api/properties/:id/report` - Report property
- `POST /api/properties/:id/share` - Share property

**Schema Status:** ✅ Property schema covers most requirements
- Basic property info: ✅
- Media (images, 360 tour, video, floor plans): ✅
- Location with coordinates: ✅
- DLD permit and reference ID: ✅
- Status management: ✅
- Engagement metrics: ✅

**Missing/Updates Needed:**
- Add `listedTiming` virtual field calculation (can be computed from `publishedAt`)
- Ensure `referenceId` is properly indexed for developer projects
- Add index for recommended properties query (location, price, type, user preferences)

---

### 2.3 Agent/Agency Search APIs (Section 6, 7, 8 of SOW)

**Required APIs:**
- `GET /api/agents/search` - Search agents by location, service needed, language, nationality
- `GET /api/agencies/search` - Search agencies by location, service needed
- `GET /api/agents/:id` - Agent profile with track records, awards, expertise areas, properties
- `GET /api/agencies/:id` - Agency profile with awards, properties, agents
- `GET /api/agents/:id/properties` - Agent's properties with filters (buy/rent, featured, newest, price, beds)
- `GET /api/agencies/:id/properties` - Agency's properties
- `GET /api/agencies/:id/agents` - Agency's agents

**Schema Status:** ✅ Agent and Agency schemas cover requirements
- Agent search fields (languages, nationality): ✅
- Track records (last 12 months): ✅
- Area of expertise: ✅
- Awards: ✅
- Statistics: ✅

**Missing/Updates Needed:**
- Add index for agent search by service needed (can filter by listingType in properties)
- Ensure track records are limited to last 12 months in queries

---

### 2.4 Developer & Projects APIs (Section 9, 10, 11 of SOW)

**Required APIs:**
- `GET /api/developers/search` - Search developers by name, location
- `GET /api/developers/:id` - Developer profile
- `GET /api/developers/:id/projects` - Developer's projects
- `GET /api/projects/search` - Search projects with filters (location, name, developer, property type, beds, price, post-handover, DLD registered, completion status, delivery date, area, amenities)
- `GET /api/projects/:id` - Project details
- `GET /api/projects/search/map` - Map view with project locations

**Schema Status:** ⚠️ Developer schema needs authentication fields
- Developer basic info: ✅
- Projects schema: ✅
- Project filters (post-handover, DLD, completion, delivery): ✅

**Missing/Updates Needed:**
- **CRITICAL:** Developer schema missing authentication fields (password, email verification, login tracking)
- Add developer login/signup capability
- Add developer dashboard statistics

---

### 2.5 Agent Account APIs (Section 11 of SOW)

**Required APIs:**
- `POST /api/agents/auth/login` - Login via invitation link
- `PUT /api/agents/profile` - Complete profile setup (mandatory fields)
- `GET /api/agents/dashboard` - Statistics (revenues, listings, inquiries, deals)
- `GET /api/agents/properties` - List properties with filters
- `POST /api/agents/properties` - Add listing
- `PUT /api/agents/properties/:id` - Edit listing
- `POST /api/agents/properties/:id/sold` - Mark as sold
- `POST /api/agents/properties/:id/rented` - Mark as rented
- `GET /api/agents/allocated-properties` - List allocated properties from agency
- `PUT /api/agents/allocated-properties/:id/complete` - Mark allocation as complete
- `GET /api/agents/leads` - List inquiries (new, attended, closed)
- `PUT /api/agents/leads/:id/status` - Update inquiry status
- `POST /api/agents/leads/:id/close-deal` - Close deal with amount

**Schema Status:** ✅ Agent schema covers requirements
- Profile management: ✅
- Statistics: ✅
- Property allocation: ✅
- Lead management: ✅
- Deal closure: ✅

**Missing/Updates Needed:**
- None identified

---

### 2.6 Agency Account APIs (Section 12 of SOW)

**Required APIs:**
- `POST /api/agencies/auth/login` - Login via invitation link
- `PUT /api/agencies/profile` - Complete profile setup
- `GET /api/agencies/dashboard` - Statistics
- `GET /api/agencies/agents` - List agents (active/inactive)
- `POST /api/agencies/agents/invite` - Invite agent/superagent
- `PUT /api/agencies/agents/:id` - Edit agent details, change role
- `POST /api/agencies/agents/:id/deactivate` - Deactivate agent
- `POST /api/agencies/property-allocations` - Allocate property to agent
- `GET /api/agencies/properties` - List all agency properties with filters
- `GET /api/agencies/leads` - List all leads with filters
- `GET /api/agencies/leads/closed-deals` - List closed sales/rents
- `GET /api/agencies/subscription` - Current subscription
- `POST /api/agencies/subscription` - Subscribe to plan

**Schema Status:** ✅ Agency schema covers requirements
- Profile management: ✅
- Agent management: ✅
- Property allocation: ✅
- Subscription management: ✅
- Statistics: ✅

**Missing/Updates Needed:**
- None identified

---

### 2.7 Admin Panel APIs (Section 14 of SOW)

**Required APIs:**
- Dashboard APIs
- User/Agent/Agency/Developer management APIs
- Property/Listing management APIs
- Amenities management APIs
- Reports management APIs
- Ratings & Reviews management APIs
- Location & Currency management APIs
- SEO settings APIs
- Banner management APIs
- Site settings APIs
- Help pages (CMS) APIs

**Schema Status:** ✅ All admin-related schemas exist
- Admin, Role schemas: ✅
- CMS pages: ✅
- Banners: ✅
- Site settings: ✅
- Reports: ✅
- Ratings: ✅

**Missing/Updates Needed:**
- None identified

---

### 2.8 Additional Features from SOW

**Home Page Features:**
- "Know more about us" with logo sliders - **NEEDS NEW SCHEMA**
- Explore New Projects section - ✅ Covered by NewProject schema
- Explore UAE Market section - **MIGHT NEED MARKET INSIGHTS SCHEMA**
- Properties based on prime location - ✅ Covered by Location schema
- Testimonials - ✅ Covered by Testimonial schema

**Missing Schemas:**
1. **Partner/Logo Schema** - For "Know more about us" section
2. **Market Insights Schema** - For "Explore UAE Market" section (optional, can use PriceInsight)

---

## 3. Critical Schema Updates Required

### 3.1 Developer Schema - ADD AUTHENTICATION
**Issue:** Developer account mentioned in SOW but no login/auth fields
**Fix:** Add password, email verification, session tracking

### 3.2 Partner/Logo Schema - NEW SCHEMA
**Issue:** "Know more about us" section needs logo management
**Fix:** Create new Partner schema

### 3.3 Indexes for Performance
**Issue:** Some queries need additional indexes
**Fix:** Add compound indexes for common search patterns

---

## 4. Assumptions

1. **Developer Account:** Assumed developers need login capability similar to agents/agencies (SOW mentions "Developer Account" but doesn't detail it)
2. **Partner Logos:** Assumed "Know more about us" needs a separate schema for managing partner logos
3. **Market Insights:** "Explore UAE Market" can use existing PriceInsight schema or Location.areaInsights
4. **Listing Timing:** "10 hours ago, 1 day ago" can be calculated from `publishedAt` field, no schema change needed
5. **Recommended Properties:** Can be calculated from user preferences, view history, and property similarities - no separate schema needed
6. **Mortgage Calculator:** Uses third-party API, calculation results stored in MortgageCalculation schema for analytics
7. **WhatsApp Integration:** Uses WhatsApp Business API, inquiry data stored in Inquiry schema

---

## 5. Summary of Changes

### New Schemas to Add:
1. **Partner Schema** - For "Know more about us" logos
2. **Developer Auth Fields** - Add to existing Developer schema

### Schema Updates:
1. **Developer Schema** - Add authentication and session fields
2. **Property Schema** - Add indexes for recommended properties
3. **Agent Schema** - Ensure track records query limits to 12 months
4. **All Schemas** - Review and add missing indexes for API performance

### No Changes Needed:
- User, Agent, Agency, Property, NewProject, Inquiry, PropertyAllocation, DealClosure, RatingReview, Report, SubscriptionPlan, PropertyType, Amenity, Country, Banner, Testimonial, CmsPage, Admin, Role, SiteSettings, Location, Notification, PriceInsight, BlogPost, EmailTemplate, ActivityLog, SearchAnalytics, MortgageCalculation



https://accounts.google.com/o/oauth2/v2/auth?
client_id=154349029120-722fsva2m55puso8c5v1h9lqbvshfrgp.apps.googleusercontent.com
&redirect_uri=http://localhost:5000/api/auth/google/callback
&response_type=code
&scope=openid%20email%20profile
&access_type=offline
&prompt=consent

