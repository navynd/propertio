import { useEffect, useState } from "react";
import {
  bannerService,
  resolveBannerImage,
  type BannerPlacement,
} from "../services/bannerService";

export type PageBannerFallbacks = {
  images: string[];
  titles: string[];
  buttonTexts?: string[];
  links?: string[];
  autoSlideInterval?: number;
};

export type PageBannerState = {
  images: string[];
  titles: string[];
  buttonTexts: string[];
  links: string[];
  autoSlideInterval: number;
};

export function usePageBanners(placement: BannerPlacement, fallbacks: PageBannerFallbacks) {
  const [banners, setBanners] = useState<PageBannerState>({
    images: fallbacks.images,
    titles: fallbacks.titles,
    buttonTexts: fallbacks.buttonTexts || fallbacks.titles.map(() => "Explore more"),
    links: fallbacks.links || fallbacks.images.map(() => ""),
    autoSlideInterval: fallbacks.autoSlideInterval || 5000,
  });

  useEffect(() => {
    let mounted = true;

    bannerService
      .getBanners(placement)
      .then((data) => {
        if (!mounted || !data.banners?.length) return;

        const base = data.mediaBaseUrl?.img || "";
        const defaultButton = data.settings?.defaultButtonText || "Explore more";

        setBanners({
          images: data.banners.map((banner, index) =>
            resolveBannerImage(banner.image, base, fallbacks.images[index] || fallbacks.images[0])
          ),
          titles: data.banners.map((banner) => banner.title),
          buttonTexts: data.banners.map(
            (banner) => banner.linkText || defaultButton
          ),
          links: data.banners.map((banner) => banner.link || ""),
          autoSlideInterval: data.settings?.autoSlideInterval || 5000,
        });
      })
      .catch(() => {
        /* keep fallbacks */
      });

    return () => {
      mounted = false;
    };
  }, [placement]);

  return banners;
}
