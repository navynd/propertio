import { useState } from "react";
import { NavLink, Link, useLocation, matchPath } from "react-router-dom";
import { Dialog, DialogContent, DialogOverlay } from "../Ui/Dialog";
import { HamburgerMenuIcon, Cross2Icon } from "@radix-ui/react-icons";
import { DashboardIcon, ProjectIcon, RevenueIcon, ProfileIcon, LogoutIcon, NotificationIcon } from '../CustomFile/icons'
import { EstatehubLogo } from "../CustomFile/EstatehubLogo";

type NavItem = {
    icon: typeof DashboardIcon;
    path: string;
    label: string;
    /** If set, item is active when pathname matches any of these (exact). Otherwise uses `path` only. */
    activePaths?: string[];
};

const navItems: NavItem[] = [
    { icon: DashboardIcon, path: "/developer/dashboard", label: "Dashboard" },
    {
        icon: ProjectIcon,
        path: "/developer/project-management?tab=unpublished",
        label: "Project management",
        activePaths: ["/developer/project-management", "/developer/project-details", "/developer/units", "/developer/units-details", "/developer/unit-edit", "/developer/assign-agencies", "/developer/review-assignment", "/developer/unpublished-project-details", "/developer/units-assign", "/developer/units-edit-assign", "/developer/units-edit", "/developer/active-project-details", "/developer/add-project", "/developer/edit-project", "/developer/soldout-project-details"],
    },
    {
        icon: RevenueIcon,
        path: "/developer/revenue-management",
        label: "Revenue management",
        activePaths: ["/developer/revenue-management", "/developer/revenue-details"],
    },
    { icon: ProfileIcon, path: "/developer/profile", label: "Profile" },
    { icon: LogoutIcon, path: "/developer/logout", label: "Logout" },
];

function DeveloperSidebar() {
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const location = useLocation();
    const isCheckoutRoute = location.pathname === "/user/checkout";
    const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
        <div className="flex flex-col h-full bg-[#F5F5F5] md:w-[350px] xl:w-[300px] lg:w-[280px] w-[320px] lg:p-[30px_0px_30px_30px]  p-[20px_20px_20px_20px] sidebar overflow-hidden">
            <div className="mb-[40px] flex justify-between items-center w-full sidebar_logo">
                <Link
                    to="/developer/dashboard"
                    onClick={() => {
                        if (isMobile) {
                            setIsDrawerOpen(false);
                        }
                    }}
                >
                    <EstatehubLogo width="155" height="38" subtitle="DEVELOPER" />
                </Link>
                {isMobile && (
                    <button
                        type="button"
                        onClick={() => setIsDrawerOpen(false)}
                        className="cursor-pointer w-[40px] h-[40px] rounded-[12px] border border-[#E6E6E6] bg-white flex items-center justify-center"
                    >
                        <Cross2Icon className="w-[18px] h-[18px] text-[#222]" />
                    </button>
                )}
            </div>
            <aside className="flex-1 flex flex-col items-start gap-[10px] w-full sidebar_aside overflow-y-auto pr-[4px]">
                {navItems.map((item, index) => {
                    const pathsToMatch = item.activePaths ?? [item.path];
                    const isItemActive = pathsToMatch.some(
                        (p) => matchPath({ path: p, end: true }, location.pathname) != null
                    );
                    return (
                        <NavLink
                            key={index}
                            to={item.path}
                            end
                            className={() =>
                                `flex w-full gap-[10px] items-center justify-start rounded-[15px] p-[6px] transition hover:bg-[rgba(34,34,34,0.10)] focus:outline-none focus:border-none focus:shadow-none ${isItemActive ? "bg-[rgba(34,34,34,0.10)] " : "bg-transparent "
                                }`
                            }
                            onClick={() => {
                                setIsDrawerOpen(false);
                            }}
                        >
                            <div
                                className={`flex items-center justify-center w-[46px] h-[46px] rounded-[12px] ${isItemActive ? "bg-[#222]" : "bg-[#fff]"}`}
                            >
                                <item.icon
                                    stroke={isItemActive ? "#fff" : "#707070"}
                                    fill={isItemActive ? "#fff" : "#707070"}
                                />
                            </div>
                            <p className="text-[14px] text-[#222] font-[Medium]">{item.label}</p>
                        </NavLink>
                    );
                })}
            </aside>
            <div className="pt-[20px] mt-auto border-t border-[rgba(34,34,34,0.10)]">
                <p className="text-[12px] leading-[1.5] text-[#707070] font-[Regular]">
                    Copyright © 2025 estatehub.ae.
                </p>
                <p className="text-[12px] leading-[1.5] text-[#707070] font-[Regular]">
                    All rights reserved.
                </p>
            </div>
        </div>
    );

    return (
        <>
            {/* Mobile Hamburger Menu */}
            <div className={`lg:hidden fixed top-0 left-0 right-0 bg-[#fff] p-[14px_16px] z-[10] flex items-center justify-between border-b border-[rgba(0,0,0,0.1)] ${isCheckoutRoute ? "border-none" : ""}`}>
                <Link to="/developer/dashboard">
                    <EstatehubLogo width="135" height="34" subtitle="DEVELOPER" />
                </Link>
                <Dialog open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
                    <button
                        type="button"
                        className="cursor-pointer w-[40px] h-[40px] rounded-[12px] border border-[#E6E6E6] bg-white flex items-center justify-center"
                        onClick={() => setIsDrawerOpen(true)}
                    >
                        <HamburgerMenuIcon className="w-[20px] h-[20px] text-[#222]" />
                    </button>
                    <DialogOverlay className="fixed inset-0 bg-[rgba(0,0,0,0.5)] data-[state=open]:animate-in data-[state=closed]:animate-out" />
                    <DialogContent className="fixed left-0 top-0 h-[100dvh] bg-[#fff] border-r border-[rgba(0,0,0,0.1)] p-0 translate-x-0 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left z-[99] overflow-hidden">
                        <SidebarContent isMobile />
                    </DialogContent>
                </Dialog>
            </div>

            {/* Desktop Sidebar */}
            <div className="hidden lg:flex flex-col items-center h-[100dvh] fixed max-sm:w-full z-[100]">
                <SidebarContent />
            </div>
        </>
    );
}

export default DeveloperSidebar