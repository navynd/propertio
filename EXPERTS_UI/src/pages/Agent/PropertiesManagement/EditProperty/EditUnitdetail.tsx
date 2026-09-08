// import { DownArrowIcon, PlusIcon, TrashIcon, GalleryIcon } from "../../../../components/CustomFile/icons";
// import { useState } from "react";
// type Layout = {
//     id: number;
//     isOpen: boolean;
// };

// type Property = {
//     id: number;
//     isOpen: boolean;
//     layouts: Layout[];
// };


// const EditUnitdetail = () => {
//     const [properties, setProperties] = useState<Property[]>([]);

//     //default open property
//     // const [properties, setProperties] = useState<Property[]>([
//     //     {
//     //         id: 1,
//     //         isOpen: true,
//     //         layouts: [
//     //             {
//     //                 id: 1,
//     //                 isOpen: true
//     //             }
//     //         ]
//     //     }
//     // ]);
//     const [openPropertyTypeDropdownId, setOpenPropertyTypeDropdownId] = useState<number | null>(null);
//     const [selectedPropertyTypeById, setSelectedPropertyTypeById] = useState<Record<number, string>>({});
//     const [layoutImageByKey, setLayoutImageByKey] = useState<Record<string, string>>({});
//     const propertyTypeOptions = ["Apartment", "Villa", "Townhouse", "Duplex", "Penthouse"];
//     const getLayoutKey = (propertyId: number, layoutId: number) => `${propertyId}-${layoutId}`;
//     const addProperty = () => {
//         setProperties((prev) => [
//             ...prev,
//             {
//                 id: prev.length + 1,
//                 isOpen: true,
//                 layouts: []
//             }
//         ]);
//     };
//     const toggleProperty = (propertyId: number) => {
//         setProperties((prev) =>
//             prev.map((property) =>
//                 property.id === propertyId
//                     ? { ...property, isOpen: !property.isOpen }
//                     : property
//             )
//         );
//     };
//     const deleteProperty = (propertyId: number) => {
//         setProperties((prev) => prev.filter(p => p.id !== propertyId));
//         setSelectedPropertyTypeById((prev) => {
//             const next = { ...prev };
//             delete next[propertyId];
//             return next;
//         });
//         setOpenPropertyTypeDropdownId((prev) => (prev === propertyId ? null : prev));
//         setLayoutImageByKey((prev) => {
//             const next = { ...prev };
//             Object.keys(next).forEach((key) => {
//                 if (key.startsWith(`${propertyId}-`)) {
//                     URL.revokeObjectURL(next[key]);
//                     delete next[key];
//                 }
//             });
//             return next;
//         });
//     };
//     const addLayout = (propertyId: number) => {
//         setProperties((prev) =>
//             prev.map((property) => {
//                 if (property.id === propertyId) {
//                     return {
//                         ...property,
//                         layouts: [
//                             ...property.layouts,
//                             { id: property.layouts.length + 1, isOpen: true }
//                         ]
//                     };
//                 }
//                 return property;
//             })
//         );
//     };
//     const toggleLayout = (propertyId: number, layoutId: number) => {
//         setProperties((prev) =>
//             prev.map((property) => {
//                 if (property.id === propertyId) {
//                     return {
//                         ...property,
//                         layouts: property.layouts.map((layout) =>
//                             layout.id === layoutId
//                                 ? { ...layout, isOpen: !layout.isOpen }
//                                 : layout
//                         )
//                     };
//                 }
//                 return property;
//             })
//         );
//     };
//     const deleteLayout = (propertyId: number, layoutId: number) => {
//         setProperties((prev) =>
//             prev.map((property) => {
//                 if (property.id === propertyId) {
//                     return {
//                         ...property,
//                         layouts: property.layouts.filter(l => l.id !== layoutId)
//                     };
//                 }
//                 return property;
//             })
//         );
//         setLayoutImageByKey((prev) => {
//             const next = { ...prev };
//             const key = getLayoutKey(propertyId, layoutId);
//             if (next[key]) {
//                 URL.revokeObjectURL(next[key]);
//                 delete next[key];
//             }
//             return next;
//         });
//     };

//     const handleLayoutImageChange = (propertyId: number, layoutId: number, file?: File) => {
//         if (!file || !file.type.startsWith("image/")) return;
//         const key = getLayoutKey(propertyId, layoutId);
//         const newUrl = URL.createObjectURL(file);

//         setLayoutImageByKey((prev) => {
//             const next = { ...prev };
//             if (next[key]) {
//                 URL.revokeObjectURL(next[key]);
//             }
//             next[key] = newUrl;
//             return next;
//         });
//     };

//     return (
//         <div>
//             <div className="rounded-b-[15px] bg-white md:p-[30px] p-[16px]">
//                 <h3 className="text-[20px] font-[Bold] text-[#222] mb-[30px]">Unit details</h3>

//                 <div className="flex flex-col gap-[20px]">
//                     {properties.map((property, index) => (
//                         <div
//                             key={property.id}
//                             className=""
//                         >
//                             <div onClick={() => toggleProperty(property.id)} className={`flex items-start justify-between gap-[12px] cursor-pointer ${property.isOpen ? "mb-[0px]" : `pb-[20px] ${index !== properties.length - 1 ? "border-b border-[rgba(34,34,34,0.10)]" : ""} `}`}>
//                                 <p className={`text-[14px] font-[Medium] ${property.isOpen ? "text-[#0832AE]" : "text-[#222]"}`}>
//                                     Property Type #{property.id} <span className="text-[#D4A373]">*</span>
//                                 </p>
//                                 <button
//                                     type="button"
//                                     onClick={() => deleteProperty(property.id)}
//                                     className="bg-white flex items-center justify-center cursor-pointer"
//                                 >
//                                     <TrashIcon width={20} height={20} fill="#D4A373" />
//                                 </button>
//                             </div>

//                             {/*property type and layout types details*/}
//                             {property.isOpen && (
//                                 <div className="rounded-[15px] bg-[#F5F5F5] md:[20px] p-[15px] mt-[20px]">
//                                     {/*property type overview*/}
//                                     <div>
//                                         <div className=" grid grid-cols-1 md:grid-cols-2 gap-[10px]">
//                                             <div>
//                                                 <label className="text-[14px] font-[Medium] text-[#222] block mb-[6px]">
//                                                     Building/Tower Name <span className="text-[#707070] font-[Regular] text-[12px]">(Optional)</span>
//                                                 </label>
//                                                 <input
//                                                     type="text"
//                                                     placeholder="Enter number of baths"
//                                                     className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] bg-white px-[12px] text-[13px] text-[#222] placeholder:text-[#A0A0A0] focus:outline-none"
//                                                 />
//                                             </div>

//                                             <div>
//                                                 <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">Property type</label>
//                                                 <div className="relative">
//                                                     <button
//                                                         type="button"
//                                                         onClick={() =>
//                                                             setOpenPropertyTypeDropdownId((prev) =>
//                                                                 prev === property.id ? null : property.id
//                                                             )
//                                                         }
//                                                         className="cursor-pointer h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] bg-white px-[12px] text-[13px] flex items-center justify-between"
//                                                     >
//                                                         <span className={selectedPropertyTypeById[property.id] ? "text-[#222]" : "text-[#A0A0A0]"}>
//                                                             {selectedPropertyTypeById[property.id] || "Select property type"}
//                                                         </span>
//                                                         <DownArrowIcon
//                                                             width={10}
//                                                             height={7}
//                                                             className={`transition-transform ${openPropertyTypeDropdownId === property.id ? "rotate-180" : ""
//                                                                 }`}
//                                                         />
//                                                     </button>
//                                                     {openPropertyTypeDropdownId === property.id && (
//                                                         <div className="absolute left-0 right-0 top-[48px] z-20 rounded-[10px] border border-[rgba(34,34,34,0.10)] bg-white shadow-[0_8px_20px_rgba(0,0,0,0.08)] py-[6px]">
//                                                             {propertyTypeOptions.map((option) => (
//                                                                 <button
//                                                                     key={option}
//                                                                     type="button"
//                                                                     onClick={() => {
//                                                                         setSelectedPropertyTypeById((prev) => ({
//                                                                             ...prev,
//                                                                             [property.id]: option,
//                                                                         }));
//                                                                         setOpenPropertyTypeDropdownId(null);
//                                                                     }}
//                                                                     className="w-full text-left px-[12px] py-[8px] text-[13px] text-[#222] hover:bg-[#F5F5F5]"
//                                                                 >
//                                                                     {option}
//                                                                 </button>
//                                                             ))}
//                                                         </div>
//                                                     )}
//                                                 </div>
//                                             </div>
//                                         </div>

//                                         <div className="mt-[12px]">
//                                             <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">
//                                                 Area of the property <span className="text-[#D4A373]">*</span>
//                                             </label>
//                                             <div className="grid grid-cols-1 md:grid-cols-2 gap-[10px]">
//                                                 <div className="relative">
//                                                     <input
//                                                         type="text"
//                                                         placeholder="0,00"
//                                                         className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] bg-white px-[12px] pr-[50px] text-[13px] text-[#222] placeholder:text-[#A0A0A0] focus:outline-none"
//                                                     />
//                                                     <span className="absolute right-[12px] top-1/2 -translate-y-1/2 text-[13px] font-[SemiBold] text-[#707070]">Sq.m</span>
//                                                 </div>
//                                                 <div className="relative">
//                                                     <input
//                                                         type="text"
//                                                         placeholder="0,00"
//                                                         className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] bg-white px-[12px] pr-[50px] text-[13px] text-[#222] placeholder:text-[#A0A0A0] focus:outline-none"
//                                                     />
//                                                     <span className="absolute right-[12px] top-1/2 -translate-y-1/2 text-[13px] font-[SemiBold] text-[#707070]">Sq.ft</span>
//                                                 </div>
//                                             </div>
//                                         </div>

//                                         <div className="mt-[12px] border-t border-[rgba(34,34,34,0.06)] pt-[12px]">
//                                             <div className="flex items-center justify-between gap-3">
//                                                 <p className="text-[14px] font-[Bold] text-[#222]">Layout types</p>
//                                                 {property.layouts.length < 1 && (
//                                                     <button
//                                                         type="button"
//                                                         onClick={() => addLayout(property.id)}
//                                                         className="cursor-pointer h-[21px] rounded-[5px] px-[8px] border border-[rgba(8,50,174,0.30)] bg-[rgba(8,50,174,0.10)] text-[#0832AE] text-[12px] font-[SemiBold] inline-flex items-center gap-[5px]"
//                                                     >
//                                                         <PlusIcon width={12} height={12} fill="#0832AE" />
//                                                         Add Layout types
//                                                     </button>
//                                                 )}
//                                             </div>
//                                         </div>
//                                     </div>
//                                     {/*layout types overview*/}
//                                     {property.layouts.map((layout) => (
//                                         <div key={layout.id} className="mt-[12px] rounded-[15px] bg-[#FFF] md:p-[20px] p-[15px]">
//                                             <div onClick={() => toggleLayout(property.id, layout.id)} className="cursor-pointer flex items-center justify-between">
//                                                 <p className={`text-[13px] font-[SemiBold] ${layout.isOpen ? "text-[#0832AE]" : "text-[#222]"}`}>  Layout type #{layout.id}</p>
//                                                 <button onClick={() => deleteLayout(property.id, layout.id)} type="button" className="cursor-pointer flex items-center justify-center bg-white">
//                                                     <TrashIcon width={20} height={20} fill="#D4A373" />
//                                                 </button>
//                                             </div>
//                                             {/*layout types details*/}
//                                             {layout.isOpen && (
//                                                 <div className="mt-[30px]">
//                                                     {/* layout name and size */}
//                                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-[14px] md:mb-[30px] mb-[15px]">
//                                                         <div>
//                                                             <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[10px]">Layout name <span className="text-[#D4A373]">*</span></label>
//                                                             <input type="text" defaultValue="TYPE A -1BHK" className="font-[Regular] h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] text-[#222] focus:outline-none" />
//                                                         </div>
//                                                         <div>
//                                                             <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[10px]">Size (sq.ft.) <span className="text-[#D4A373]">*</span></label>
//                                                             <div className="grid grid-cols-2 gap-[10px]">
//                                                                 <div className="relative">
//                                                                     <input type="text" defaultValue="147" className="font-[Regular] h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] pr-[56px] text-[13px] text-[#222] focus:outline-none" />
//                                                                     <span className="absolute right-[12px] top-1/2 -translate-y-1/2 text-[13px] text-[#707070] font-[SemiBold]">Sq.m</span>
//                                                                 </div>
//                                                                 <div className="relative">
//                                                                     <input type="text" defaultValue="147" className="font-[Regular] h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] pr-[56px] text-[13px] text-[#222] focus:outline-none" />
//                                                                     <span className="absolute right-[12px] top-1/2 -translate-y-1/2 text-[13px] text-[#707070] font-[SemiBold]">Sq.ft</span>
//                                                                 </div>
//                                                             </div>
//                                                         </div>
//                                                     </div>
//                                                     {/* number of bedrooms and maid bedroom is available */}
//                                                     <div className="md:mb-[30px] mb-[15px]">
//                                                         <div>
//                                                             <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[10px]">Number of bedrooms <span className="text-[#D4A373]">*</span></label>
//                                                             <input type="text" defaultValue="2" className="font-[Regular] h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] text-[#222] focus:outline-none" />
//                                                         </div>
//                                                         <label className="inline-flex items-center gap-[8px] mt-[10px] cursor-pointer">
//                                                             <input type="checkbox" className="h-[15px] w-[15px] rounded border border-[rgba(34,34,34,0.20)]" />
//                                                             <span className="text-[12px] text-[#707070] font-[Regular]">Maid bedroom is available</span>
//                                                         </label>
//                                                     </div>

//                                                     {/* number of bathrooms and number of units */}
//                                                     <div className="grid grid-cols-1 md:grid-cols-2 gap-[14px] md:mb-[30px] mb-[15px]">
//                                                         <div>
//                                                             <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[10px]">Number of bathrooms <span className="text-[#D4A373]">*</span></label>
//                                                             <input type="text" defaultValue="1" className="font-[Regular] h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] text-[#222] focus:outline-none" />
//                                                         </div>
//                                                         <div>
//                                                             <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[10px]">Number of units <span className="text-[#D4A373]">*</span></label>
//                                                             <input type="text" defaultValue="20" className="font-[Regular] h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] text-[#222] focus:outline-none" />
//                                                         </div>
//                                                     </div>

//                                                     {/* layout price */}
//                                                     <div className="">
//                                                         <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[10px]">Layout price <span className="text-[#D4A373]">*</span></label>
//                                                         <div className="relative">
//                                                             <input type="text" defaultValue="2800000" className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] pr-[48px] text-[13px] text-[#222] font-[Regular] focus:outline-none" />
//                                                             <span className="absolute right-[12px] top-1/2 -translate-y-1/2 text-[13px] text-[#707070] font-[SemiBold]">AED</span>
//                                                         </div>
//                                                     </div>

//                                                     {/* layout gallery */}
//                                                     <div className="md:mt-[30px] mt-[15px]">
//                                                         <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[10px]">
//                                                             Upload floor plan images <span className="text-[#D4A373]">*</span>
//                                                         </label>
//                                                         <div className="rounded-[10px] border border-dashed border-[rgba(34,34,34,0.15)] bg-white min-h-[180px] flex flex-col items-center justify-center text-center md:p-[56px] p-[20px]">
//                                                             {layoutImageByKey[getLayoutKey(property.id, layout.id)] ? (
//                                                                 <img
//                                                                     src={layoutImageByKey[getLayoutKey(property.id, layout.id)]}
//                                                                     alt={`Layout ${layout.id} preview`}
//                                                                     className="w-full max-w-[360px] h-[140px] object-cover rounded-[8px]"
//                                                                 />
//                                                             ) : (
//                                                                 <>
//                                                                     <GalleryIcon width={42} height={42} />
//                                                                     <p className="text-[13px] font-[Medium] text-[#000] mt-[20px]">
//                                                                         Select a file or drag and drop here
//                                                                     </p>
//                                                                     <p className="text-[12px] font-[Regular] text-[#707070] mt-[4px]">
//                                                                         JPG, PNG or webp, file size no more than 200MB
//                                                                     </p>
//                                                                 </>
//                                                             )}
//                                                             <label className="cursor-pointer mt-[20px] h-[34px] px-[16px] rounded-[10px] bg-[#0832AE] text-white text-[12px] font-[SemiBold] inline-flex items-center justify-center">
//                                                                 <input
//                                                                     type="file"
//                                                                     accept="image/*"
//                                                                     className="hidden"
//                                                                     onChange={(event) => {
//                                                                         const file = event.target.files?.[0];
//                                                                         handleLayoutImageChange(property.id, layout.id, file);
//                                                                         event.target.value = "";
//                                                                     }}
//                                                                 />
//                                                                 {layoutImageByKey[getLayoutKey(property.id, layout.id)] ? "Change File" : "Select File"}
//                                                             </label>
//                                                         </div>
//                                                     </div>

//                                                 </div>
//                                             )}
//                                         </div>
//                                     ))}
//                                     {property.layouts.length > 0 && (
//                                         <div className="flex justify-center align-center m-[30px_0px_20px_0px]">
//                                             <button
//                                                 type="button"
//                                                 onClick={() => addLayout(property.id)}
//                                                 className="cursor-pointer h-[21px] rounded-[5px] px-[8px] border border-[rgba(8,50,174,0.30)] bg-[rgba(8,50,174,0.10)] text-[#0832AE] text-[12px] font-[SemiBold] inline-flex items-center gap-[5px]"
//                                             >
//                                                 <PlusIcon width={12} height={12} fill="#0832AE" />
//                                                 Add Layout types
//                                             </button>
//                                         </div>
//                                     )}
//                                 </div>
//                             )}
//                         </div>
//                     ))}
//                 </div>
//                 <button
//                     type="button"
//                     onClick={addProperty}
//                     className="cursor-pointer mt-[12px] w-full h-[56px] rounded-[10px] border border-dashed border-[rgba(34,34,34,0.16)] text-[#0832AE] text-[13px] font-[SemiBold] inline-flex items-center justify-center gap-[7px]"
//                 >
//                     <PlusIcon width={13} height={13} fill="#0832AE" />
//                     Add another property
//                 </button>
//             </div>
//             <div className="flex items-center justify-end gap-[10px] mt-[30px]">
//                 <button className="cursor-pointer h-[44px] rounded-[10px] px-[20px] border border-[#222]  text-[#222] text-[14px] font-[Bold] inline-flex items-center gap-[5px]">Discard</button>
//                 <button className="cursor-pointer h-[44px] rounded-[10px] px-[20px] bg-[#D4A373] text-[#FFF] text-[14px] font-[Bold] inline-flex items-center gap-[5px]">Save changes</button>
//             </div>
//         </div>
//     );
// };

// export default EditUnitdetail;
