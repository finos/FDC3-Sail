import { describe, it, expect, beforeEach, vi } from "vitest"
import { render, screen, fireEvent, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { EnhancedCustomAppList } from "../enhancedCustomApps"
import { getClientState, getServerState } from "@finos/fdc3-sail-common"

// Mock the dependencies
vi.mock("@finos/fdc3-sail-common", () => ({
  getClientState: vi.fn(),
  getServerState: vi.fn(),
}))

vi.mock("react-widgets/Combobox", () => ({
  default: ({ value, onChange, data }: any) => (
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      {data.map((item: string) => (
        <option key={item} value={item}>
          {item}
        </option>
      ))}
    </select>
  ),
}))

vi.mock("react-widgets/Multiselect", () => ({
  default: ({ value, onChange, data }: any) => (
    <select
      multiple
      value={value}
      onChange={(e) =>
        onChange(Array.from(e.target.selectedOptions, (option) => option.value))
      }
    >
      {data.map((item: string) => (
        <option key={item} value={item}>
          {item}
        </option>
      ))}
    </select>
  ),
}))

describe("EnhancedCustomAppList", () => {
  const mockClientState = {
    getCustomApps: vi.fn(),
    setCustomApps: vi.fn(),
    setKnownApps: vi.fn(),
    getKnownApps: vi.fn(),
  }

  const mockServerState = {
    getApplications: vi.fn(),
  }

  beforeEach(() => {
    vi.clearAllMocks()

    mockClientState.getCustomApps.mockReturnValue([])
    mockClientState.setCustomApps.mockResolvedValue(undefined)
    mockClientState.setKnownApps.mockResolvedValue(undefined)
    mockClientState.getKnownApps.mockReturnValue([])
    mockServerState.getApplications.mockResolvedValue([])
    ;(getClientState as any).mockReturnValue(mockClientState)
    ;(getServerState as any).mockReturnValue(mockServerState)
  })

  it("renders the enhanced custom app list", () => {
    render(<EnhancedCustomAppList />)

    expect(screen.getByText("Custom Applications")).toBeInTheDocument()
    expect(
      screen.getByText(
        "Create and manage your custom FDC3 applications with proper icons, screenshots, and metadata.",
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText("Click to Add A New Custom App"),
    ).toBeInTheDocument()
  })

  it("adds a new app when clicking the add button", async () => {
    const user = userEvent.setup()
    render(<EnhancedCustomAppList />)

    const addButton = screen.getByText("Click to Add A New Custom App")
    await user.click(addButton)

    expect(screen.getByDisplayValue("New App")).toBeInTheDocument()
    expect(screen.getByDisplayValue("1.0.0")).toBeInTheDocument()
  })

  it("validates required fields", async () => {
    const user = userEvent.setup()
    render(<EnhancedCustomAppList />)

    // Add a new app
    const addButton = screen.getByText("Click to Add A New Custom App")
    await user.click(addButton)

    // Clear the title field
    const titleInput = screen.getByDisplayValue("New App")
    await user.clear(titleInput)
    await user.tab() // Trigger validation

    await waitFor(() => {
      expect(screen.getByText("App title is required")).toBeInTheDocument()
    })
  })

  it("validates URL format for web apps", async () => {
    const user = userEvent.setup()
    render(<EnhancedCustomAppList />)

    // Add a new app
    const addButton = screen.getByText("Click to Add A New Custom App")
    await user.click(addButton)

    // Enter invalid URL
    const urlInput = screen.getByPlaceholderText("https://your-app.com")
    await user.type(urlInput, "invalid-url")
    await user.tab()

    await waitFor(() => {
      expect(screen.getByText("Please enter a valid URL")).toBeInTheDocument()
    })
  })

  it("validates version format", async () => {
    const user = userEvent.setup()
    render(<EnhancedCustomAppList />)

    // Add a new app
    const addButton = screen.getByText("Click to Add A New Custom App")
    await user.click(addButton)

    // Enter invalid version
    const versionInput = screen.getByDisplayValue("1.0.0")
    await user.clear(versionInput)
    await user.type(versionInput, "invalid")
    await user.tab()

    await waitFor(() => {
      expect(
        screen.getByText("Version must be in format x.y.z"),
      ).toBeInTheDocument()
    })
  })

  it("detects duplicate app IDs", async () => {
    const user = userEvent.setup()

    // Mock existing app
    mockClientState.getCustomApps.mockReturnValue([
      {
        appId: "existing-app",
        title: "Existing App",
        type: "web",
        details: { url: "https://example.com" },
        description: "Test app",
        publisher: "Test Publisher",
        version: "1.0.0",
        icons: [{ src: "/test-icon.png" }],
        screenshots: [{ src: "/test-screenshot.png" }],
        interop: { intents: { listensFor: {} } },
      },
    ])

    render(<EnhancedCustomAppList />)

    // Add a new app
    const addButton = screen.getByText("Click to Add A New Custom App")
    await user.click(addButton)

    // Set duplicate ID
    const idInputs = screen.getAllByDisplayValue(/^app-/)
    await user.clear(idInputs[1]) // Second app (new one)
    await user.type(idInputs[1], "existing-app")

    await waitFor(() => {
      expect(screen.getByText("(Duplicate ID)")).toBeInTheDocument()
    })
  })

  it("adds and removes tags", async () => {
    const user = userEvent.setup()
    render(<EnhancedCustomAppList />)

    // Add a new app
    const addButton = screen.getByText("Click to Add A New Custom App")
    await user.click(addButton)

    // Add a tag
    const tagInput = screen.getByPlaceholderText("Add category/tag")
    await user.type(tagInput, "finance")

    const addTagButton = screen.getByText("Add")
    await user.click(addTagButton)

    expect(screen.getByText("finance")).toBeInTheDocument()

    // Remove the tag
    const removeTagButton = screen.getByText("×")
    await user.click(removeTagButton)

    expect(screen.queryByText("finance")).not.toBeInTheDocument()
  })

  it("handles file upload for icons", async () => {
    const user = userEvent.setup()
    render(<EnhancedCustomAppList />)

    // Add a new app
    const addButton = screen.getByText("Click to Add A New Custom App")
    await user.click(addButton)

    // Mock file
    const file = new File(["test"], "test-icon.png", { type: "image/png" })

    // Find file input and upload
    const fileInput = screen.getByLabelText(/upload image/i)
    await user.upload(fileInput, file)

    // Should update the image preview (data URL will be set)
    await waitFor(() => {
      const img = screen.getByAltText("App Icon")
      expect(img).toHaveAttribute("src", expect.stringContaining("data:"))
    })
  })

  it("rejects oversized files", async () => {
    const user = userEvent.setup()

    // Mock alert
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {})

    render(<EnhancedCustomAppList />)

    // Add a new app
    const addButton = screen.getByText("Click to Add A New Custom App")
    await user.click(addButton)

    // Mock oversized file (6MB)
    const largeFile = new File(["x".repeat(6 * 1024 * 1024)], "large.png", {
      type: "image/png",
    })

    const fileInput = screen.getByLabelText(/upload image/i)
    await user.upload(fileInput, largeFile)

    expect(alertSpy).toHaveBeenCalledWith("File size must be less than 5MB")

    alertSpy.mockRestore()
  })

  it("rejects non-image files", async () => {
    const user = userEvent.setup()

    // Mock alert
    const alertSpy = vi.spyOn(window, "alert").mockImplementation(() => {})

    render(<EnhancedCustomAppList />)

    // Add a new app
    const addButton = screen.getByText("Click to Add A New Custom App")
    await user.click(addButton)

    // Mock non-image file
    const textFile = new File(["test"], "test.txt", { type: "text/plain" })

    const fileInput = screen.getByLabelText(/upload image/i)
    await user.upload(fileInput, textFile)

    expect(alertSpy).toHaveBeenCalledWith("Please select an image file")

    alertSpy.mockRestore()
  })

  it("adds and removes intents", async () => {
    const user = userEvent.setup()
    render(<EnhancedCustomAppList />)

    // Add a new app
    const addButton = screen.getByText("Click to Add A New Custom App")
    await user.click(addButton)

    // Add an intent
    const addIntentButton = screen.getByText("Click to Add A New Intent")
    await user.click(addIntentButton)

    // Should show intent configuration
    expect(screen.getByDisplayValue("ViewChart")).toBeInTheDocument()

    // Remove the intent
    const removeIntentButton = screen.getByText("Remove This Intent")
    await user.click(removeIntentButton)

    // Intent should be removed
    expect(screen.queryByDisplayValue("ViewChart")).not.toBeInTheDocument()
  })

  it("switches between web and native app types", async () => {
    const user = userEvent.setup()
    render(<EnhancedCustomAppList />)

    // Add a new app
    const addButton = screen.getByText("Click to Add A New Custom App")
    await user.click(addButton)

    // Should start as web app with URL field
    expect(
      screen.getByPlaceholderText("https://your-app.com"),
    ).toBeInTheDocument()

    // Switch to native
    const typeSelect = screen.getByDisplayValue("Web Application")
    await user.selectOptions(typeSelect, "native")

    // URL field should be hidden for native apps
    expect(
      screen.queryByPlaceholderText("https://your-app.com"),
    ).not.toBeInTheDocument()
  })

  it("saves apps to client state", async () => {
    const user = userEvent.setup()
    render(<EnhancedCustomAppList />)

    // Add a new app
    const addButton = screen.getByText("Click to Add A New Custom App")
    await user.click(addButton)

    // Fill in required fields
    const titleInput = screen.getByDisplayValue("New App")
    await user.clear(titleInput)
    await user.type(titleInput, "Test App")

    const publisherInput = screen.getByPlaceholderText("Your Company Name")
    await user.type(publisherInput, "Test Publisher")

    const urlInput = screen.getByPlaceholderText("https://your-app.com")
    await user.type(urlInput, "https://test-app.com")

    // Trigger save by adding another app (which validates and saves current state)
    await user.click(addButton)

    await waitFor(() => {
      expect(mockClientState.setCustomApps).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            title: "Test App",
            publisher: "Test Publisher",
            details: { url: "https://test-app.com" },
          }),
        ]),
      )
    })
  })
})
