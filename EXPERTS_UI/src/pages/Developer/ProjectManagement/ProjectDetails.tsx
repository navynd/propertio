import { useState, useEffect } from "react";

import { TrashIcon, EditIcon, UnitsIcon, MultiUserIcon } from "../../../components/CustomFile/icons";
import DeveloperHeader from "../../../components/Header/DeveloperHeader";
import ProjectDescription from "./ProjectComponents/ProjectDescription";
import PayMap from "./ProjectComponents/PayMap";
import CommonSection from "./ProjectComponents/CommonSection";
import { useNavigate } from "react-router-dom";
import Frq from "./ProjectComponents/Frq";
import ProjectHeader from "./ProjectComponents/ProjectHeader";

const ProjectDetails = () => {
    const navigate = useNavigate();
    return (
        <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 flex flex-col gap-[20px]">
            {/* Header */}
            <DeveloperHeader
                title="Project detail"
                showBack={true}
                onBackClick={() => navigate(-1)}
            />
            {/* Project Header */}
            <ProjectHeader />
            {/* <div className="rounded-[15px] bg-white md:p-[22px] p-[20px] min-w-0 flex justify-between flex-wrap gap-[20px]">
                <p className="md:text-[20px] text-[16px] leading-[140%] shrink-0">
                    <span className="text-[#707070] font-[Regular]">Project Name : </span>
                    <span className="text-[#222] font-[Bold]">Omniyat Bespoke</span>
                </p>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto lg:justify-end">
                    <button
                        type="button"
                        className="cursor-pointer inline-flex items-center justify-center gap-[6px] rounded-full border border-[rgba(34,34,34,0.10)] bg-white px-[14px] h-[33px] text-[12px] font-[SemiBold] text-[#222] shrink-0"
                    >
                        <UnitsIcon width={20} height={20} stroke="#222222" />
                        View units
                    </button>
                    <button
                        type="button"
                        className="cursor-pointer inline-flex items-center justify-center gap-[6px] rounded-full border border-[rgba(34,34,34,0.10)] bg-white px-[14px] h-[33px] text-[12px] font-[SemiBold] text-[#222] shrink-0"
                    >
                        <EditIcon width={20} height={20} stroke="#222222" />
                        Edit
                    </button>
                    <button
                        type="button"
                        className="cursor-pointer inline-flex items-center justify-center gap-[6px] rounded-full border border-[rgba(34,34,34,0.10)] bg-white px-[14px] h-[33px] text-[12px] font-[SemiBold] text-[#222] shrink-0"
                    >
                        <TrashIcon width={20} height={20} />
                        Delete
                    </button>
                    <button
                        type="button"
                        onClick={() => navigate("/developer/assign-agencies")}
                        className="cursor-pointer inline-flex items-center justify-center gap-[6px] rounded-full bg-[#EA3934] px-[14px] h-[33px] text-[12px] font-[SemiBold] text-[#FFF] shrink-0"
                    >
                        <MultiUserIcon width={20} height={20} stroke="#FFFFFF" />
                        Assign agency
                    </button>
                </div>
            </div> */}
            {/* Project description */}
            <ProjectDescription />
            <PayMap />
            <CommonSection />
            <Frq />
        </div>
    );
};

export default ProjectDetails;
