/**
 * File upload service for FDC3 Sail configuration screens
 * Addresses Issue #177 - Config Screens Are Low-Effort
 */

import { validateImageFile } from "./validation"

export interface UploadResult {
  success: boolean
  url?: string
  error?: string
}

export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

/**
 * Uploads a file and returns a data URL or server URL
 */
export async function uploadFile(
  file: File,
  onProgress?: (progress: UploadProgress) => void,
): Promise<UploadResult> {
  try {
    // Validate the file first
    const validation = validateImageFile(file)
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.error,
      }
    }

    // For now, convert to data URL (in production, this would upload to server)
    const dataUrl = await fileToDataUrl(file, onProgress)

    return {
      success: true,
      url: dataUrl,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Upload failed",
    }
  }
}

/**
 * Converts a file to a data URL
 */
function fileToDataUrl(
  file: File,
  onProgress?: (progress: UploadProgress) => void,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result)
      } else {
        reject(new Error("Failed to read file"))
      }
    }

    reader.onerror = () => {
      reject(new Error("Failed to read file"))
    }

    reader.onprogress = (event) => {
      if (onProgress && event.lengthComputable) {
        onProgress({
          loaded: event.loaded,
          total: event.total,
          percentage: Math.round((event.loaded / event.total) * 100),
        })
      }
    }

    reader.readAsDataURL(file)
  })
}

/**
 * Resizes an image file to specified dimensions
 */
export async function resizeImage(
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality: number = 0.8,
): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement("canvas")
    const ctx = canvas.getContext("2d")
    const img = new Image()

    if (!ctx) {
      reject(new Error("Canvas not supported"))
      return
    }

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img

      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height
          height = maxHeight
        }
      }

      // Set canvas dimensions
      canvas.width = width
      canvas.height = height

      // Draw resized image
      ctx.drawImage(img, 0, 0, width, height)

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const resizedFile = new File([blob], file.name, {
              type: file.type,
              lastModified: Date.now(),
            })
            resolve(resizedFile)
          } else {
            reject(new Error("Failed to resize image"))
          }
        },
        file.type,
        quality,
      )
    }

    img.onerror = () => {
      reject(new Error("Failed to load image"))
    }

    img.src = URL.createObjectURL(file)
  })
}

/**
 * Generates a thumbnail from an image file
 */
export async function generateThumbnail(
  file: File,
  size: number = 64,
): Promise<string> {
  const thumbnailFile = await resizeImage(file, size, size, 0.7)
  const result = await uploadFile(thumbnailFile)

  if (result.success && result.url) {
    return result.url
  }

  throw new Error(result.error || "Failed to generate thumbnail")
}

/**
 * Validates and processes multiple image files
 */
export async function uploadMultipleFiles(
  files: FileList,
  onProgress?: (fileIndex: number, progress: UploadProgress) => void,
): Promise<UploadResult[]> {
  const results: UploadResult[] = []

  for (let i = 0; i < files.length; i++) {
    const file = files[i]
    const result = await uploadFile(file, (progress) => {
      onProgress?.(i, progress)
    })
    results.push(result)
  }

  return results
}

/**
 * Creates a preview URL for a file (for immediate display)
 */
export function createPreviewUrl(file: File): string {
  return URL.createObjectURL(file)
}

/**
 * Revokes a preview URL to free memory
 */
export function revokePreviewUrl(url: string): void {
  if (url.startsWith("blob:")) {
    URL.revokeObjectURL(url)
  }
}

/**
 * Extracts image metadata
 */
export async function getImageMetadata(file: File): Promise<{
  width: number
  height: number
  size: number
  type: string
  name: string
}> {
  return new Promise((resolve, reject) => {
    const img = new Image()

    img.onload = () => {
      resolve({
        width: img.naturalWidth,
        height: img.naturalHeight,
        size: file.size,
        type: file.type,
        name: file.name,
      })
      URL.revokeObjectURL(img.src)
    }

    img.onerror = () => {
      reject(new Error("Failed to load image metadata"))
      URL.revokeObjectURL(img.src)
    }

    img.src = URL.createObjectURL(file)
  })
}

/**
 * Compresses an image file
 */
export async function compressImage(
  file: File,
  quality: number = 0.8,
  maxSizeMB: number = 1,
): Promise<File> {
  let compressed = file
  let currentQuality = quality

  // Keep compressing until under size limit
  while (compressed.size > maxSizeMB * 1024 * 1024 && currentQuality > 0.1) {
    compressed = await resizeImage(
      compressed,
      compressed.size > 2 * 1024 * 1024 ? 1200 : 1600, // Smaller dimensions for larger files
      compressed.size > 2 * 1024 * 1024 ? 1200 : 1600,
      currentQuality,
    )
    currentQuality -= 0.1
  }

  return compressed
}

/**
 * Batch upload with retry logic
 */
export async function uploadWithRetry(
  file: File,
  maxRetries: number = 3,
  onProgress?: (progress: UploadProgress) => void,
): Promise<UploadResult> {
  let lastError: string | undefined

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await uploadFile(file, onProgress)
      if (result.success) {
        return result
      }
      lastError = result.error
    } catch (error) {
      lastError = error instanceof Error ? error.message : "Upload failed"
    }

    // Wait before retry (exponential backoff)
    if (attempt < maxRetries) {
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, attempt) * 1000),
      )
    }
  }

  return {
    success: false,
    error: `Upload failed after ${maxRetries} attempts: ${lastError}`,
  }
}

/**
 * Server-side upload (for production use)
 * This would replace the data URL approach in a real implementation
 */
export async function uploadToServer(
  file: File,
  endpoint: string = "/api/upload",
  onProgress?: (progress: UploadProgress) => void,
): Promise<UploadResult> {
  return new Promise((resolve) => {
    const formData = new FormData()
    formData.append("file", file)

    const xhr = new XMLHttpRequest()

    xhr.upload.onprogress = (event) => {
      if (onProgress && event.lengthComputable) {
        onProgress({
          loaded: event.loaded,
          total: event.total,
          percentage: Math.round((event.loaded / event.total) * 100),
        })
      }
    }

    xhr.onload = () => {
      if (xhr.status === 200) {
        try {
          const response = JSON.parse(xhr.responseText)
          resolve({
            success: true,
            url: response.url,
          })
        } catch {
          resolve({
            success: false,
            error: "Invalid server response",
          })
        }
      } else {
        resolve({
          success: false,
          error: `Server error: ${xhr.status}`,
        })
      }
    }

    xhr.onerror = () => {
      resolve({
        success: false,
        error: "Network error",
      })
    }

    xhr.open("POST", endpoint)
    xhr.send(formData)
  })
}
