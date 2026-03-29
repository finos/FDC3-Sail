/**
 * Validation utilities for FDC3 Sail configuration screens
 * Addresses Issue #177 - Config Screens Are Low-Effort
 */

export interface ValidationResult {
  isValid: boolean
  error?: string
}

export interface AppValidationErrors {
  title?: string
  url?: string
  publisher?: string
  version?: string
  appId?: string
}

/**
 * Validates an app title
 */
export function validateTitle(title: string): ValidationResult {
  const trimmed = title.trim()
  
  if (!trimmed) {
    return { isValid: false, error: "App title is required" }
  }
  
  if (trimmed.length < 2) {
    return { isValid: false, error: "Title must be at least 2 characters" }
  }
  
  if (trimmed.length > 100) {
    return { isValid: false, error: "Title must be less than 100 characters" }
  }
  
  return { isValid: true }
}

/**
 * Validates a URL for web applications
 */
export function validateUrl(url: string, appType: "web" | "native"): ValidationResult {
  if (appType === "native") {
    return { isValid: true } // Native apps don't need URLs
  }
  
  const trimmed = url.trim()
  
  if (!trimmed) {
    return { isValid: false, error: "URL is required for web apps" }
  }
  
  try {
    const parsedUrl = new URL(trimmed)
    
    // Check for valid protocols
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return { isValid: false, error: "URL must use http:// or https://" }
    }
    
    // Check for valid hostname
    if (!parsedUrl.hostname) {
      return { isValid: false, error: "URL must include a valid hostname" }
    }
    
    return { isValid: true }
  } catch {
    return { isValid: false, error: "Please enter a valid URL" }
  }
}

/**
 * Validates a publisher name
 */
export function validatePublisher(publisher: string): ValidationResult {
  const trimmed = publisher.trim()
  
  if (!trimmed) {
    return { isValid: false, error: "Publisher is required" }
  }
  
  if (trimmed.length < 2) {
    return { isValid: false, error: "Publisher name must be at least 2 characters" }
  }
  
  if (trimmed.length > 50) {
    return { isValid: false, error: "Publisher name must be less than 50 characters" }
  }
  
  return { isValid: true }
}

/**
 * Validates a version string (semantic versioning)
 */
export function validateVersion(version: string): ValidationResult {
  const trimmed = version.trim()
  
  if (!trimmed) {
    return { isValid: false, error: "Version is required" }
  }
  
  // Check semantic versioning format (x.y.z)
  const semverRegex = /^\d+\.\d+\.\d+$/
  if (!semverRegex.test(trimmed)) {
    return { isValid: false, error: "Version must be in format x.y.z (e.g., 1.0.0)" }
  }
  
  return { isValid: true }
}

/**
 * Validates an app ID
 */
export function validateAppId(appId: string): ValidationResult {
  const trimmed = appId.trim()
  
  if (!trimmed) {
    return { isValid: false, error: "App ID is required" }
  }
  
  if (trimmed.length < 3) {
    return { isValid: false, error: "App ID must be at least 3 characters" }
  }
  
  if (trimmed.length > 50) {
    return { isValid: false, error: "App ID must be less than 50 characters" }
  }
  
  // Check for valid characters (alphanumeric, hyphens, underscores, dots)
  const validIdRegex = /^[a-zA-Z0-9._-]+$/
  if (!validIdRegex.test(trimmed)) {
    return { isValid: false, error: "App ID can only contain letters, numbers, dots, hyphens, and underscores" }
  }
  
  // Cannot start or end with special characters
  if (/^[._-]|[._-]$/.test(trimmed)) {
    return { isValid: false, error: "App ID cannot start or end with dots, hyphens, or underscores" }
  }
  
  return { isValid: true }
}

/**
 * Validates a description
 */
export function validateDescription(description: string): ValidationResult {
  const trimmed = description.trim()
  
  if (trimmed.length > 500) {
    return { isValid: false, error: "Description must be less than 500 characters" }
  }
  
  return { isValid: true }
}

/**
 * Validates an image file
 */
export function validateImageFile(file: File): ValidationResult {
  // Check file size (5MB limit)
  const maxSize = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSize) {
    return { isValid: false, error: "File size must be less than 5MB" }
  }
  
  // Check file type
  if (!file.type.startsWith('image/')) {
    return { isValid: false, error: "Please select an image file" }
  }
  
  // Check for supported formats
  const supportedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
  if (!supportedTypes.includes(file.type)) {
    return { isValid: false, error: "Supported formats: JPEG, PNG, GIF, WebP, SVG" }
  }
  
  return { isValid: true }
}

/**
 * Validates an image URL
 */
export function validateImageUrl(url: string): ValidationResult {
  const trimmed = url.trim()
  
  if (!trimmed) {
    return { isValid: false, error: "Image URL is required" }
  }
  
  try {
    const parsedUrl = new URL(trimmed)
    
    // Check for valid protocols
    if (!['http:', 'https:', 'data:'].includes(parsedUrl.protocol)) {
      return { isValid: false, error: "Image URL must use http://, https://, or data: protocol" }
    }
    
    return { isValid: true }
  } catch {
    return { isValid: false, error: "Please enter a valid image URL" }
  }
}

/**
 * Validates a tag/category name
 */
export function validateTag(tag: string): ValidationResult {
  const trimmed = tag.trim()
  
  if (!trimmed) {
    return { isValid: false, error: "Tag cannot be empty" }
  }
  
  if (trimmed.length < 2) {
    return { isValid: false, error: "Tag must be at least 2 characters" }
  }
  
  if (trimmed.length > 30) {
    return { isValid: false, error: "Tag must be less than 30 characters" }
  }
  
  // Check for valid characters (alphanumeric, spaces, hyphens)
  const validTagRegex = /^[a-zA-Z0-9\s-]+$/
  if (!validTagRegex.test(trimmed)) {
    return { isValid: false, error: "Tag can only contain letters, numbers, spaces, and hyphens" }
  }
  
  return { isValid: true }
}

/**
 * Validates an intent name
 */
export function validateIntentName(intentName: string): ValidationResult {
  const trimmed = intentName.trim()
  
  if (!trimmed) {
    return { isValid: false, error: "Intent name is required" }
  }
  
  if (trimmed.length < 2) {
    return { isValid: false, error: "Intent name must be at least 2 characters" }
  }
  
  if (trimmed.length > 50) {
    return { isValid: false, error: "Intent name must be less than 50 characters" }
  }
  
  // Check for valid characters (alphanumeric, dots, hyphens, underscores)
  const validIntentRegex = /^[a-zA-Z0-9._-]+$/
  if (!validIntentRegex.test(trimmed)) {
    return { isValid: false, error: "Intent name can only contain letters, numbers, dots, hyphens, and underscores" }
  }
  
  return { isValid: true }
}

/**
 * Validates a context type
 */
export function validateContextType(contextType: string): ValidationResult {
  const trimmed = contextType.trim()
  
  if (!trimmed) {
    return { isValid: false, error: "Context type is required" }
  }
  
  if (trimmed.length < 3) {
    return { isValid: false, error: "Context type must be at least 3 characters" }
  }
  
  if (trimmed.length > 50) {
    return { isValid: false, error: "Context type must be less than 50 characters" }
  }
  
  // Check for valid format (typically namespace.type)
  const validContextRegex = /^[a-zA-Z0-9._-]+$/
  if (!validContextRegex.test(trimmed)) {
    return { isValid: false, error: "Context type can only contain letters, numbers, dots, hyphens, and underscores" }
  }
  
  return { isValid: true }
}

/**
 * Comprehensive validation for an entire app configuration
 */
export function validateApp(app: {
  id: string
  title: string
  type: "web" | "native"
  url: string
  publisher: string
  version: string
  description: string
}): AppValidationErrors {
  const errors: AppValidationErrors = {}
  
  const titleResult = validateTitle(app.title)
  if (!titleResult.isValid) {
    errors.title = titleResult.error
  }
  
  const urlResult = validateUrl(app.url, app.type)
  if (!urlResult.isValid) {
    errors.url = urlResult.error
  }
  
  const publisherResult = validatePublisher(app.publisher)
  if (!publisherResult.isValid) {
    errors.publisher = publisherResult.error
  }
  
  const versionResult = validateVersion(app.version)
  if (!versionResult.isValid) {
    errors.version = versionResult.error
  }
  
  const appIdResult = validateAppId(app.id)
  if (!appIdResult.isValid) {
    errors.appId = appIdResult.error
  }
  
  return errors
}

/**
 * Checks if an app has any validation errors
 */
export function hasValidationErrors(errors: AppValidationErrors): boolean {
  return Object.values(errors).some(error => error !== undefined)
}

/**
 * Sanitizes user input to prevent XSS and other security issues
 */
export function sanitizeInput(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000) // Limit length
}

/**
 * Generates a unique app ID suggestion
 */
export function generateAppId(title: string, existingIds: string[]): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/-+/g, '-') // Collapse multiple hyphens
    .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
    .substring(0, 30) // Limit length
  
  if (!base) {
    return generateUniqueId('app', existingIds)
  }
  
  return generateUniqueId(base, existingIds)
}

/**
 * Generates a unique ID by appending numbers if needed
 */
function generateUniqueId(base: string, existingIds: string[]): string {
  let candidate = base
  let counter = 1
  
  while (existingIds.includes(candidate)) {
    candidate = `${base}-${counter}`
    counter++
  }
  
  return candidate
}