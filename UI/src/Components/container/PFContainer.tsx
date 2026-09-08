import { Container, type ContainerProps } from "@mui/material";

type PFContainerProps = ContainerProps;

function PFContainer({ sx, ...props }: PFContainerProps) {
  return (
    <Container
      {...props}
      disableGutters
      maxWidth={false}
      // className="pf-containerwidth"
      sx={{
        width: "100%",
        // maxWidth: "1140px",
        maxWidth: "1200px",
        px: { xs: 2 },
        mx: "auto",
        ...sx,
      }}
    />
  );
}

export default PFContainer;

