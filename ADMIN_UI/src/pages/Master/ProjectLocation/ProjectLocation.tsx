import {
  projectLocationsService,
  type ListingSearchCityPayload,
} from "../../../services/listingSearchLocationsService";
import ListingSearchCityPage, {
  type ListingSearchCityPageConfig,
} from "../ListingSearchCity/ListingSearchCityPage";

const projectLocationConfig: ListingSearchCityPageConfig = {
  kind: "project",
  headerTitle: "Project Locations",
  addButtonLabel: "Add Project Location",
  modalTitleAdd: "Add Project Location",
  modalTitleEdit: "Edit Project Location",
  emptyMessage: "No project locations found",
  linkedFilterHelp: "Linked only shows cities with projectCount > 0",
  countColumnLabel: "Projects",
  async fetchList(params) {
    const data = await projectLocationsService.list(params);
    return {
      rows: data.projectLocations ?? [],
      pagination: data.pagination,
      counts: data.counts,
    };
  },
  async create(payload: ListingSearchCityPayload) {
    await projectLocationsService.create(payload);
  },
  async update(id, payload) {
    await projectLocationsService.update(id, payload);
  },
  async remove(id) {
    await projectLocationsService.delete(id);
  },
};

export default function ProjectLocationPage() {
  return <ListingSearchCityPage config={projectLocationConfig} />;
}
