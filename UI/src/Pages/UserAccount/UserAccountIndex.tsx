import { Outlet } from "react-router-dom";
import PFContainer from "../../Components/container/PFContainer";
import AccountSidebar from "./components/AccountSidebar";
import "../../assets/styles/UserAccount.scss";
import { BreadcrumbsComponentFirstLevel } from "../../Components/parts/component";
import { useMatch } from "react-router-dom";

export function AccountLanding() {
  return (
    <div className="pf-account__card">
      <h2 className="pf-account__card-title pf-account__card-title--center">
        Welcome back
      </h2>
      <p className="pf-account__message">
        Select a section from the left menu to review your account activity.
      </p>
    </div>
  );
}

function UserAccountIndex() {
const isProfilePage = !!useMatch("/account/myprofile/*");

  const layoutClassName = `pf-account__layout${
    isProfilePage ? "" : " pf-account__layout--two-col"
  }`;
  const contentClassName = `pf-account__content${
    isProfilePage ? " pf-account__content--wide" : ""
  }`;

  return (
    <main className="pf-account">
      <PFContainer className="pf-account__container">
         {/* Breadcrumbs Section */}

         <BreadcrumbsComponentFirstLevel
          breadcrumbTitle="Home"
          breadcrumbSubTitle1="Account"
          breadcrumbLinkTitleTo="/"
        />
        <div className={layoutClassName}>
          <div className="pf-account__sidebar">
            <AccountSidebar />
          </div>
          <section className={contentClassName}>
            <Outlet />
          </section>
        </div>
      </PFContainer>
    </main>
  );
}

export default UserAccountIndex;