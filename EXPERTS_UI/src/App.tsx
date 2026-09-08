import { BrowserRouter, Routes, Route } from "react-router-dom";
import './App.css'
import DeveloperIndex from "./pages/Developer/DeveloperIndex";
import Login from "./pages/AccountSection/Login";
import DashboardDeveloper from "./pages/Developer/Dashboard/Dashboard";
import AgencyDashboard from "./pages/Agency/Dashboard/AgencyDashboard";
import AgentDashboard from "./pages/Agent/Dashboard/AgentDashboard";
import DeveloperProfile from "./pages/Developer/Profile/Profile";
import AgentProfile from "./pages/Agent/Profile/Profile";
import AgencyProfile from "./pages/Agency/Profile/Profile";
import AgentIndex from "./pages/Agent/AgentIndex";
import AgencyIndex from "./pages/Agency/AgencyIndex";
import DeveloperProfileCreate from "./pages/ProfileCreate/DeveloperProfile";
import AgentProfileCreate from "./pages/ProfileCreate/AgentProfile";
import AgencyProfileCreate from "./pages/ProfileCreate/AgencyProfile";
import ProjectManagement from "./pages/Developer/ProjectManagement/ProjectManagement";
import RevenueManagement from "./pages/Developer/RevenueManagement/RevenueManagement";
import ProjectDetails from "./pages/Developer/ProjectManagement/ProjectDetails";
import RevenueDetails from "./pages/Developer/RevenueManagement/RevenueDetails";
import Units from "./pages/Developer/ProjectManagement/Units/Units";
import UnitsDetails from "./pages/Developer/ProjectManagement/Units/UnitsDetails";
import UnitEdit from "./pages/Developer/ProjectManagement/Units/UnitEdit";
import AssignAgencies from "./pages/Developer/ProjectManagement/AssignAgenci/AssignAgencies";
import ReviewAssignment from "./pages/Developer/ProjectManagement/AssignAgenci/ReviewAssignment";
import UnitAssign from "./pages/Developer/ProjectManagement/Units/UnitAssign";
import UnitEditAssign from "./pages/Developer/ProjectManagement/Units/UnitEditAssign";
import AddProject from "./pages/Developer/ProjectManagement/AddProject/AddProject";
import EditProject from "./pages/Developer/ProjectManagement/EditProject/EditProject";
import SuperAgent from "./pages/Agency/SuperAgent/SuperAgent";
import SuperAgentDetail from "./pages/Agency/SuperAgent/SuperAgentDetail";
import ActiveProjectDetail from "./pages/Developer/ProjectManagement/ActiveProject/ActiveProjectDetail";
import UnPublishedDetail from "./pages/Developer/ProjectManagement/UnPublished/UnPublishedDetail";
import SuperAgentEdit from "./pages/Agency/SuperAgent/SuperAgentEdit";
import PropertyAllocation from "./pages/Agency/Allocation/PropertyAllocation/PropertyAllocation";
import ProjectAllocation from "./pages/Agency/Allocation/ProjectAllocation/ProjectAllocation";
import ListingManagement from "./pages/Agency/ListingManagement/ListingManagemnt";
import AgencyEditProperty from "./pages/Agency/ListingManagement/EditProperty/EditProperty";
import ListingDetails from "./pages/Agency/ListingManagement/ListingDetails";
import PropertyLeads from "./pages/Agency/LeadsManagement/PropertyLeads/PropertyLeads";
import PropertyLeadsDetail from "./pages/Agency/LeadsManagement/PropertyLeads/PropertyLeadsDetail";
import ProjectLeads from "./pages/Agency/LeadsManagement/ProjectLeads/ProjectLeads";
import ProjectLeadsDetail from "./pages/Agency/LeadsManagement/ProjectLeads/ProjectLeadsDetail";
import ViewProjectDetails from "./pages/Agency/LeadsManagement/ProjectLeads/ViewProjectDetails";
import AllocatedProperty from "./pages/Agent/Allocated/AllocatedProperty/AllocatedProperty";
import AllocatedProject from "./pages/Agent/Allocated/AllocatedProject/AllocatedProject";
import AllocatedProjectDetail from "./pages/Agent/Allocated/AllocatedProject/AllocatedProjectDetail";
import AllocatedProjectUnits from "./pages/Agent/Allocated/AllocatedProject/AllocatedProjectUnits";
import AllocatedProjectUnitDetail from "./pages/Agent/Allocated/AllocatedProject/AllocatedProjectUnitDetail";
import ProjectAllocationDetail from "./pages/Agency/Allocation/ProjectAllocation/ProjectAllocationDetail";
import ProjectAllocationUnit from "./pages/Agency/Allocation/ProjectAllocation/ProjectAllocationUnit/ProjectAllocationUnit";
import UnitAssignAgent from "./pages/Agency/Allocation/ProjectAllocation/ProjectAssignAgent";
import ProjectAssignAgent from "./pages/Agency/Allocation/ProjectAllocation/ProjectAssignAgent";
import ProjectReviewAssign from "./pages/Agency/Allocation/ProjectAllocation/ProjectReviewAssign";
import ProjectAllocationUnitDetail from "./pages/Agency/Allocation/ProjectAllocation/ProjectAllocationUnit/ProjectAllocationUnitDetail";
import ProjectAssignEditTab from "./pages/Agency/Allocation/ProjectAllocation/ProjectAssignEditTab";
import LeadsProject from "./pages/Agent/LeadsManagement/ProjectLeads/LeadsProject";
import LeadsProjectDetail from "./pages/Agent/LeadsManagement/ProjectLeads/LeadsProjectDetail";
import LeadsViewProjectDetails from "./pages/Agent/LeadsManagement/ProjectLeads/LeadsViewProjectDetails";
import PropertiesManagement from "./pages/Agent/PropertiesManagement/PropertiesManagement";
import PropertiesMangeDetail from "./pages/Agent/PropertiesManagement/PropertiesMangeDetail";
import PropertiesEdit from "./pages/Agent/PropertiesManagement/PropertiesEdit";
import LeadsProperty from "./pages/Agent/LeadsManagement/PropertyLeads/LeadsProperty";
import AgentPropertyLeadsDetail from "./pages/Agent/LeadsManagement/PropertyLeads/LeadsPropertyDetail";
import LeadsPropertyDetail from "./pages/Agent/LeadsManagement/PropertyLeads/LeadsPropertyDetail";
import Subscription from "./pages/Agency/Subscription/Subscription";
import SoldOutProjectDetail from "./pages/Developer/ProjectManagement/SoldOut/SoldOutProjectDetail";
import Checkout from "./pages/Agency/Subscription/Checkout";
import AddProperty from "./pages/Agent/PropertiesManagement/AddProperty/AddProperty";
import EditProperty from "./pages/Agent/PropertiesManagement/EditProperty/EditProperty";
import ProtectedRoute from "./routes/ProtectedRoute";
import Logout from "./pages/AccountSection/Logout";
import DeveloperNotification from "./pages/Developer/Notification/DeveloperNotification";
import AgencyNotification from "./pages/Agency/Notification/AgencyNotification";
import AgentNotification from "./pages/Agent/Notification/AgentNotification";

function App() {

  return (
    <>
      <div className="whole_app">
        <BrowserRouter basename="/expert">
          <Routes>
            <Route
              element={
                <ProtectedRoute allowedRoles={["developer"]}>
                  <DeveloperIndex />
                </ProtectedRoute>
              }
            >
              <Route path="/developer/dashboard" element={<DashboardDeveloper />} />
              <Route path="/developer/profile" element={<DeveloperProfile />} />
              <Route path="/developer/notification" element={<DeveloperNotification />} />
              <Route path="/developer/project-management" element={<ProjectManagement />} />
              <Route path="/developer/revenue-management" element={<RevenueManagement />} />
              <Route path="/developer/revenue-details" element={<RevenueDetails />} />
              <Route path="/developer/unpublished-project-details" element={<UnPublishedDetail />} />
              <Route path="/developer/active-project-details" element={<ActiveProjectDetail />} />
              <Route path="/developer/soldout-project-details" element={<SoldOutProjectDetail />} />
              <Route path="/developer/units" element={<Units />} />
              <Route path="/developer/units-details" element={<UnitsDetails />} />
              <Route path="/developer/units-edit" element={<UnitEdit />} />
              <Route path="/developer/units-assign" element={<UnitAssign />} />
              <Route path="/developer/units-edit-assign" element={<UnitEditAssign />} />
              <Route path="/developer/assign-agencies" element={<AssignAgencies />} />
              <Route path="/developer/review-assignment" element={<ReviewAssignment />} />
              <Route path="/developer/add-project" element={<AddProject />} />
              <Route path="/developer/edit-project" element={<EditProject />} />
            </Route>
            <Route
              element={
                <ProtectedRoute allowedRoles={["agency"]}>
                  <AgencyIndex />
                </ProtectedRoute>
              }
            >
              <Route path="/agency/dashboard" element={<AgencyDashboard />} />
              <Route path="/agency/profile" element={<AgencyProfile />} />
              <Route path="/agency/notification" element={<AgencyNotification />} />
              <Route path="/agency/super-agent" element={<SuperAgent />} />
              <Route path="/agency/super-agent-details/:id" element={<SuperAgentDetail />} />
              <Route path="/agency/super-agent-edit/:id" element={<SuperAgentEdit />} />
              <Route path="/agency/allocation/project" element={<ProjectAllocation />} />
              <Route path="/agency/allocation/project-details/:id" element={<ProjectAllocationDetail />} />
              <Route path="/agency/allocation/project-units/:projectId" element={<ProjectAllocationUnit />} />
              <Route path="/agency/allocation/project-unit-details" element={<ProjectAllocationUnitDetail />} />
              <Route path="/agency/allocation/project-edit-assign" element={<ProjectAssignEditTab />} />
              <Route path="/agency/allocation/project-assign-agent" element={<ProjectAssignAgent />} />
              <Route path="/agency/allocation/project-review-assign" element={<ProjectReviewAssign />} />

              <Route path="/agency/allocation/property" element={<PropertyAllocation />} />

              <Route path="/agency/listings" element={<ListingManagement />} />
              <Route path="/agency/listings/edit-property" element={<AgencyEditProperty />} />
              <Route path="/agency/listing-details/:id" element={<ListingDetails />} />


              <Route path="/agency/leads/property" element={<PropertyLeads />} />
              <Route path="/agency/leads/property-details/:id" element={<PropertyLeadsDetail />} />

              <Route path="/agency/leads/project" element={<ProjectLeads />} />
              <Route path="/agency/leads/project-details/:id" element={<ProjectLeadsDetail />} />
              <Route path="/agency/leads/view-project-details/:id" element={<ViewProjectDetails />} />

              <Route path="/agency/subscription" element={<Subscription />} />
              <Route path="/agency/checkout" element={<Checkout />} />
            </Route>
            <Route
              element={
                <ProtectedRoute allowedRoles={["agent"]}>
                  <AgentIndex />
                </ProtectedRoute>
              }
            >
              <Route path="/agent/dashboard" element={<AgentDashboard />} />
              <Route path="/agent/profile" element={<AgentProfile />} />
              <Route path="/agent/notification" element={<AgentNotification />} />
              <Route path="/agent/allocated/property" element={<AllocatedProperty />} />

              <Route path="/agent/allocated/project" element={<AllocatedProject />} />
              <Route path="/agent/allocated/project-details" element={<AllocatedProjectDetail />} />
              <Route path="/agent/allocated/project-units" element={<AllocatedProjectUnits />} />
              <Route path="/agent/allocated/project-unit-details" element={<AllocatedProjectUnitDetail />} />

              <Route path="/agent/properties-management" element={<PropertiesManagement />} />
              <Route path="/agent/properties-management-details/:id" element={<PropertiesMangeDetail />} />
              <Route path="/agent/properties-management/edit" element={<PropertiesEdit />} />
              <Route path="/agent/properties-management/add-property" element={<AddProperty />} />
              <Route path="/agent/properties-management/edit-property" element={<EditProperty />} />


              <Route path="/agent/leads/project" element={<LeadsProject />} />
              <Route path="/agent/leads/project-details/:id" element={<LeadsProjectDetail />} />
              <Route path="/agent/leads/view-project-details" element={<LeadsViewProjectDetails />} />
              <Route path="/agent/leads/property" element={<LeadsProperty />} />
              <Route path="/agent/leads/property-details/:id" element={<LeadsPropertyDetail />} />
            </Route>
            <Route path="/" element={<Login />} />
            <Route path="/developer/accept-invitation" element={<DeveloperProfileCreate />} />
            <Route path="/agent/accept-invitation" element={<AgentProfileCreate />} />
            <Route path="/agency/accept-invitation" element={<AgencyProfileCreate />} />
            <Route path="/agency/logout" element={<Logout />} />
            <Route path="/agent/logout" element={<Logout />} />
            <Route path="/developer/logout" element={<Logout />} />
          </Routes>
        </BrowserRouter>
      </div>
    </>
  )
}

export default App
