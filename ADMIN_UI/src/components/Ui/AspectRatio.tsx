import * as React from "react";

type AspectRatioProps = {
  ratio?: number;
} & React.HTMLAttributes<HTMLDivElement>;

export function AspectRatio({
  ratio = 16 / 9,
  style,
  children,
  ...props
}: AspectRatioProps) {
  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        paddingBottom: `${100 / ratio}%`,
        ...style,
      }}
      {...props}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}


