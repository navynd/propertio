import { BrowserRouter, Routes, Route } from "react-router-dom";
import './App.css'
import Login from "./pages/AccountSection/Login";
import Dashboard from "./pages/Dashboard/Dashboard";
import MainIndex from "./pages/MainIndex";
import UserAccount from "./pages/UserManagement/User/UserAccount";
import UserAccountDetail from "./pages/UserManagement/User/UserAccountDetail";
import AgencyAccount from "./pages/UserManagement/Agency/AgencyAccount";
import AgencyAccountDetail from "./pages/UserManagement/Agency/AgencyAccountDetail";
import AgencyAccView from "./pages/UserManagement/Agency/AgencyAccView";
import DeveloperAccount from "./pages/UserManagement/Developer/DeveloperAccount";
import DeveloperAccDetail from "./pages/UserManagement/Developer/DeveloperAccDetails";
import AgentAccount from "./pages/UserManagement/Agent/AgentAccount";
import AgentAccountDetail from "./pages/UserManagement/Agent/AgentAccountDetails";
import AgentAccView from "./pages/UserManagement/Agent/AgentAccView";
import ListingProperty from "./pages/ListingManagement/ListingProperty/ListingProperty";
import ListingPropertyDetail from "./pages/ListingManagement/ListingProperty/ListingPropertyDetail";
import ListingProject from "./pages/ListingManagement/ListingProject/ListingProject";
import ListingProjectDetail from "./pages/ListingManagement/ListingProject/ListingProjectDetail";
import ListingAmenities from "./pages/Master/Amenities/Amenities";
import ListingAmenitiesDetail from "./pages/Master/Amenities/AmenitiesDetail";
import DeveloperAccView from "./pages/UserManagement/Developer/DeveloperAccView";
import ReportManagement from "./pages/ReportManagement/ReportManagement";
import ReportManagementDetail from "./pages/ReportManagement/ReportManagementDetail";
import AboutUsSettings from "./pages/CMSManagement/AboutUs/AboutUsSettings";
import TeamManagement from "./pages/CMSManagement/Team/TeamManagement";
import TeamMemberDetail from "./pages/CMSManagement/Team/TeamMemberDetail";
import TestimonialManagement from "./pages/CMSManagement/Testimonials/TestimonialManagement";
import TestimonialDetail from "./pages/CMSManagement/Testimonials/TestimonialDetail";
import BannerManagement from "./pages/CMSManagement/Banner/BannerManagement";
import BannerDetail from "./pages/CMSManagement/Banner/BannerDetail";
import ContactUsSettings from "./pages/CMSManagement/ContactUs/ContactUsSettings";
import SitemapSettings from "./pages/CMSManagement/Sitemap/SitemapSettings";
import LegalPagesSettings from "./pages/CMSManagement/Legal/LegalPagesSettings";
import BlogManagement from "./pages/CMSManagement/Blog/BlogManagement";
import BlogDetailSettings from "./pages/CMSManagement/Blog/BlogDetailSettings";
import ProtectedRoute from "./components/ProtectedRoute";
import Amenities from "./pages/Master/Amenities/Amenities";
import AmenitiesDetail from "./pages/Master/Amenities/AmenitiesDetail";
import ListingProjectInquiry from "./pages/ListingManagement/ListingProjectInquiry/ListingProjectInquiry";
import ListingPropertyInquiry from "./pages/ListingManagement/ListingPropertyInquiry/ListingPropertyInquiry";
import JobTitle from "./pages/Master/Jobtitle/JobTitle";
import PropertyTypePage from "./pages/Master/PropertyType/PropertyType";
import ListingTypePage from "./pages/Master/ListingType/ListingType";
import LanguagesPage from "./pages/Master/Languages/Languages";
import CountriesPage from "./pages/Master/Countries/Countries";
import PropertyLocationPage from "./pages/Master/PropertyLocation/PropertyLocation";
import ProjectLocationPage from "./pages/Master/ProjectLocation/ProjectLocation";
import BlogCategoriesPage from "./pages/Master/BlogCategories/BlogCategories";
import CurrencyManagement from "./pages/SystemSettings/CurrencyManagement";
import SiteSettings from "./pages/SystemSettings/SiteSettings";
import SeoSettings from "./pages/SystemSettings/SeoSettings";
import { SystemSettingsProvider } from "./context/SystemSettingsContext";

function App() {
  return (
    <SystemSettingsProvider>
      <div className="whole_app">
        <BrowserRouter basename="/adminpanel">
          <Routes>
            <Route element={<ProtectedRoute><MainIndex /></ProtectedRoute>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/useraccount" element={<UserAccount />} />
              <Route path="/useraccountdetail" element={<UserAccountDetail />} />
              <Route path="/developeraccount" element={<DeveloperAccount />} />
              <Route path="/developeraccountview" element={<DeveloperAccView />} />
              <Route path="/developeraccountdetail" element={<DeveloperAccDetail />} />
              <Route path="/agencyaccount" element={<AgencyAccount />} />
              <Route path="/agencyaccountview" element={<AgencyAccView />} />
              <Route path="/agencyaccountdetail" element={<AgencyAccountDetail />} />
              <Route path="/agentaccount" element={<AgentAccount />} />
              <Route path="/agentaccountview" element={<AgentAccView />} />
              <Route path="/agentaccountdetail" element={<AgentAccountDetail />} />
              <Route path="/listingproperty" element={<ListingProperty />} />
              <Route path="/listingpropertydetail" element={<ListingPropertyDetail />} />
              <Route path="/listingproject" element={<ListingProject />} />
              <Route path="/listingprojectdetail" element={<ListingProjectDetail />} />
              <Route path="/listingprojectinquiry" element={<ListingProjectInquiry />} />
              <Route path="/listingpropertyinquiry" element={<ListingPropertyInquiry />} />
              <Route path="/amenities" element={<Amenities />} />
              <Route path="/amenitiesdetail" element={<AmenitiesDetail />} />
              <Route path="/jobtitles" element={<JobTitle />} />
              <Route path="/propertytypes" element={<PropertyTypePage />} />
              <Route path="/listingtypes" element={<ListingTypePage />} />
              <Route path="/languages" element={<LanguagesPage />} />
              <Route path="/countries" element={<CountriesPage />} />
              <Route path="/propertylocations" element={<PropertyLocationPage />} />
              <Route path="/projectlocations" element={<ProjectLocationPage />} />
              <Route path="/blogcategories" element={<BlogCategoriesPage />} />
              <Route path="/reportsmanagement" element={<ReportManagement />} />
              <Route path="/reportsmanagementdetail" element={<ReportManagementDetail />} />
              <Route path="/cmsaboutus" element={<AboutUsSettings />} />
              <Route path="/cmsteam" element={<TeamManagement />} />
              <Route path="/cmsteamdetail" element={<TeamMemberDetail />} />
              <Route path="/cmstestimonials" element={<TestimonialManagement />} />
              <Route path="/cmstestimonialdetail" element={<TestimonialDetail />} />
              <Route path="/banner" element={<BannerManagement />} />
              <Route path="/bannerdetail" element={<BannerDetail />} />
              <Route path="/cmscontactus" element={<ContactUsSettings />} />
              <Route path="/cmssitemap" element={<SitemapSettings />} />
              <Route path="/cmslegal" element={<LegalPagesSettings />} />
              <Route path="/cmsblogs" element={<BlogManagement />} />
              <Route path="/cmsblogdetail" element={<BlogDetailSettings />} />
              <Route path="/currencymanagement" element={<CurrencyManagement />} />
              <Route path="/sizesettings" element={<SiteSettings />} />
              <Route path="/seosetting" element={<SeoSettings />} />
            </Route>
            <Route path="/" element={<Login />} />
          </Routes>
        </BrowserRouter>
      </div>
    </SystemSettingsProvider>
  )
}

export default App
