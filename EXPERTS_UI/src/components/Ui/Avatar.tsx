import * as React from "react";

type AvatarProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  fallback?: React.ReactNode;
};

export function Avatar({ fallback, alt, ...props }: AvatarProps) {
  const [error, setError] = React.useState(false);

  if (error || !props.src) {
    return <span>{fallback ?? alt?.[0] ?? "?"}</span>;
  }

  return (
    <img
      alt={alt}
      onError={() => setError(true)}
      {...props}
    />
  );
}


