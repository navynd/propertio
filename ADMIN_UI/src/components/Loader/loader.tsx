import { Box } from "@mui/material";
import type { FC } from "react";
import loader from "../../assets/json/loader.json";
import Lottie from "lottie-react";

type LoaderProps = {
  size?: number;
  margin?: string | number;
};

const Loader: FC<LoaderProps> = ({ size = 120, margin = "0 auto" }) => (
  <Box
    sx={{
      width: size,
      height: size,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      margin,
    }}
  >
    <Lottie animationData={loader} loop={true} />
  </Box>
);

export default Loader;
