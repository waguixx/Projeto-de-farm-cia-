/**
 * Utilities for image compression and handling
 */
export async function fileToBase64(file: File, maxWidth = 1200, maxHeight = 1200, quality = 0.82): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Erro ao ler o arquivo de imagem."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Falha ao carregar a imagem."));
      img.onload = () => {
        let { width, height } = img;
        if (width > maxWidth || height > maxHeight) {
          if (width > height) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve({ base64: String(reader.result), mimeType: file.type || "image/jpeg" });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        const mimeType = "image/jpeg";
        const base64Data = canvas.toDataURL(mimeType, quality);
        resolve({ base64: base64Data, mimeType });
      };
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}
