// Compressor de imagens embutido em código no navegador via Canvas.
// Reduz arquivos pesados (de 5MB-20MB para < 200KB) com máxima nitidez visual.

export async function comprimirImagem(arquivo: File, larguraMax = 1400, qualidade = 0.82): Promise<{ dataUrl: string; tamanhoKbOriginal: number; tamanhoKbComprimido: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(arquivo);
    reader.onload = (e) => {
      const img = new Image();
      img.src = e.target?.result as string;
      img.onload = () => {
        let { width, height } = img;

        if (width > larguraMax) {
          height = Math.round((height * larguraMax) / width);
          width = larguraMax;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D não disponível'));
          return;
        }

        // Suavização de alta qualidade
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL('image/jpeg', qualidade);
        const tamanhoKbOriginal = Math.round(arquivo.size / 1024);
        const tamanhoKbComprimido = Math.round((dataUrl.length * 0.75) / 1024);

        resolve({
          dataUrl,
          tamanhoKbOriginal,
          tamanhoKbComprimido
        });
      };
      img.onerror = () => reject(new Error('Erro ao carregar a imagem.'));
    };
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo.'));
  });
}
