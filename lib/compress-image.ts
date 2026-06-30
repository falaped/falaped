import imageCompression from "browser-image-compression"

/**
 * Comprime uma foto de paciente no cliente antes do upload (D-09).
 *
 * O plano gratuito do Supabase não tem Image Transformations nativas, então a
 * compressão acontece no navegador para reduzir o tamanho armazenado e acelerar
 * o carregamento da signed URL. Isto é um wrapper fino sobre
 * `browser-image-compression` — sem lógica própria de canvas/EXIF (Don't Hand-Roll).
 *
 * Não é a barreira do `bodySizeLimit` (já é 25mb): é otimização de armazenamento.
 */
export async function compressPatientPhoto(file: File): Promise<File> {
  return imageCompression(file, {
    maxSizeMB: 1.5,
    maxWidthOrHeight: 1024,
    useWebWorker: true,
    fileType: "image/jpeg",
  })
}
