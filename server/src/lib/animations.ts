export type PublishedAnimation = {
  id: string;
  format: 'lottie' | 'video' | 'image';
  assetUrl: string;
};

export function approvedAnimations(
  animations:
    | Array<{
        id: string;
        format: PublishedAnimation['format'];
        assetUrl: string;
        reviewStatus?: string;
      }>
    | undefined,
): PublishedAnimation[] {
  return (animations ?? [])
    .filter((asset) => asset.reviewStatus === 'approved')
    .map(({ id, format, assetUrl }) => ({ id, format, assetUrl }));
}
