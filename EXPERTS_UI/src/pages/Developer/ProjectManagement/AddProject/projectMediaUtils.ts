export const mediaFileKey = (file: File | null) =>
    file ? `${file.name}:${file.size}:${file.lastModified}` : "none";
