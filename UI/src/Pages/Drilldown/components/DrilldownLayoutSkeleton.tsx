import Box from "@mui/material/Box";
import Skeleton from "@mui/material/Skeleton";
import PFContainer from "../../../Components/container/PFContainer";

/**
 * Lightweight placeholder matching drilldown page structure (gallery + sticky card column).
 * Rounded blocks only — no fine-grained “detail” skeleton rows.
 */
function DrilldownLayoutSkeleton() {
  return (
    <div className="pf-property-drilldown">
      <PFContainer>
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            gap: 1,
            mb: 2.5,
          }}
        >
          <Skeleton
            variant="rounded"
            animation="wave"
            width={52}
            height={14}
            sx={{ borderRadius: "7px" }}
          />
          <Skeleton variant="text" width={10} />
          <Skeleton
            variant="rounded"
            animation="wave"
            width={132}
            height={14}
            sx={{ borderRadius: "7px" }}
          />
          <Skeleton variant="text" width={10} />
          <Skeleton
            variant="rounded"
            animation="wave"
            width={168}
            height={14}
            sx={{ borderRadius: "7px" }}
          />
        </Box>

        <Box className="pf-property-drilldown__main-layout">
          <Box className="pf-property-drilldown__layout-container">
            <Box className="pf-property-drilldown__left-column">
              <Box className="pf-property-drilldown__left-content">
                <Skeleton
                  variant="rounded"
                  animation="wave"
                  width="100%"
                  sx={{
                    height: { xs: 360, sm: 440, md: 560 },
                    borderRadius: "12px",
                    maxWidth: "100%",
                  }}
                />
                <Skeleton
                  variant="rounded"
                  animation="wave"
                  width="100%"
                  sx={{
                    height: 72,
                    borderRadius: "12px",
                    mt: 1.5,
                    maxWidth: "100%",
                  }}
                />
                <Skeleton
                  variant="rounded"
                  animation="wave"
                  width="68%"
                  sx={{
                    height: 18,
                    borderRadius: "9px",
                    mt: 3,
                  }}
                />
              </Box>
            </Box>
            <Box className="pf-property-drilldown__right-column">
              <Skeleton
                variant="rounded"
                animation="wave"
                width="100%"
                sx={{
                  height: { xs: 300, md: 400 },
                  borderRadius: "12px",
                }}
              />
            </Box>
          </Box>
        </Box>
      </PFContainer>
    </div>
  );
}

export default DrilldownLayoutSkeleton;
