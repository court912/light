/**
 * Utility function to preload an image
 * @param src - URL or data URL of the image to preload
 * @returns Promise that resolves with the loaded image
 */
export const preloadImage = (src: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = src;
  });
};
