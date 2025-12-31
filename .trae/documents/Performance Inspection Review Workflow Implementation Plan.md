# Implementation Plan: Quality Inspection Workbench

## 1. Backend Implementation
### 1.1 Create Dashboard Route
*   **File**: `server/routes/inspectionDashboard.js`
*   **Endpoints**:
    *   `GET /summary`: Aggregated stats (Pending, Drafts, Today, NG).
    *   `GET /tasks`: Unified task list with pagination and search.
    *   `POST /batch-audit`: Batch approve/reject logic.

### 1.2 Register Route
*   **File**: `server/app.js` (or `index.js`)
*   **Action**: Mount `/api/inspection/dashboard` to the new router.

## 2. Frontend Implementation
### 2.1 API Service
*   **File**: `frontend/src/api/inspectionDashboard.js`
*   **Action**: Define Axios methods for the new endpoints.

### 2.2 Dashboard Component
*   **File**: `frontend/src/views/quality/inspection/InspectionDashboard.vue`
*   **Layout**:
    *   **Header**: Search bar + Personal Greeting.
    *   **Left Column (70%)**:
        *   Stats Cards (Grid of 4).
        *   Tabs (Pending, My Reports, Recent NG).
        *   Task Table (with Batch Actions).
    *   **Right Column (30%)**:
        *   Quick Actions (Buttons).
        *   Mini Charts (ECharts).

### 2.3 Router Configuration
*   **File**: `frontend/src/router/index.js`
*   **Action**:
    *   Add `/admin/inspection/dashboard`.
    *   Redirect `/admin/inspection` to dashboard.

## 3. Execution Order
1.  Create Backend Route File.
2.  Register Backend Route.
3.  Create Frontend API File.
4.  Create Frontend Dashboard Component.
5.  Update Frontend Router.
6.  Verify.