/**
 * SailDirectory - FDC3 Application Directory Implementation
 *
 * This module provides functionality to load and manage FDC3 application directories
 * from both remote URLs and local files. It extends the BasicDirectory class to
 * provide additional features like parallel loading and error handling.
 */

import fs from "node:fs/promises"
import { constants } from "node:fs"
import { BasicDirectory, DirectoryApp } from "@finos/fdc3-web-impl"

/** Type definition for web application details in directory entries */
interface WebAppDetails {
  url: string
}

/** Expected structure of directory data from remote sources or local files */
interface DirectoryData {
  applications: DirectoryApp[]
}

/**
 * SailDirectory - Extended FDC3 application directory with enhanced loading capabilities
 *
 * Extends BasicDirectory to provide:
 * - Parallel loading from multiple sources
 * - Robust error handling and reporting
 * - Duplicate application prevention
 * - URL-based application filtering
 */
export class AppDirectoryManager extends BasicDirectory {
  /**
   * Creates a new SailDirectory instance with empty application list
   */
  constructor() {
    super([])
  }

  /**
   * Fetches application directory data from a remote URL
   *
   * @param url - The remote URL to fetch directory data from
   * @returns Promise resolving to array of DirectoryApp entries
   * @throws Error if fetch fails or data format is invalid
   */
  private async fetchRemoteAppDirectory(url: string): Promise<DirectoryApp[]> {
    try {
      // Fetch data from remote endpoint
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(
          `Failed to fetch ${url}: ${response.status} ${response.statusText}`,
        )
      }

      // Parse and validate JSON response
      const data = (await response.json()) as DirectoryData
      if (!data.applications || !Array.isArray(data.applications)) {
        throw new Error(
          `Invalid data format from ${url}: applications not found or not an array`,
        )
      }

      return data.applications
    } catch (error) {
      // Provide more context in error messages
      throw new Error(
        `Failed to fetch from ${url}: ${error instanceof Error ? error.message : String(error)}`,
      )
    }
  }

  /**
   * Reads application directory data from a local file
   *
   * @param filePath - Path to the local JSON file containing directory data
   * @returns Promise resolving to array of DirectoryApp entries
   * @throws Error if file cannot be read or data format is invalid
   */
  private async readLocalAppDirectory(
    filePath: string,
  ): Promise<DirectoryApp[]> {
    try {
      // Read file contents as UTF-8 string
      const data = await fs.readFile(filePath, { encoding: "utf8" })

      // Parse JSON and validate structure
      const parsed: DirectoryData = JSON.parse(data)
      if (!parsed.applications || !Array.isArray(parsed.applications)) {
        throw new Error(
          `Invalid data format in ${filePath}: applications not found or not an array`,
        )
      }

      return parsed.applications
    } catch (error) {
      // Provide more context in error messages
      if (error instanceof Error) {
        throw new Error(`Failed to load file ${filePath}: ${error.message}`)
      }
      throw error
    }
  }

  /**
   * Determines if a URI is a valid URL (http/https)
   *
   * @param uri - The URI to validate
   * @returns true if URI is a valid URL, false otherwise
   */
  private isValidUrl(uri: string): boolean {
    try {
      const url = new URL(uri)
      return url.protocol === "http:" || url.protocol === "https:"
    } catch {
      return false
    }
  }

  /**
   * Checks if a file path exists and is accessible
   *
   * @param filePath - The file path to check
   * @returns Promise resolving to true if file exists and is accessible
   */
  private async isValidFilePath(filePath: string): Promise<boolean> {
    try {
      await fs.access(filePath, constants.R_OK)
      const stats = await fs.stat(filePath)
      return stats.isFile()
    } catch {
      return false
    }
  }

  /**
   * Loads applications from a single source and adds them to the directory
   * Prevents duplicate applications based on appId
   *
   * @param uri - URL or file path to load applications from
   * @throws Error if loading fails
   */
  async loadDirectory(uri: string): Promise<void> {
    try {
      // Validate input parameter
      if (!uri || typeof uri !== "string") {
        throw new Error("URI must be a non-empty string")
      }

      // Determine resource type and validate accordingly
      let apps: DirectoryApp[]

      if (this.isValidUrl(uri)) {
        // Handle as remote URL
        apps = await this.fetchRemoteAppDirectory(uri)
      } else {
        // Handle as local file path
        const isValidFile = await this.isValidFilePath(uri)
        if (!isValidFile) {
          throw new Error(`File does not exist or is not accessible: ${uri}`)
        }
        apps = await this.readLocalAppDirectory(uri)
      }

      // Add non-duplicate apps based on appId
      const existingAppIds = new Set(this.allApps.map((app) => app.appId))
      const newApps = apps.filter((app) => !existingAppIds.has(app.appId))
      this.allApps.push(...newApps)
    } catch (error) {
      const errorMessage = `Failed to load applications from ${uri}: ${
        error instanceof Error ? error.message : String(error)
      }`

      console.error(errorMessage)
      throw new Error(errorMessage) // Re-throw to ensure caller is aware of the failure
    }
  }

  /**
   * Replaces all currently loaded apps with new ones from multiple sources
   * Uses parallel loading for better performance and provides comprehensive error reporting
   *
   * @param urls - Array of URLs or file paths to load applications from
   * @throws Error if urls parameter is not an array or is empty
   */
  async replace(urls: string[]): Promise<void> {
    if (!Array.isArray(urls)) {
      throw new Error("URLs must be an array")
    }

    if (urls.length === 0) {
      this.allApps = []
      console.log("No sources provided - cleared all applications")
      return
    }

    // Clear existing applications
    this.allApps = []

    // Load from all sources in parallel using Promise.allSettled
    // This allows partial success even if some sources fail
    const results = await Promise.allSettled(
      urls.map((url) => this.loadDirectory(url)),
    )

    // Collect errors using filter + map (more functional approach)
    const errors = results
      .map((result, index) =>
        result.status === "rejected"
          ? `Failed to load ${urls[index]}: ${result.reason?.message || result.reason}`
          : null,
      )
      .filter((error): error is string => error !== null)

    // Log results summary
    const successCount = results.filter(
      (result) => result.status === "fulfilled",
    ).length
    console.log(
      `Loaded ${this.allApps.length} apps from ${successCount}/${urls.length} sources`,
    )

    if (errors.length > 0) {
      console.warn("Some sources failed to load:", errors)
    }
  }

  /**
   * Adds a single application to the directory
   * Note: This method does not check for duplicates
   *
   * @param app - The DirectoryApp to add
   */
  add(app: DirectoryApp): void {
    this.allApps.push(app)
  }

  /**
   * Retrieves all web applications that match a specific URL
   * Useful for finding applications associated with a particular website
   *
   * @param url - The URL to search for in web application details
   * @returns Array of DirectoryApp entries matching the URL
   */
  retrieveAppsByUrl(url: string): DirectoryApp[] {
    // Return empty array for invalid input
    if (!url || typeof url !== "string") {
      return []
    }

    // Filter for web apps matching the specified URL
    return this.retrieveAllApps().filter(
      (app) =>
        app.type === "web" && (app.details as WebAppDetails)?.url === url,
    )
  }
}
