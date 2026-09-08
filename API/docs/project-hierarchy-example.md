# Project Allocation & Lead Assignment — System Documentation

This document defines the **models**, **hierarchy**, **schemas**, **flows**, and **business rules** for project allocation and lead assignment. It serves as the single source of truth for implementation.

---

## 1. MODELS INVOLVED

### New Collections to Create

| Collection                 | File path                                      |
|---------------------------|-------------------------------------------------|
| ProjectBuilding           | `src/models/projectBuildingModel.js`            |
| ProjectLayout             | `src/models/projectLayoutModel.js`             |
| ProjectUnit               | `src/models/projectUnitModel.js`               |
| ProjectAgencyAllocation   | `src/models/projectAgencyAllocationModel.js`    |
| ProjectAgentAllocation    | `src/models/projectAgentAllocationModel.js`    |
| LeadAssignmentConfig      | `src/models/leadAssignmentModel.js`            |

### Modified Collections

| Collection  | Change |
|-------------|--------|
| NewProject  | Add field: `hasBuildings` (Boolean, default: false) |

---

## 2. HIERARCHY

### With Buildings (`hasBuildings: true`)

```
Project
  └── Building (Tower A, Tower B)
        └── PropertyType (Apartment, Villa)
              └── Layout (Type A-Tower A, Type B-Tower A)
                    └── Individual Units (Unit 101, Unit 102, ...)
```

### Without Buildings (`hasBuildings: false`)

```
Project
  └── PropertyType (Apartment, Villa)
        └── Layout (Type 7-709, Type 13-1309)
              └── Individual Units (Unit 101, Unit 102, ...)
```

---

## 3. SCHEMA DEFINITIONS

### 3.1 ProjectBuilding

| Field         | Type     | Required | Notes |
|---------------|----------|----------|--------|
| project       | ObjectId | ✓        | ref: Newprojects |
| propertyType  | ObjectId | ✓        | ref: PropertyType |
| buildingName  | String   | ✓        | e.g. "Tower A" |
| isActive      | Boolean  |          | default: true |
| timestamps    |          |          | true |

**Indexes:** `{ project: 1, propertyType: 1 }`, `{ project: 1, isActive: 1 }`

---

### 3.2 ProjectLayout

| Field          | Type     | Required | Notes |
|----------------|----------|----------|--------|
| project        | ObjectId | ✓        | ref: Newprojects |
| building       | ObjectId |          | ref: ProjectBuilding; optional (null if no buildings) |
| propertyType   | ObjectId | ✓        | ref: PropertyType |
| layoutName     | String   | ✓        | e.g. "Type 7-709" |
| bedrooms       | Number   | ✓        | min: 0 |
| bathrooms      | Number   | ✓        | min: 0 |
| areaSqft       | Number   | ✓        | min: 0 |
| startingPrice  | Object   |          | `{ amount, currency }` default currency: 'AED' |
| floorPlans     | [String] |          | image URLs |
| totalUnits     | Number   |          | default: 0; **auto-computed from ProjectUnit** |
| availableUnits | Number   |          | default: 0; **auto-computed** |
| reservedUnits  | Number   |          | default: 0; **auto-computed** |
| soldUnits      | Number   |          | default: 0; **auto-computed** |
| isActive       | Boolean  |          | default: true |
| timestamps     |          |          | true |

**Indexes:** `{ project: 1, building: 1 }`, `{ project: 1, bedrooms: 1 }`, `{ building: 1, isActive: 1 }`

---

### 3.3 ProjectUnit

| Field                     | Type     | Required | Notes |
|---------------------------|----------|----------|--------|
| project                   | ObjectId | ✓        | ref: Newprojects |
| building                  | ObjectId |          | ref: ProjectBuilding; optional, default: null |
| layout                    | ObjectId | ✓        | ref: ProjectLayout |
| propertyType              | ObjectId | ✓        | ref: PropertyType |
| unitId                    | String   | ✓        | unique, e.g. "TOWER-A-1BHK-001" |
| unitNumber                | String   |          | e.g. "101" |
| floor                     | Number   |          | default: null |
| status                    | enum     | ✓        | see below; default: 'available' |
| statusUpdatedAt           | Date     |          | |
| statusUpdatedBy           | ObjectId |          | ref: Agents; default: null |
| statusUpdatedByAgency     | ObjectId |          | ref: Agencies; default: null |
| statusExpiresAt           | Date     |          | default: null |
| statusExpiryNotificationSent | Boolean |       | default: false |
| statusNote                | String   |          | default: null; **private** (see Privacy) |
| statusNoteVisibleTo       | Object   |          | `{ agent, agency }` refs |
| statusHistory             | [Object] |          | `{ status, changedAt, changedBy, agency, note, expiresAt }` |
| assignedAgents            | [Object] |          | `{ agent, agency, addedAt }` — all agents across all agencies |
| unitRoundRobinPointer     | Number   |          | default: 0 |
| saleInfo                  | Object   |          | **private** (see Privacy); `closedAmount`, `closedDate`, `closedBy`, `closedByAgency`, `customerName`, `customerEmail`, `customerPhone`, `documents` |
| agencyApproval            | Object   |          | `{ status: 'pending'|'approved'|'rejected', reviewedBy, reviewedAt, rejectedReason }` |
| isActive                  | Boolean  |          | default: true |
| timestamps                |          |          | true |

**Status enum:** `'available'` | `'reserved'` | `'in-progress'` | `'follow-up'` | `'pre-close'` | `'closed'`

**Indexes:**  
`{ project: 1, status: 1 }`, `{ project: 1, building: 1, layout: 1 }`, `{ layout: 1, status: 1 }`, `{ unitId: 1 }` unique,  
`{ status: 1, statusExpiresAt: 1 }` (cron), `{ 'agencyApproval.status': 1 }`, `{ 'assignedAgents.agent': 1 }`, `{ 'assignedAgents.agency': 1 }`

---

### 3.4 ProjectAgencyAllocation

Records which units the developer assigned to which agency.

| Field           | Type     | Required | Notes |
|-----------------|----------|----------|--------|
| project         | ObjectId | ✓        | ref: Newprojects |
| agency          | ObjectId | ✓        | ref: Agencies |
| allocatedBy     | ObjectId | ✓        | ref: Developers |
| units           | [ObjectId] |       | ref: ProjectUnit; same unit can be in multiple agencies |
| layoutSummary   | [Object] |          | `{ layout, building, propertyType, unitsCount }` |
| status          | enum     |          | 'active' \| 'cancelled'; default: 'active' |
| cancelledAt     | Date     |          | default: null |
| cancelledReason | String   |          | default: null |
| allocatedAt     | Date     |          | default: Date.now |
| timestamps      |          |          | true |

**Note:** No unique constraint on `{ project, agency }` — same agency can receive multiple allocation batches over time.

**Indexes:** `{ project: 1, agency: 1 }`, `{ agency: 1, status: 1 }`, `{ project: 1, status: 1 }`

---

### 3.5 ProjectAgentAllocation

Records which units the agency assigned to which agent.

| Field             | Type     | Required | Notes |
|-------------------|----------|----------|--------|
| project           | ObjectId | ✓        | ref: Newprojects |
| agency            | ObjectId | ✓        | ref: Agencies |
| agent             | ObjectId | ✓        | ref: Agents |
| allocatedBy       | ObjectId | ✓        | ref: Agencies |
| units             | [ObjectId] |       | ref: ProjectUnit; same unit can be in different agencies, **not** twice in same agency |
| layoutSummary     | [Object] |          | `{ layout, building, propertyType, unitsCount }` |
| status            | enum     |          | 'active' \| 'reallocated' \| 'cancelled'; default: 'active' |
| reallocatedTo     | ObjectId |          | ref: Agents; default: null |
| reallocatedAt     | Date     |          | default: null |
| reallocatedBy     | ObjectId |          | ref: Agencies; default: null |
| reallocatedReason | String   |          | default: null |
| allocatedAt       | Date     |          | default: Date.now |
| timestamps        |          |          | true |

**Validation (API layer):** Before assigning a unit to an agent, ensure no other **active** agent under the **same** agency already has that unit; if yes → reject.

**Indexes:** `{ project: 1, agent: 1 }`, `{ project: 1, agency: 1 }`, `{ agent: 1, status: 1 }`, `{ agency: 1, status: 1 }`

---

### 3.6 LeadAssignmentConfig

One config **per layout** — manages round robin for inquiries on that layout.

| Field          | Type     | Required | Notes |
|----------------|----------|----------|--------|
| project        | ObjectId | ✓        | ref: Newprojects |
| layout         | ObjectId | ✓        | ref: ProjectLayout; **unique** |
| method         | enum     |          | 'round-robin'; default: 'round-robin' |
| agencyQueue    | [Object] |          | See below |
| agencyPointer  | Number   |          | default: 0; next agency index |
| totalInquiries | Number   |          | default: 0 |
| timestamps     |          |          | true |

**agencyQueue item:**  
`{ agency (ObjectId), agentQueue: [{ agent, addedAt }], agentPointer (Number, default: 0), addedAt }`

**Indexes:** `{ layout: 1 }` unique, `{ project: 1 }`

---

### 3.7 NewProject — New Field

| Field         | Type    | Default | Notes |
|---------------|---------|---------|--------|
| hasBuildings  | Boolean | false   | true → show building tabs (Tower A, B); false → direct property types/layouts |

---

## 4. CONCRETE EXAMPLE: Marina Heights (With Buildings)

### 4.1 Visual Hierarchy

```
PROJECT: "Marina Heights" (_id: proj_001)  hasBuildings: true
├── Property Type: Apartment (ref: PropertyType)
│
├── BUILDING: "Tower A" (ProjectBuilding _id: bld_001)
│   ├── LAYOUT: "Type A - 1BHK" (ProjectLayout _id: lay_001)  → 15 units
│   │   ├── Unit 101 … Unit 115 (ProjectUnit)
│   │
│   └── LAYOUT: "Type B - 2BHK" (ProjectLayout _id: lay_002)  → 15 units
│       ├── Unit 201 … Unit 215
│
└── BUILDING: "Tower B" (ProjectBuilding _id: bld_002)
    └── LAYOUT: "Type C - 2BHK" (ProjectLayout _id: lay_003)  → 10 units
        ├── Unit 301 … Unit 310
```

**Total units:** 40

---

### 4.2 Newprojects (one document)

```json
{
  "_id": "proj_001",
  "projectName": "Marina Heights",
  "slug": "marina-heights",
  "developer": "dev_001",
  "hasBuildings": true,
  "totalUnits": 40,
  "availableUnits": 38,
  "soldUnits": 0,
  "reservedUnits": 2,
  "propertyTypes": ["apt_001"],
  "bedroomOptions": [1, 2],
  "authorizedAgencies": ["agency_A", "agency_B", "agency_C"],
  "publishStatus": "published",
  "publishedAt": "2025-02-10T12:00:00.000Z",
  "isActive": true
}
```

---

### 4.3 ProjectBuilding

**Tower A:**
```json
{
  "_id": "bld_001",
  "project": "proj_001",
  "propertyType": "apt_001",
  "buildingName": "Tower A",
  "isActive": true
}
```

**Tower B:**
```json
{
  "_id": "bld_002",
  "project": "proj_001",
  "propertyType": "apt_001",
  "buildingName": "Tower B",
  "isActive": true
}
```

---

### 4.4 ProjectLayout (with startingPrice and auto-computed counts)

**Type A - 1BHK (Tower A):**
```json
{
  "_id": "lay_001",
  "project": "proj_001",
  "building": "bld_001",
  "propertyType": "apt_001",
  "layoutName": "Type A - 1BHK",
  "bedrooms": 1,
  "bathrooms": 2,
  "areaSqft": 850,
  "startingPrice": { "amount": 850000, "currency": "AED" },
  "floorPlans": ["/uploads/floorplan-type-a.png"],
  "totalUnits": 15,
  "availableUnits": 13,
  "reservedUnits": 2,
  "soldUnits": 0,
  "isActive": true
}
```

*(Type B and Type C layouts follow same structure with `building`, `layoutName`, `bedrooms`, `areaSqft`, `startingPrice`, `floorPlans`, and counts.)*

---

### 4.5 ProjectUnit (sample — full status and assignedAgents)

**Unit 101 (available, assigned to Agency A / Agent A1):**
```json
{
  "_id": "u101",
  "project": "proj_001",
  "building": "bld_001",
  "layout": "lay_001",
  "propertyType": "apt_001",
  "unitId": "TOWER-A-1BHK-001",
  "unitNumber": "101",
  "floor": 1,
  "status": "available",
  "statusUpdatedAt": null,
  "statusUpdatedBy": null,
  "statusUpdatedByAgency": null,
  "statusExpiresAt": null,
  "statusExpiryNotificationSent": false,
  "statusNote": null,
  "statusNoteVisibleTo": null,
  "statusHistory": [],
  "assignedAgents": [
    { "agent": "agent_A1", "agency": "agency_A", "addedAt": "2025-02-11T09:00:00.000Z" }
  ],
  "unitRoundRobinPointer": 0,
  "saleInfo": null,
  "agencyApproval": { "status": "pending" },
  "isActive": true
}
```

**Unit 106 (reserved, Agency B / Agent B1):**
```json
{
  "_id": "u106",
  "project": "proj_001",
  "building": "bld_001",
  "layout": "lay_001",
  "propertyType": "apt_001",
  "unitId": "TOWER-A-1BHK-006",
  "unitNumber": "106",
  "floor": 1,
  "status": "reserved",
  "statusUpdatedAt": "2025-02-14T10:00:00.000Z",
  "statusUpdatedBy": "agent_B1",
  "statusUpdatedByAgency": "agency_B",
  "statusExpiresAt": "2025-02-21T10:00:00.000Z",
  "statusExpiryNotificationSent": false,
  "statusNote": null,
  "statusNoteVisibleTo": null,
  "statusHistory": [
    { "status": "reserved", "changedAt": "2025-02-14T10:00:00.000Z", "changedBy": "agent_B1", "agency": "agency_B", "note": null, "expiresAt": "2025-02-21T10:00:00.000Z" }
  ],
  "assignedAgents": [
    { "agent": "agent_B1", "agency": "agency_B", "addedAt": "2025-02-11T10:00:00.000Z" }
  ],
  "unitRoundRobinPointer": 0,
  "saleInfo": null,
  "agencyApproval": { "status": "pending" },
  "isActive": true
}
```

**Unit 201 (in-progress, with private note — Agency A / Agent A1):**
```json
{
  "_id": "u201",
  "project": "proj_001",
  "building": "bld_001",
  "layout": "lay_002",
  "propertyType": "apt_001",
  "unitId": "TOWER-A-2BHK-201",
  "unitNumber": "201",
  "floor": 2,
  "status": "in-progress",
  "statusUpdatedAt": "2025-02-13T14:00:00.000Z",
  "statusUpdatedBy": "agent_A1",
  "statusUpdatedByAgency": "agency_A",
  "statusExpiresAt": "2025-02-23T14:00:00.000Z",
  "statusExpiryNotificationSent": false,
  "statusNote": "Customer visiting next week",
  "statusNoteVisibleTo": { "agent": "agent_A1", "agency": "agency_A" },
  "statusHistory": [
    { "status": "reserved", "changedAt": "2025-02-12T09:00:00.000Z", "changedBy": "agent_A1", "agency": "agency_A", "note": null, "expiresAt": "2025-02-19T09:00:00.000Z" },
    { "status": "in-progress", "changedAt": "2025-02-13T14:00:00.000Z", "changedBy": "agent_A1", "agency": "agency_A", "note": "Customer visiting next week", "expiresAt": "2025-02-23T14:00:00.000Z" }
  ],
  "assignedAgents": [
    { "agent": "agent_A1", "agency": "agency_A", "addedAt": "2025-02-11T09:00:00.000Z" }
  ],
  "unitRoundRobinPointer": 0,
  "saleInfo": null,
  "agencyApproval": { "status": "pending" },
  "isActive": true
}
```

---

### 4.6 ProjectAgencyAllocation (layoutSummary uses unitsCount)

**Agency A:**
```json
{
  "_id": "alloc_agency_A",
  "project": "proj_001",
  "agency": "agency_A",
  "allocatedBy": "dev_001",
  "units": ["u101", "u102", "u103", "u104", "u105", "u201", "u202", "u203", "u204", "u205"],
  "layoutSummary": [
    { "layout": "lay_001", "building": "bld_001", "propertyType": "apt_001", "unitsCount": 5 },
    { "layout": "lay_002", "building": "bld_001", "propertyType": "apt_001", "unitsCount": 5 }
  ],
  "status": "active",
  "cancelledAt": null,
  "cancelledReason": null,
  "allocatedAt": "2025-02-10T12:00:00.000Z"
}
```

*(Agency B and C follow same structure with their `units` and `layoutSummary` with `unitsCount`.)*

---

### 4.7 ProjectAgentAllocation

**Agent A1 (Agency A):**
```json
{
  "_id": "alloc_agent_A1",
  "project": "proj_001",
  "agency": "agency_A",
  "agent": "agent_A1",
  "allocatedBy": "agency_A",
  "units": ["u101", "u102", "u103", "u201", "u202", "u203"],
  "layoutSummary": [
    { "layout": "lay_001", "building": "bld_001", "propertyType": "apt_001", "unitsCount": 3 },
    { "layout": "lay_002", "building": "bld_001", "propertyType": "apt_001", "unitsCount": 3 }
  ],
  "status": "active",
  "reallocatedTo": null,
  "reallocatedAt": null,
  "reallocatedBy": null,
  "reallocatedReason": null,
  "allocatedAt": "2025-02-11T09:00:00.000Z"
}
```

*(Other agents follow same structure.)*

---

### 4.8 LeadAssignmentConfig (one per layout — two-level round robin)

**Layout Type A - 1BHK (lay_001):**
```json
{
  "_id": "lead_config_lay_001",
  "project": "proj_001",
  "layout": "lay_001",
  "method": "round-robin",
  "agencyQueue": [
    {
      "agency": "agency_A",
      "agentQueue": [
        { "agent": "agent_A1", "addedAt": "2025-02-10T12:00:00.000Z" },
        { "agent": "agent_A2", "addedAt": "2025-02-10T12:00:00.000Z" }
      ],
      "agentPointer": 0,
      "addedAt": "2025-02-10T12:00:00.000Z"
    },
    {
      "agency": "agency_B",
      "agentQueue": [
        { "agent": "agent_B1", "addedAt": "2025-02-10T12:00:00.000Z" }
      ],
      "agentPointer": 0,
      "addedAt": "2025-02-10T12:00:00.000Z"
    },
    {
      "agency": "agency_C",
  "agentQueue": [
        { "agent": "agent_C1", "addedAt": "2025-02-10T12:00:00.000Z" },
        { "agent": "agent_C2", "addedAt": "2025-02-10T12:00:00.000Z" }
      ],
      "agentPointer": 0,
      "addedAt": "2025-02-10T12:00:00.000Z"
    }
  ],
  "agencyPointer": 0,
  "totalInquiries": 0,
  "createdAt": "2025-02-10T12:00:00.000Z",
  "updatedAt": "2025-02-10T12:00:00.000Z"
}
```

*(Separate LeadAssignmentConfig docs for lay_002 and lay_003.)*

---

## 5. COMPLETE FLOWS

### 5.1 Developer Flow

| Step | Action | Endpoint / Logic |
|------|--------|-------------------|
| 1 | Create project | `POST /api/developer/projects/create` → `publishStatus: 'unpublished'`, set `hasBuildings` at creation |
| 2a | Add buildings (only if `hasBuildings: true`) | `POST /api/developer/projects/:id/buildings` body: `{ propertyType, buildingName }` → create ProjectBuilding |
| 2b | Add layouts | If hasBuildings: `POST /api/developer/projects/:id/buildings/:buildingId/layouts`; else: `POST /api/developer/projects/:id/layouts`. Body: `{ layoutName, bedrooms, bathrooms, areaSqft, startingPrice, floorPlans, totalUnits }` → create ProjectLayout; **auto-create** `totalUnits` ProjectUnit records with sequential unitIds; **auto-create** LeadAssignmentConfig for this layout (empty queues); update NewProject: `bedroomOptions`, `propertyTypes`, `totalUnits`, `availableUnits`, `launchPrice` |
| 3 | Assign units to agencies | `POST /api/developer/projects/:id/assign-agencies` body: `{ assignments: [{ unitIds: [...], agencyIds: [...] }] }` → create ProjectAgencyAllocation; add agency to LeadAssignmentConfig.agencyQueue; add to NewProject.authorizedAgencies |
| 4 | Publish project | `PUT /api/developer/projects/:id/status` body: `{ status: 'published' }` → only if `authorizedAgencies.length > 0`; set `publishStatus: 'published'`, `publishedAt: Date.now` |

---

### 5.2 Agency Flow

| Step | Action | Endpoint / Logic |
|------|--------|-------------------|
| 1 | View unallocated units | `GET /api/agency/project-allocations/unallocated` → ProjectAgencyAllocation where agency = this agency, status = 'active', with units not yet in any ProjectAgentAllocation for this agency |
| 2 | Assign units to agents | `POST /api/agency/project-allocations/:projectId/assign-agents` body: `{ assignments: [{ unitIds: [...], agentId }] }`. **Validation:** for each unitId, no other active agent under same agency has it. On success: create ProjectAgentAllocation; update ProjectUnit.assignedAgents; update LeadAssignmentConfig.agencyQueue for this agency (add agent to agentQueue); notify agent |
| 3 | Reallocate unit to another agent | `PUT /api/agency/project-allocations/:allocationId/reallocate` body: `{ newAgentId, reason }` → old allocation status 'reallocated', set reallocatedTo/At/By/Reason; create new ProjectAgentAllocation for new agent; ProjectUnit.assignedAgents: remove old, add new; LeadAssignmentConfig: update agentQueue (remove old, add new); notify new agent; old agent loses access immediately |

---

### 5.3 Agent Flow

| Step | Action | Endpoint / Logic |
|------|--------|-------------------|
| 1 | View allocated units | `GET /api/agent/project-units` query: `{ projectId, status, page, limit }` → ProjectAgentAllocation (agent = this agent, status = 'active') → return units with global status |
| 2 | Update unit status | `PUT /api/agent/project-units/:unitId/status` body: `{ status, note }`. **Rules:** agent must be in ProjectUnit.assignedAgents; flow: available → reserved → in-progress → follow-up → pre-close (no skip, no backward); 'in-progress' requires note; 'closed' only by agency. On success: update ProjectUnit (status, statusUpdatedAt/By/ByAgency, statusExpiresAt: reserved +7d, in-progress +10d, follow-up +20d, pre-close null); set statusNote + statusNoteVisibleTo if in-progress; push statusHistory; reset statusExpiryNotificationSent |
| 3 | Submit pre-close (sale details) | `POST /api/agent/project-units/:unitId/pre-close` body: `customerName, customerEmail, customerPhone, closedAmount, closedDate, documents` → status 'pre-close'; save saleInfo; agencyApproval.status 'pending'; notify agency |

---

### 5.4 Agency Approval Flow

| Step | Action | Endpoint / Logic |
|------|--------|-------------------|
| 1 | View pending approvals | `GET /api/agency/project-units/pending-approval` → ProjectUnit where agencyApproval.status = 'pending' and saleInfo.closedByAgency = this agency |
| 2 | Approve or reject | `PUT /api/agency/project-units/:unitId/approve-sale` body: `{ isApproved, rejectedReason }`. **If approved:** status → 'closed' (permanent); agencyApproval → approved, reviewedBy, reviewedAt; sync ProjectLayout and NewProject (soldUnits++, availableUnits--); notify agent. **If rejected:** agencyApproval → rejected, rejectedReason; status → 'follow-up'; notify agent |

---

### 5.5 Lead Assignment — Round Robin (per layout)

**Trigger:** Customer clicks Inquire on a **Layout**.

1. Get LeadAssignmentConfig for this layout.
2. Current agency = `agencyQueue[agencyPointer]`.
3. Current agent = that agency’s `agentQueue[agentPointer]`.
4. Assign inquiry to this agent; create Inquiry record; notify this agent only.
5. Advance **agentPointer** within current agency: `(agentPointer + 1) % agentQueue.length`.
6. Advance **agencyPointer**: `(agencyPointer + 1) % agencyQueue.length`.
7. Increment `totalInquiries`; save config.

**Example (Layout Type 13-1309):**  
Agency A: [Raj, Kumar], Agency B: [Dinesh, Suresh], Agency C: [Ganesh, Babu, Kaviya, Divya].  
Inquiry 1→A→Raj, 2→B→Dinesh, 3→C→Ganesh, 4→A→Kumar, 5→B→Suresh, 6→C→Babu, 7→A→Raj, … (cycle).

---

### 5.6 Cron Jobs

**CRON 1 — Unit status auto-release (e.g. hourly)**  
Find ProjectUnit where status in `['reserved','in-progress','follow-up']`, `statusExpiresAt <= now`, `isActive: true`.  
For each unit:  
- If `statusExpiryNotificationSent === false`: send notification to agent, set `statusExpiryNotificationSent: true`, extend statusExpiresAt (reserved +1d, in-progress +2d, follow-up +5d).  
- Else: set status → 'available'; clear statusUpdatedBy/ByAgency, statusExpiresAt, statusNote, statusNoteVisibleTo; reset statusExpiryNotificationSent; push statusHistory; notify agent (auto-released).

**CRON 2 — Sync unit counts (after any unit status change)**  
For the affected layout: recount from ProjectUnit (totalUnits, availableUnits, reservedUnits, soldUnits); update ProjectLayout and NewProject; update NewProject.launchPrice (min startingPrice across layouts).

---

## 6. PRIVACY RULES (enforce in API response layer)

| Data | Visible to |
|------|------------|
| Unit status | All agents assigned to that unit (same value for everyone). |
| Status note (in-progress) | Only `statusNoteVisibleTo.agent` and `statusNoteVisibleTo.agency`; others get `note: null`. |
| Sale info (saleInfo) | Only `saleInfo.closedBy` (agent) and `saleInfo.closedByAgency` (agency); others see status 'closed' and `saleInfo: null`. |

---

## 7. KEY BUSINESS RULES SUMMARY

1. Same unit → multiple agencies: **allowed**.
2. Same unit → multiple agents from **different** agencies: **allowed**.
3. Same unit → multiple agents from **same** agency: **not allowed**.
4. Project publish requires at least one agency assigned.
5. Unit status is **global** across all agents on that unit.
6. Status note is **private** (in-progress only).
7. Sale info is **private** (only closing agent + agency).
8. **Closed** status is permanent — never auto-released.
9. Only agency can approve PreClose → mark as Closed.
10. Reallocation = immediate access change.
11. Round robin = agency first, then agent within agency; **per layout**.
12. LeadAssignmentConfig is **one per layout** (not per project).

---

## 8. Link Summary & How to Follow in Code

```
                    Newprojects (hasBuildings, authorizedAgencies, …)
                           │
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
   ProjectBuilding   ProjectLayout (building optional)   LeadAssignmentConfig (per layout)
         │                 │
         └────────┬────────┘
                  ▼
            ProjectUnit (status, assignedAgents, saleInfo, agencyApproval)
                  │
    ┌─────────────┼─────────────┐
    ▼             ▼             ▼
ProjectAgencyAllocation   ProjectAgentAllocation
  (developer → agency)      (agency → agent)
```

| Question | How to get it |
|----------|----------------|
| All units of a project | `ProjectUnit.find({ project: projectId })` |
| All buildings of a project | `ProjectBuilding.find({ project: projectId })` |
| All layouts of a building | `ProjectLayout.find({ building: buildingId })` |
| All layouts of a project (no building) | `ProjectLayout.find({ project: projectId, building: null })` |
| All units of a layout | `ProjectUnit.find({ layout: layoutId })` |
| Which agencies have this project? | `ProjectAgencyAllocation.find({ project: projectId, status: 'active' })` → agency + units |
| Which agents of an agency have units? | `ProjectAgentAllocation.find({ project, agency, status: 'active' })` → agent + units |
| All units assigned to an agent | `ProjectAgentAllocation` with agent + status 'active' → doc.units |
| Who gets next lead for a layout? | `LeadAssignmentConfig.findOne({ layout })` → agencyQueue[agencyPointer], then agentQueue[agentPointer]; advance pointers after assignment |

---

This document is the single source of truth for implementing the project allocation and lead assignment system.
