import {
  propertyLocationsService,
  type ListingSearchCityPayload,
} from "../../../services/listingSearchLocationsService";
import ListingSearchCityPage, {
  type ListingSearchCityPageConfig,
} from "../ListingSearchCity/ListingSearchCityPage";

const propertyLocationConfig: ListingSearchCityPageConfig = {
  kind: "property",
  headerTitle: "Property Locations",
  addButtonLabel: "Add Property Location",
  modalTitleAdd: "Add Property Location",
  modalTitleEdit: "Edit Property Location",
  emptyMessage: "No property locations found",
  linkedFilterHelp: "Linked only shows cities with propertyCount > 0",
  countColumnLabel: "Properties",
  async fetchList(params) {
    const data = await propertyLocationsService.list(params);
    return {
      rows: data.propertyLocations ?? [],
      pagination: data.pagination,
      counts: data.counts,
    };
  },
  async create(payload: ListingSearchCityPayload) {
    await propertyLocationsService.create(payload);
  },
  async update(id, payload) {
    await propertyLocationsService.update(id, payload);
  },
  async remove(id) {
    await propertyLocationsService.delete(id);
  },
};

export default function PropertyLocationPage() {
  return <ListingSearchCityPage config={propertyLocationConfig} />;
}
