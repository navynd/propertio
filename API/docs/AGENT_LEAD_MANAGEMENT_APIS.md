# Agent Inquiries API Specification

This document defines the **5 agent inquiry APIs** for the Agent Lead Management section. These APIs apply to **both property and project inquiries** (same endpoints; behaviour differs by `inquiryCategory` on the inquiry).

---

## 1. List inquiries

**Purpose:** Populate the Leads Management table for each tab (New / Attended / Closed / Closed Sale-Rent) and sub-tabs. Works for both **property** and **project** inquiries.

| #   | Method | Endpoint                  | Query params                                                                                 | Response                               | Screen         |
| --- | ------ | ------------------------- | -------------------------------------------------------------------------------------------- | -------------------------------------- | -------------- |
| 1.1 | GET    | `/api/agents/inquiries`   | `status`, `type`, `inquiryCategory`, `propertyId`, `projectId`, `search`, `startDate`, `endDate`, `page`, `limit` | `{ success, inquiries, pagination, counts? }` | All list views |


**Query parameters:**

| Param              | Type              | Description                                                                                  |
| ------------------ | ----------------- | -------------------------------------------------------------------------------------------- |
| `status`           | string            | `new` \| `attended` \| `closed` \| `closed-sale-rent`. Matches main tabs.                     |
| `type`             | string            | `call` \| `email` \| `whatsapp`. (Project inquiries are whatsapp only.)                       |
| `inquiryCategory`  | string            | Optional. `property` \| `project` – filter by category.                                      |
| `propertyId`       | string (ObjectId) | Optional. Filter by property (property inquiries only).                                       |
| `projectId`        | string (ObjectId) | Optional. Filter by project (project inquiries only).                                         |
| `transactionType`  | string            | For **Closed Sale/Rent** tab: `sale` \| `rent`.                                                |
| `search`           | string            | Search in customer name, email, phone, property/project title, message.                     |
| `startDate`        | string (ISO date) | Date range filter.                                                                            |
| `endDate`          | string (ISO date) | Date range filter.                                                                            |
| `page`             | integer           | Pagination, default 1.                                                                       |
| `limit`            | integer           | Items per page, default 10, max 50.                                                          |


**Response:**

- `inquiries`: array of inquiry objects (each includes subject: **property** or **project** + unit for projects, plus customer, dates, status, dealClosed when applicable).
- `pagination`: `{ page, limit, total, pages }`.
- `counts` (optional): e.g. `{ new, attended, closed, closedSaleRent }` for tab badges.

**Per inquiry in list:** `id`, `inquiryCategory`, `inquiryType`, `message` (snippet), `status`, `inquiredAt` / `attendedAt` / `closedAt`, subject (property or project + unit), customer summary, `dealClosed` when closed as deal.

---

## 2. Get single inquiry details

**Purpose:** Full inquiry detail page: subject (property or project), customer, and actions. Works for both **property** and **project** inquiries.

| #   | Method | Endpoint                    | Response                                    | Screen              |
| --- | ------ | --------------------------- | -------------------------------------------- | ------------------- |
| 2.1 | GET    | `/api/agents/inquiries/:id` | `{ success, inquiry, property?, project?, unit?, customer }` | Lead details page   |


**Response:**

- **inquiry:** `id`, `inquiryCategory`, `inquiryType`, `message`, `status`, `inquiredAt`, `attendedAt`, `closedAt`, `source`, `dealClosed` (if closed as deal), `notes`, `statusHistory`, etc.
- **customer:** `name`, `email`, `phoneNumber`, `userId` (if any).
- **property** (when `inquiryCategory === 'property'`): populated property for detail page (title, slug, description, location, listingType, propertyType, bedrooms, bathrooms, area, price, images, videoTour, virtualTour360, amenities, dldPermitNumber, dldPermitUrl, etc.).
- **project** (when `inquiryCategory === 'project'`): populated project; **unit**: populated project unit when applicable.

**Auth:** Only inquiries where `agent` equals the authenticated agent.

---

## 3. Update inquiry status (attend or close inquiry)

**Purpose:** "Move to attended" (New) and "Close inquiry" (Attended). Same endpoint for **property** and **project** inquiries.

| #   | Method | Endpoint                           | Body                                    | Response            | Screen                   |
| --- | ------ | ---------------------------------- | --------------------------------------- | ------------------- | ------------------------ |
| 3.1 | POST   | `/api/agents/inquiries/:id/status` | `{ type, notes?, reason? }`             | `{ success, inquiry }` | New & Attended list/detail |


**Body:**

| Field    | Type   | Required | Description                                                                 |
| -------- | ------ | -------- | --------------------------------------------------------------------------- |
| `type`   | string | yes      | `attend` \| `close-inquiry`.                                                |
| `notes`  | string | no       | Optional note (stored in `statusHistory` or `notes` array).                 |
| `reason` | string | no       | Optional reason (for close-inquiry).                                        |

**Behaviour:** Same as current spec: attend sets `status = 'attended'`, `attendedAt = now`; close-inquiry sets `status = 'closed'`, `closedAt = now`, `dealClosed.isClosed` remains false. Optional notes/reason stored.

---

## 4. Close the deal

**Purpose:** Record a successful deal (sale/rent). Same for **property** and **project** inquiries.

| #   | Method | Endpoint                                | Body                                                                 | Response            | Screen                 |
| --- | ------ | --------------------------------------- | -------------------------------------------------------------------- | ------------------- | ---------------------- |
| 4.1 | POST   | `/api/agents/inquiries/:id/close-deal`  | `{ dealType, dealAmount, currency?, commission?, closedDate?, notes? }` | `{ success, inquiry }` or `{ success, deal }` | Close the deal modal  |


**Body:**

| Field         | Type   | Required | Description                                      |
| ------------- | ------ | -------- | ------------------------------------------------ |
| `dealType`    | string | yes      | `sale` \| `rent`.                                |
| `dealAmount`  | number | yes      | Deal amount.                                     |
| `currency`    | string | no       | Default `"AED"`.                                  |
| `commission`  | number | no       | Commission amount.                                |
| `closedDate`  | string (ISO date) | no | Default `now` if omitted.                         |
| `notes`       | string | no       | Stored in `dealClosed.notes`.                     |


**Behaviour:** Set `status = 'closed'`, `closedAt = closedDate || now`, `dealClosed = { isClosed: true, dealType, dealAmount, currency, commission, closedDate, closedBy: agentId, notes }`. Return updated inquiry (or deal summary).

---

## 5. Delete inquiry (optional)

**Purpose:** Delete an inquiry (if product allows). Same for **property** and **project**.

| #   | Method | Endpoint                    | Response                                | Screen              |
| --- | ------ | --------------------------- | ---------------------------------------- | ------------------- |
| 5.1 | DELETE | `/api/agents/inquiries/:id` | `{ success }` or `{ success, message }`  | Lead details header |


**Behaviour:** Soft-delete or hard-delete; only the assigned agent (or agency) can delete.

---

## 6. Summary table (all 5 APIs)

| #   | Method | Endpoint                              | Purpose                                                                 |
| --- | ------ | ------------------------------------- | ----------------------------------------------------------------------- |
| 1   | GET    | `/api/agents/inquiries`               | List inquiries (property + project); filters: status, type, category, propertyId, projectId, search, date, pagination. |
| 2   | GET    | `/api/agents/inquiries/:id`           | Get full inquiry details (inquiry, property or project+unit, customer). |
| 3   | POST   | `/api/agents/inquiries/:id/status`    | Attend or close inquiry; body `{ type, notes?, reason? }`.             |
| 4   | POST   | `/api/agents/inquiries/:id/close-deal`| Close the deal; body `{ dealType, dealAmount, currency?, commission?, closedDate?, notes? }`. |
| 5   | DELETE | `/api/agents/inquiries/:id`           | Delete inquiry (optional).                                                |

---

## 7. Mapping UI → API

| UI element                       | API / param                                                                                   |
| ------------------------------- | --------------------------------------------------------------------------------------------- |
| Tabs: New / Attended / Closed / Closed Sale-Rent | `GET /api/agents/inquiries?status=...`                                         |
| Sub-tabs: Call / Email / WhatsApp | `type=call|email|whatsapp`                                                                  |
| Filter by property/project      | `propertyId`, `projectId`, `inquiryCategory`                                                   |
| "Move to attended"              | `POST /api/agents/inquiries/:id/status` body `{ type: 'attend', notes? }`                     |
| "Close inquiry"                 | `POST /api/agents/inquiries/:id/status` body `{ type: 'close-inquiry', notes?, reason? }`     |
| "Close the deal"                | `POST /api/agents/inquiries/:id/close-deal` body `{ dealType, dealAmount, ... }`              |
| "Delete"                        | `DELETE /api/agents/inquiries/:id`                                                            |

---

## 8. Model readiness (before implementing)

Before implementing these 5 APIs, confirm the following. **No mandatory schema changes are required**; the existing models already support both property and project inquiries.

### Inquirys model

- **Already supports both property and project:** `inquiryCategory` (`property` | `project`), conditional `property` / `project` + `unit` refs, `dealClosed` with `dealType`, `dealAmount`, `currency`, `commission`, `closedDate`, `notes`.
- **Suggested check:** Ensure `dealClosed.currency` exists (default `'AED'`) and `dealClosed.commission` exists – both are present in the current schema.
- **Indexes:** Existing indexes are sufficient for list by agent, status, property, project, and dates. Optional: add compound index `{ agent: 1, property: 1, status: 1 }` and `{ agent: 1, project: 1, status: 1 }` if you filter often by `propertyId`/`projectId`; otherwise in-memory filter is fine.

### Properties model

- **No change required.** Inquiries are queried from the Inquirys collection by `agent` and optional `property`. Properties do not need a backward ref to Inquirys. The existing `inquiries` count field can stay as-is (updated when creating/closing inquiries if you want dashboard counts).

### Newprojects model

- **No change required.** Same as properties: Inquirys are queried by `project` (and `unit`). Newprojects already has an `inquiries` count field; no ref array needed.

### Summary

| Model      | Update required? | Notes                                                                 |
| ---------- | ----------------- | --------------------------------------------------------------------- |
| **Inquirys**  | No                | Already has inquiryCategory, property/project/unit, status, dealClosed (incl. currency, commission, closedDate). |
| **Properties**| No                | No backward ref needed; optional: keep `inquiries` count in sync.     |
| **Newprojects** | No             | No backward ref needed; optional: keep `inquiries` count in sync.      |

---

## 9. Alignment with existing Inquirys schema

- `status`: `'new' | 'attended' | 'closed'`
- `inquiryType`: `'call' | 'email' | 'whatsapp'` (project: whatsapp only)
- `inquiryCategory`: `'property' | 'project'`
- `dealClosed`: `{ isClosed, dealType, dealAmount, currency, commission, closedDate, closedBy, notes }`
- All agent endpoints must restrict to `agent` (or agency) = authenticated agent.

**closed-sale-rent** in UI = inquiries where `status === 'closed'` and `dealClosed.isClosed === true`.  
**closed** (third tab) = `status === 'closed'` and `dealClosed.isClosed !== true`.

---

## 10. Integration points

- **Property/Project detail:** For GET by id, populate `property` or `project` (and `unit` for projects) so the frontend can render the same detail layout for both.
- **Media URLs:** Use existing S3/CloudFront (or upload service) for property/project images and video.
- **Notifications:** Optional: trigger notifications on status change or close-deal.
