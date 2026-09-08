import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import { useEffect } from "react";
import "./App.css";
import { SystemSettingsProvider } from "./context/SystemSettingsContext";
import Home from "./Pages/Home";
import Login from "./Components/accountSection/Login";
import Signup from "./Components/accountSection/Signup";
import Forgot from "./Components/accountSection/Forgot";
import ChangePassword from "./Components/accountSection/Changepassword";
import SearchListing from "./Pages/Search/SearchListing";
import PropertyDrilldown from "./Pages/Drilldown/PropertyDrilldown";
import UserAccount from "./Pages/UserAccount/UserAccountIndex";
import MyProfile from "./Pages/UserAccount/pages/MyProfile";
import SavedProperties from "./Pages/UserAccount/pages/SavedProperties";
import Header from "./Components/Header";
import Footer from "./Components/Footer";
import SavedAlerts from "./Pages/UserAccount/pages/SavedAlerts";
import ContactedProperties from "./Pages/UserAccount/pages/ContactedProperties";
import AgentandAgency from "./Pages/AgentandAgency/AgentandAgency";
import { Navigate } from "react-router-dom";
import AgentDetails from "./Pages/AgentandAgency/pages/AgentDetails";
import CompanyDetails from "./Pages/AgentandAgency/pages/CompanyDetails";
import { GoogleMapsLoaderProvider } from "./context/GoogleMapsLoaderContext";
import Developers from "./Pages/Developers/Developers";
import DeveloperDetails from "./Pages/Developers/pages/DeveloperDetails";
import NewProjectListing from "./Pages/Search/NewProjectListing";
import NewProjectDrilldown from "./Pages/Drilldown/NewProjectDrilldown";
import Terms from "./Pages/Terms";
import InsightHub from "./Pages/InsightHub/InsightHub";
import InsightDetail from "./Pages/InsightHub/InsightDetail";
import MapView from "./Pages/MapView/MapView";
import Teams from "./Pages/Info/Teams";
import Contact from "./Pages/Info/Contact";
import About from "./Pages/Info/About";
import MortgageCal from "./Pages/Mortgage/MortgageCal";
import Blog from "./Pages/Blog/Blog";
import BlogDetail from "./Pages/Blog/BlogDetail";
import RentBuyCal from "./Pages/RentVsBuy/RentBuyCal";
import AreaInSight from "./Pages/AreaInsight/AreaInSight";
import AllCommunities from "./Pages/AreaInsight/AllCommunities";
import AllCommunitiesDetails from "./Pages/AreaInsight/AllCommunitiesDetails";
import TowersAndCompounts from "./Pages/AreaInsight/TowersAndCompounts";
import Transaction from "./Pages/AreaInsight/Transaction";
import LocationDetails from "./Pages/AreaInsight/LocationDetails";
import ReviewDetails from "./Pages/AreaInsight/ReviewCompounts/ReviewDetails";
import PrivacyPolicy from "./Pages/PrivacyPolicy";
import SiteMap from "./Pages/SiteMap";

function App() {
  return (
    <Router>
      <SystemSettingsProvider>
        <AppContent />
      </SystemSettingsProvider>
    </Router>
  );
}

function AppContent() {
  const location = useLocation();

  function ScrollToTop() {
    const { pathname } = useLocation();

    useEffect(() => {
      window.scrollTo({ top: 0 });
    }, [pathname]);

    return null;
  }

  // Pages that should not have header and footer
  const noHeaderFooterPaths = [
    "/login",
    "/signup",
    "/forgotpassword",
    "/changepassword",
  ];
  const showHeaderFooter = !noHeaderFooterPaths.includes(location.pathname);

  // Pages that should hide only the footer (but keep the header)
  const noFooterPaths = ["/mapview"];
  const showFooter = showHeaderFooter && !noFooterPaths.includes(location.pathname);

  return (
    <>
      <ScrollToTop />
      {showHeaderFooter && <Header />}
      <GoogleMapsLoaderProvider>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgotpassword" element={<Forgot />} />
          <Route path="/changepassword" element={<ChangePassword />} />
          <Route path="/searchlisting" element={<SearchListing />} />
          <Route path="/propertydrilldown/:propertyId?" element={<PropertyDrilldown />} />
          <Route path="/newprojectlisting" element={<NewProjectListing />} />
          <Route path="/newprojectdrilldown/:projectId?" element={<NewProjectDrilldown />} />
          <Route path="/findagentorcompany" element={<AgentandAgency />} />
          <Route path="/agentdetails/:agentId?" element={<AgentDetails />} />
          <Route path="/companydetails/:companyId?" element={<CompanyDetails />} />
          <Route path="/finddevelopers" element={<Developers />} />
          <Route path="/developerdetails/:developerId?" element={<DeveloperDetails />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/sitemap" element={<SiteMap />} />
          <Route path="/privacypolicy" element={<PrivacyPolicy />} />
          <Route path="/insighthub" element={<InsightHub />} />
          <Route path="/insighthub/:id" element={<InsightDetail />} />
          <Route path="/mapview" element={<MapView />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/about" element={<About />} />
          <Route path="/blog" element={<Blog />} />
          <Route path="/blog/:slug" element={<BlogDetail />} />
          <Route path="/blog-detail" element={<Navigate to="/blog" replace />} />
          <Route path="/rentbuycal" element={<RentBuyCal />} />
          <Route path="/mortgagecal" element={<MortgageCal />} />
          <Route path="/areainsight" element={<AreaInSight />} />
          <Route path="/allcommunities" element={<AllCommunities />} />
          <Route path="/allcommunitiesdetails" element={<AllCommunitiesDetails />} />
          <Route path="/towersandcompounds" element={<TowersAndCompounts />} />
          <Route path="/transaction" element={<Transaction />} />
          <Route path="/locationdetails" element={<LocationDetails />} />
          <Route path="/reviewdetails" element={<ReviewDetails />} />
          <Route path="/account/*" element={<UserAccount />}>
            <Route index element={<Navigate to="myprofile" replace />} />
            <Route path="myprofile" element={<MyProfile />} />
            <Route path="savedproperties" element={<SavedProperties />} />
            <Route path="savedalerts" element={<SavedAlerts />} />
            <Route path="contactedproperties" element={<ContactedProperties />} />
          </Route>
        </Routes>
      </GoogleMapsLoaderProvider>
      {showFooter && <Footer />}
    </>
  );
}

export default App;
