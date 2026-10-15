/* eslint-disable @typescript-eslint/no-explicit-any */
import { getClientState, getServerState } from "@finos/fdc3-sail-common"
import styles from "./enhanced-styles.module.css"
import { DirectoryApp, WebAppDetails } from "@finos/fdc3-sail-da-impl"
import { v4 as uuid } from "uuid"
import { InlineButton } from "./shared"
import { intentTypes } from "./intentTypes"
import { CONTEXT_TYPES } from "./contextTypes"
import { STANDARD_FDC3_CATEGORIES } from "./standardCategories"
import {
  parseAppDInput,
  exportAppDRecord,
  exportAppDCatalog,
  downloadJsonFile,
  copyToClipboard,
} from "./appdParser"
import {
  validateApp as runValidateApp,
  validateImageFile,
  AppValidationErrors,
} from "./validation"
import Combobox from "react-widgets/Combobox"
import Multiselect from "react-widgets/Multiselect"
import "react-widgets/styles.css"
import { useState, useRef, useEffect } from "react"

// Types
export type AppType = "web" | "native"

export type AppIcon = {
  src: string
  size?: string
  type?: string
}

export type AppScreenshot = {
  src: string
  label?: string
  size?: string
  type?: string
}

export type EditableIntent = {
  name: string
  displayName?: string
  contexts: string[]
  resultType?: string
}

export type EditableRaisesIntent = {
  name: string
  contexts: string[]
}

export type EnhancedEditableState = {
  id: string
  title: string
  type: AppType
  url: string
  path: string
  arguments: string
  description: string
  tooltip: string
  lang: string
  publisher: string
  version: string
  categories: string[]
  contactEmail: string
  supportEmail: string
  moreInfo: string
  icons: AppIcon[]
  screenshots: AppScreenshot[]
  intents: EditableIntent[]
  raisesIntents: EditableRaisesIntent[]
  userChannelBroadcasts: string[]
  userChannelListensFor: string[]
  errors: AppValidationErrors
}

function checkDuplicateId(
  id: string,
  currentApps: EnhancedEditableState[],
): boolean {
  return currentApps.filter((app) => app.id === id).length > 1
}

function newEnhancedApp(): EnhancedEditableState {
  const newId = "app-" + uuid().substring(0, 8)
  return {
    id: newId,
    title: "",
    type: "web",
    url: "",
    path: "",
    arguments: "",
    description: "",
    tooltip: "",
    lang: "en-US",
    publisher: "FINOS",
    version: "1.0.0",
    categories: [],
    contactEmail: "",
    supportEmail: "",
    moreInfo: "",
    icons: [{ src: "/icons/control/choose-app.svg" }],
    screenshots: [
      { src: "/images/screenshot.webp", label: "Default Screenshot" },
    ],
    intents: [],
    raisesIntents: [],
    userChannelBroadcasts: [],
    userChannelListensFor: [],
    errors: {},
  }
}

// Convert state to DirectoryApp format
export function convertEnhancedToDirectoryApp(
  app: EnhancedEditableState,
): DirectoryApp {
  const listensFor: Record<string, any> = {}
  app.intents.forEach((i) => {
    if (i.name) {
      listensFor[i.name] = {
        displayName: i.displayName || i.name,
        contexts: i.contexts,
        ...(i.resultType ? { resultType: i.resultType } : {}),
      }
    }
  })

  const raises: Record<string, string[]> = {}
  app.raisesIntents.forEach((i) => {
    if (i.name) {
      raises[i.name] = i.contexts
    }
  })

  const interop: any = {}
  if (Object.keys(listensFor).length > 0 || Object.keys(raises).length > 0) {
    interop.intents = {}
    if (Object.keys(listensFor).length > 0)
      interop.intents.listensFor = listensFor
    if (Object.keys(raises).length > 0) interop.intents.raises = raises
  }

  if (
    app.userChannelBroadcasts.length > 0 ||
    app.userChannelListensFor.length > 0
  ) {
    interop.userChannels = {
      broadcasts: app.userChannelBroadcasts,
      listensFor: app.userChannelListensFor,
    }
  }

  const details: any =
    app.type === "web"
      ? { url: app.url }
      : {
          path: app.path,
          ...(app.arguments ? { arguments: app.arguments } : {}),
        }

  return {
    appId: app.id,
    title: app.title,
    name: app.title,
    details,
    type: app.type,
    description: app.description,
    tooltip: app.tooltip || undefined,
    lang: app.lang || "en-US",
    publisher: app.publisher,
    version: app.version,
    categories: app.categories,
    icons: app.icons,
    screenshots: app.screenshots,
    ...(app.contactEmail ? { contactEmail: app.contactEmail } : {}),
    ...(app.supportEmail ? { supportEmail: app.supportEmail } : {}),
    ...(app.moreInfo ? { moreInfo: app.moreInfo } : {}),
    ...(Object.keys(interop).length > 0 ? { interop } : {}),
  }
}

export function convertEnhancedToDirectoryApps(
  apps: EnhancedEditableState[],
): DirectoryApp[] {
  return apps.map(convertEnhancedToDirectoryApp)
}

// Convert DirectoryApp format to state
export function convertFromDirectoryApp(
  a: DirectoryApp,
): EnhancedEditableState {
  const lf = a.interop?.intents?.listensFor ?? {}
  const rf = a.interop?.intents?.raises ?? {}

  const intents: EditableIntent[] = Array.isArray(lf)
    ? lf.map((intent: any) => ({
        name: intent.name || intent.intent || "",
        displayName: intent.displayName || intent.name || "",
        contexts: intent.contexts || [],
        resultType: intent.resultType || "",
      }))
    : Object.keys(lf).map((k) => {
        const val = lf[k] ?? { contexts: [] }
        return {
          name: k,
          displayName: val.displayName || k,
          contexts: val.contexts || [],
          resultType: val.resultType || "",
        }
      })

  const raisesIntents: EditableRaisesIntent[] = Array.isArray(rf)
    ? rf.map((intent: any) => ({
        name: intent.name || intent.intent || "",
        contexts: intent.contexts || [],
      }))
    : Object.keys(rf).map((k) => ({
        name: k,
        contexts: Array.isArray(rf[k]) ? rf[k] : [],
      }))

  const webDetails = a.details as WebAppDetails
  const nativeDetails = a.details as any

  return {
    id: a.appId,
    type: (a.type === "native" ? "native" : "web") as AppType,
    url: webDetails?.url ?? "",
    path: nativeDetails?.path ?? "",
    arguments: nativeDetails?.arguments ?? "",
    title: a.title,
    description: a.description ?? "",
    tooltip: a.tooltip ?? "",
    lang: a.lang ?? "en-US",
    publisher: a.publisher ?? "FINOS",
    version: a.version ?? "1.0.0",
    categories: a.categories ?? [],
    contactEmail: a.contactEmail ?? "",
    supportEmail: a.supportEmail ?? "",
    moreInfo: a.moreInfo ?? "",
    icons: a.icons?.length
      ? a.icons
      : [{ src: "/icons/control/choose-app.svg" }],
    screenshots: a.screenshots?.length
      ? a.screenshots
      : [{ src: "/images/screenshot.webp", label: "Default Screenshot" }],
    intents,
    raisesIntents,
    userChannelBroadcasts: a.interop?.userChannels?.broadcasts ?? [],
    userChannelListensFor: a.interop?.userChannels?.listensFor ?? [],
    errors: {},
  }
}

export function convertFromDirectoryApps(
  apps: DirectoryApp[],
): EnhancedEditableState[] {
  return apps.map(convertFromDirectoryApp)
}

function validateApp(app: EnhancedEditableState): EnhancedEditableState {
  const errors = runValidateApp({
    id: app.id,
    title: app.title,
    type: app.type,
    url: app.url,
    publisher: app.publisher,
    version: app.version,
    description: app.description,
    contactEmail: app.contactEmail,
    supportEmail: app.supportEmail,
    moreInfo: app.moreInfo,
  })

  return { ...app, errors }
}

// File upload utility
function uploadFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// UI Sub-components
const ValidationError = ({ error }: { error?: string }) => {
  if (!error) return null
  return <div className={styles.validationError}>{error}</div>
}

const ImageUpload = ({
  label,
  currentSrc,
  onUpload,
}: {
  label: string
  currentSrc: string
  onUpload: (src: string) => void
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]
    if (file) {
      const validation = validateImageFile(file)
      if (!validation.isValid) {
        alert(validation.error)
        return
      }

      try {
        const dataUrl = await uploadFile(file)
        onUpload(dataUrl)
      } catch {
        alert("Failed to read image file.")
      }
    }
  }

  return (
    <div className={styles.imageUpload}>
      <label className={styles.fieldLabel}>{label}:</label>
      <div className={styles.imageUploadContainer}>
        <img
          src={currentSrc}
          alt={label}
          className={styles.imagePreview}
          onError={(e) => {
            ;(e.target as HTMLImageElement).src =
              "/icons/control/choose-app.svg"
          }}
        />
        <div className={styles.imageUploadControls}>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className={styles.hiddenFileInput}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className={styles.uploadButton}
          >
            Upload File
          </button>
          <input
            type="text"
            value={currentSrc}
            onChange={(e) => onUpload(e.target.value)}
            placeholder="Or enter image URL"
            className={styles.urlInput}
          />
        </div>
      </div>
    </div>
  )
}

const CategoryEditor = ({
  categories,
  onUpdate,
}: {
  categories: string[]
  onUpdate: (cats: string[]) => void
}) => {
  const [newCat, setNewCat] = useState("")

  const addCategory = (catToAdd: string) => {
    const trimmed = catToAdd.trim().toLowerCase()
    if (trimmed && !categories.includes(trimmed)) {
      onUpdate([...categories, trimmed])
      setNewCat("")
    }
  }

  const removeCategory = (catToRemove: string) => {
    onUpdate(categories.filter((c) => c !== catToRemove))
  }

  const suggestedCategories = STANDARD_FDC3_CATEGORIES.filter(
    (c) => !categories.includes(c),
  )

  return (
    <div className={styles.tagEditor}>
      <label className={styles.fieldLabel}>Categories & Tags:</label>
      <div className={styles.tagList}>
        {categories.map((cat) => (
          <span key={cat} className={styles.tag}>
            {cat}
            <button
              type="button"
              onClick={() => removeCategory(cat)}
              className={styles.tagRemove}
              title="Remove category"
            >
              ×
            </button>
          </span>
        ))}
      </div>

      <div className={styles.tagInput}>
        <Combobox
          hideEmptyPopup
          data={suggestedCategories}
          value={newCat}
          onChange={(val: any) => setNewCat(typeof val === "string" ? val : "")}
          placeholder="Select FDC3 standard category or type custom"
          className={styles.input}
        />
        <button
          type="button"
          onClick={() => addCategory(newCat)}
          className={styles.addTagButton}
        >
          Add
        </button>
      </div>
    </div>
  )
}

const IntentPicker = ({
  name,
  update,
}: {
  name: string
  update: (x: string) => void
}) => {
  const allIntents = [
    ...new Set([
      ...intentTypes.map((i) => i.title),
      "ViewChart",
      "ViewNews",
      "StartChat",
      "ViewQuote",
      "ViewAnalysis",
      "ShowInstrument",
    ]),
  ].sort()

  return (
    <div className={styles.picker}>
      <Combobox
        hideEmptyPopup
        data={allIntents}
        value={name}
        onChange={update}
        placeholder="Select or enter intent"
      />
    </div>
  )
}

const ContextPicker = ({
  contextTypes,
  update,
}: {
  contextTypes: string[]
  update: (x: string[]) => void
}) => {
  const allContexts = [
    ...new Set([
      ...CONTEXT_TYPES,
      "fdc3.instrument",
      "fdc3.country",
      "fdc3.organization",
      "fdc3.contact",
      "fdc3.chart",
      "fdc3.transactionResult",
    ]),
  ].sort()

  return (
    <div className={styles.contexts}>
      <Multiselect
        value={contextTypes}
        data={allContexts}
        allowCreate="onFilter"
        onChange={update}
        placeholder="Select or add FDC3 context types"
        onCreate={(n) => {
          update([...contextTypes, n])
        }}
      />
    </div>
  )
}

// Modal for Exporting AppD JSON
const ExportModal = ({
  title,
  app,
  apps,
  onClose,
}: {
  title: string
  app?: EnhancedEditableState
  apps?: EnhancedEditableState[]
  onClose: () => void
}) => {
  const [copied, setCopied] = useState(false)

  const jsonContent = app
    ? exportAppDRecord(convertEnhancedToDirectoryApp(app))
    : apps
      ? exportAppDCatalog(convertEnhancedToDirectoryApps(apps))
      : ""

  const handleCopy = async () => {
    const success = await copyToClipboard(jsonContent)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDownload = () => {
    const filename = app ? `${app.id || "app"}-appd.json` : "appd-catalog.json"
    downloadJsonFile(filename, jsonContent)
  }

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modalDialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>{title}</h3>
          <button className={styles.modalClose} onClick={onClose}>
            ×
          </button>
        </div>
        <div className={styles.modalBody}>
          <p style={{ margin: "0", color: "#666", fontSize: "0.9rem" }}>
            Below is the valid FDC3 Application Directory record (JSON format):
          </p>
          <pre className={styles.jsonViewer}>{jsonContent}</pre>
        </div>
        <div className={styles.modalFooter}>
          {copied && (
            <span className={styles.copiedToast}>✓ Copied to clipboard!</span>
          )}
          <button className={styles.outlineButton} onClick={handleCopy}>
            📋 Copy JSON
          </button>
          <button className={styles.primaryButton} onClick={handleDownload}>
            ⬇ Download .json
          </button>
          <button className={styles.secondaryButton} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

// Modal for Importing / Pasting AppD Records
const ImportModal = ({
  onImport,
  onClose,
}: {
  onImport: (newApps: DirectoryApp[], overwrite: boolean) => void
  onClose: () => void
}) => {
  const [activeTab, setActiveTab] = useState<"paste" | "upload" | "url">(
    "paste",
  )
  const [jsonText, setJsonText] = useState("")
  const [remoteUrl, setRemoteUrl] = useState("")
  const [overwrite, setOverwrite] = useState(true)
  const [parseResult, setParseResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Live parse validation
  useEffect(() => {
    if (activeTab === "paste" && jsonText.trim()) {
      const res = parseAppDInput(jsonText)
      setParseResult(res)
    } else if (activeTab === "paste") {
      setParseResult(null)
    }
  }, [jsonText, activeTab])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = () => {
        const content = reader.result as string
        setJsonText(content)
        const res = parseAppDInput(content)
        setParseResult(res)
      }
      reader.readAsText(file)
    }
  }

  const handleFetchUrl = async () => {
    if (!remoteUrl.trim()) return
    setLoading(true)
    try {
      const res = await fetch(remoteUrl.trim())
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}: ${res.statusText}`)
      }
      const data = await res.text()
      setJsonText(data)
      const parsed = parseAppDInput(data)
      setParseResult(parsed)
    } catch (err: any) {
      setParseResult({
        success: false,
        apps: [],
        error: `Failed to fetch AppD URL: ${err.message}`,
        warnings: [],
      })
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmImport = () => {
    if (parseResult?.success && parseResult.apps.length > 0) {
      onImport(parseResult.apps, overwrite)
      onClose()
    }
  }

  return (
    <div className={styles.modalBackdrop} onClick={onClose}>
      <div className={styles.modalDialog} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h3>Paste / Import AppD Records</h3>
          <button className={styles.modalClose} onClick={onClose}>
            ×
          </button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.modalTabs}>
            <button
              className={`${styles.modalTab} ${activeTab === "paste" ? styles.modalTabActive : ""}`}
              onClick={() => setActiveTab("paste")}
            >
              Paste JSON
            </button>
            <button
              className={`${styles.modalTab} ${activeTab === "upload" ? styles.modalTabActive : ""}`}
              onClick={() => setActiveTab("upload")}
            >
              Upload .json File
            </button>
            <button
              className={`${styles.modalTab} ${activeTab === "url" ? styles.modalTabActive : ""}`}
              onClick={() => setActiveTab("url")}
            >
              Fetch from AppD URL
            </button>
          </div>

          {activeTab === "paste" && (
            <div>
              <p
                style={{
                  margin: "0 0 0.5rem 0",
                  color: "#666",
                  fontSize: "0.85rem",
                }}
              >
                Paste an FDC3 AppD record, array of records, or App Directory
                catalog:
              </p>
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                placeholder='{\n  "appId": "market-viewer",\n  "title": "Market Viewer",\n  "type": "web",\n  "details": {\n    "url": "https://example.com/app"\n  }\n}'
                className={styles.jsonTextarea}
              />
            </div>
          )}

          {activeTab === "upload" && (
            <div
              style={{
                textAlign: "center",
                padding: "1.5rem",
                border: "2px dashed #007bff",
                borderRadius: "8px",
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileUpload}
                style={{ display: "none" }}
              />
              <p
                style={{ margin: "0 0 1rem 0", color: "#333", fontWeight: 600 }}
              >
                Select an AppD JSON file from your machine
              </p>
              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => fileInputRef.current?.click()}
              >
                Choose .json File
              </button>
            </div>
          )}

          {activeTab === "url" && (
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                type="url"
                value={remoteUrl}
                onChange={(e) => setRemoteUrl(e.target.value)}
                placeholder="https://directory.fdc3.finos.org/v2/apps/my-app"
                className={styles.input}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className={styles.primaryButton}
                onClick={handleFetchUrl}
                disabled={loading}
              >
                {loading ? "Fetching..." : "Fetch AppD"}
              </button>
            </div>
          )}

          {/* Validation Feedback & Preview */}
          {parseResult && (
            <div className={styles.importPreview}>
              {parseResult.success ? (
                <>
                  <div className={styles.importPreviewHeader}>
                    ✓ Valid AppD Input: {parseResult.apps.length} application(s)
                    detected
                  </div>
                  <div
                    style={{
                      maxHeight: "150px",
                      overflowY: "auto",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.4rem",
                    }}
                  >
                    {parseResult.apps.map((app: DirectoryApp, idx: number) => (
                      <div key={idx} className={styles.previewAppCard}>
                        <div>
                          <span className={styles.previewAppTitle}>
                            {app.title}
                          </span>{" "}
                          <span className={styles.previewAppMeta}>
                            ({app.appId})
                          </span>
                        </div>
                        <span
                          className={`${styles.badge} ${app.type === "native" ? styles.badgeNative : styles.badgeWeb}`}
                        >
                          {app.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div
                  style={{
                    color: "#dc3545",
                    fontWeight: 500,
                    fontSize: "0.9rem",
                  }}
                >
                  ⚠ {parseResult.error}
                </div>
              )}
            </div>
          )}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginTop: "0.5rem",
            }}
          >
            <input
              type="checkbox"
              id="overwriteApps"
              checked={overwrite}
              onChange={(e) => setOverwrite(e.target.checked)}
            />
            <label
              htmlFor="overwriteApps"
              style={{
                fontSize: "0.85rem",
                color: "#495057",
                cursor: "pointer",
              }}
            >
              Overwrite existing custom apps with identical App ID
            </label>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button
            className={styles.primaryButton}
            onClick={handleConfirmImport}
            disabled={!parseResult?.success || parseResult.apps.length === 0}
          >
            Import{" "}
            {parseResult?.success
              ? `(${parseResult.apps.length}) Apps`
              : "Apps"}
          </button>
          <button className={styles.secondaryButton} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// Single App Card Component
const EnhancedCustomAppItem = ({
  app,
  update,
  isDuplicate,
  onExport,
  onDuplicate,
}: {
  app: EnhancedEditableState
  update: (app: EnhancedEditableState | null) => void
  isDuplicate: boolean
  onExport: () => void
  onDuplicate: () => void
}) => {
  const validatedApp = validateApp(app)
  const hasErrors = Object.values(validatedApp.errors).some((error) => error)

  return (
    <div className={`${styles.item} ${hasErrors ? styles.itemWithErrors : ""}`}>
      {/* App Header */}
      <div className={styles.appHeader}>
        <div className={styles.appHeaderLeft}>
          <h3 className={styles.appTitle}>
            {app.title || "Untitled Custom App"}
            {isDuplicate && (
              <span className={styles.duplicateWarning}> (Duplicate ID)</span>
            )}
          </h3>
          <span
            className={`${styles.badge} ${app.type === "native" ? styles.badgeNative : styles.badgeWeb}`}
          >
            {app.type}
          </span>
          <span className={`${styles.badge} ${styles.badgeVersion}`}>
            v{app.version || "1.0.0"}
          </span>
        </div>

        <div className={styles.appHeaderRight}>
          <button
            type="button"
            className={styles.exportButton}
            onClick={onExport}
            title="Export AppD JSON"
          >
            Export JSON
          </button>
          <button
            type="button"
            className={styles.outlineButton}
            onClick={onDuplicate}
            title="Duplicate App"
          >
            Duplicate
          </button>
          <InlineButton
            onClick={() => update(null)}
            text="Remove This App"
            url="/icons/control/bin.svg"
            className={styles.actionButton}
          />
        </div>
      </div>

      <div className={styles.appForm}>
        {/* Basic Identity Section */}
        <div className={styles.formSection}>
          <h4 className={styles.sectionTitle}>1. Basic Identity</h4>

          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label className={styles.fieldLabel}>App ID *:</label>
              <input
                type="text"
                value={app.id}
                onChange={(e) => update({ ...app, id: e.target.value })}
                className={`${styles.input} ${isDuplicate || validatedApp.errors.appId ? styles.inputError : ""}`}
                placeholder="unique-app-id"
              />
              {isDuplicate && <ValidationError error="App ID must be unique" />}
              <ValidationError error={validatedApp.errors.appId} />
            </div>

            <div className={styles.formField}>
              <label className={styles.fieldLabel}>Title *:</label>
              <input
                type="text"
                value={app.title}
                onChange={(e) => update({ ...app, title: e.target.value })}
                className={`${styles.input} ${validatedApp.errors.title ? styles.inputError : ""}`}
                placeholder="Application Display Title"
              />
              <ValidationError error={validatedApp.errors.title} />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label className={styles.fieldLabel}>Publisher *:</label>
              <input
                type="text"
                value={app.publisher}
                onChange={(e) => update({ ...app, publisher: e.target.value })}
                className={`${styles.input} ${validatedApp.errors.publisher ? styles.inputError : ""}`}
                placeholder="Publisher / Organization"
              />
              <ValidationError error={validatedApp.errors.publisher} />
            </div>

            <div className={styles.formField}>
              <label className={styles.fieldLabel}>Version *:</label>
              <input
                type="text"
                value={app.version}
                onChange={(e) => update({ ...app, version: e.target.value })}
                className={`${styles.input} ${validatedApp.errors.version ? styles.inputError : ""}`}
                placeholder="1.0.0"
              />
              <ValidationError error={validatedApp.errors.version} />
            </div>

            <div className={styles.formField}>
              <label className={styles.fieldLabel}>Language Tag:</label>
              <input
                type="text"
                value={app.lang}
                onChange={(e) => update({ ...app, lang: e.target.value })}
                className={styles.input}
                placeholder="en-US"
              />
            </div>
          </div>

          <div className={styles.formField}>
            <label className={styles.fieldLabel}>Tooltip:</label>
            <input
              type="text"
              value={app.tooltip}
              onChange={(e) => update({ ...app, tooltip: e.target.value })}
              className={styles.input}
              placeholder="Short launcher tooltip"
            />
          </div>

          <div className={styles.formField}>
            <label className={styles.fieldLabel}>Description:</label>
            <textarea
              value={app.description}
              onChange={(e) => update({ ...app, description: e.target.value })}
              className={styles.textarea}
              placeholder="Detailed description of the application..."
              rows={2}
            />
          </div>

          <CategoryEditor
            categories={app.categories}
            onUpdate={(categories) => update({ ...app, categories })}
          />
        </div>

        {/* Launch Details */}
        <div className={styles.formSection}>
          <h4 className={styles.sectionTitle}>2. Launch Details</h4>

          <div className={styles.formRow}>
            <div className={styles.formField} style={{ maxWidth: "200px" }}>
              <label className={styles.fieldLabel}>Application Type:</label>
              <select
                value={app.type}
                onChange={(e) =>
                  update({ ...app, type: e.target.value as AppType })
                }
                className={styles.select}
              >
                <option value="web">Web Application</option>
                <option value="native">Native Application</option>
              </select>
            </div>

            {app.type === "web" ? (
              <div className={styles.formField}>
                <label className={styles.fieldLabel}>Web URL *:</label>
                <input
                  type="url"
                  value={app.url}
                  onChange={(e) => update({ ...app, url: e.target.value })}
                  className={`${styles.input} ${validatedApp.errors.url ? styles.inputError : ""}`}
                  placeholder="https://example.com/app"
                />
                <ValidationError error={validatedApp.errors.url} />
              </div>
            ) : (
              <>
                <div className={styles.formField}>
                  <label className={styles.fieldLabel}>Executable Path:</label>
                  <input
                    type="text"
                    value={app.path}
                    onChange={(e) => update({ ...app, path: e.target.value })}
                    className={styles.input}
                    placeholder="C:\Program Files\App\app.exe"
                  />
                </div>
                <div className={styles.formField}>
                  <label className={styles.fieldLabel}>Arguments:</label>
                  <input
                    type="text"
                    value={app.arguments}
                    onChange={(e) =>
                      update({ ...app, arguments: e.target.value })
                    }
                    className={styles.input}
                    placeholder="--port 8080"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        {/* Visual Assets */}
        <div className={styles.formSection}>
          <h4 className={styles.sectionTitle}>
            3. Visual Assets (Icons & Screenshots)
          </h4>

          <div className={styles.formRow}>
            <div className={styles.formField}>
              <ImageUpload
                label="Primary App Icon"
                currentSrc={
                  app.icons[0]?.src || "/icons/control/choose-app.svg"
                }
                onUpload={(src) =>
                  update({
                    ...app,
                    icons: [{ src, type: "image/png" }],
                  })
                }
              />
            </div>

            <div className={styles.formField}>
              <ImageUpload
                label="Application Screenshot"
                currentSrc={
                  app.screenshots[0]?.src || "/images/screenshot.webp"
                }
                onUpload={(src) =>
                  update({
                    ...app,
                    screenshots: [
                      { src, label: "Screenshot", type: "image/png" },
                    ],
                  })
                }
              />
            </div>
          </div>
        </div>

        {/* FDC3 Interop */}
        <div className={styles.formSection}>
          <h4 className={styles.sectionTitle}>
            4. FDC3 Interop (Intents & Channels)
          </h4>

          {/* Listens For */}
          <div style={{ marginBottom: "1rem" }}>
            <div
              className={styles.fieldLabel}
              style={{ marginBottom: "0.5rem" }}
            >
              Intents I Listen To:
            </div>
            {app.intents.map((intent, i) => (
              <div key={i} className={styles.intentItem}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                    flex: 1,
                  }}
                >
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <IntentPicker
                      name={intent.name}
                      update={(name) => {
                        const newIntents = [...app.intents]
                        newIntents[i] = { ...intent, name }
                        update({ ...app, intents: newIntents })
                      }}
                    />
                    <input
                      type="text"
                      value={intent.displayName || ""}
                      onChange={(e) => {
                        const newIntents = [...app.intents]
                        newIntents[i] = {
                          ...intent,
                          displayName: e.target.value,
                        }
                        update({ ...app, intents: newIntents })
                      }}
                      placeholder="Display Name (optional)"
                      className={styles.input}
                      style={{ maxWidth: "200px" }}
                    />
                  </div>
                  <ContextPicker
                    contextTypes={intent.contexts}
                    update={(contexts) => {
                      const newIntents = [...app.intents]
                      newIntents[i] = { ...intent, contexts }
                      update({ ...app, intents: newIntents })
                    }}
                  />
                </div>
                <InlineButton
                  onClick={() => {
                    const newIntents = [...app.intents]
                    newIntents.splice(i, 1)
                    update({ ...app, intents: newIntents })
                  }}
                  text="Remove"
                  url="/icons/control/bin.svg"
                  className={styles.miniButton}
                />
              </div>
            ))}
            <div
              className={styles.addIntent}
              onClick={() => {
                update({
                  ...app,
                  intents: [
                    ...app.intents,
                    {
                      name: "ViewChart",
                      displayName: "View Chart",
                      contexts: ["fdc3.instrument"],
                    },
                  ],
                })
              }}
            >
              <p>+ Add Intent I Listen To</p>
            </div>
          </div>

          {/* Raises */}
          <div style={{ marginBottom: "1rem" }}>
            <div
              className={styles.fieldLabel}
              style={{ marginBottom: "0.5rem" }}
            >
              Intents I Raise:
            </div>
            {app.raisesIntents.map((intent, i) => (
              <div key={i} className={styles.intentItem}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                    flex: 1,
                  }}
                >
                  <IntentPicker
                    name={intent.name}
                    update={(name) => {
                      const newRaises = [...app.raisesIntents]
                      newRaises[i] = { ...intent, name }
                      update({ ...app, raisesIntents: newRaises })
                    }}
                  />
                  <ContextPicker
                    contextTypes={intent.contexts}
                    update={(contexts) => {
                      const newRaises = [...app.raisesIntents]
                      newRaises[i] = { ...intent, contexts }
                      update({ ...app, raisesIntents: newRaises })
                    }}
                  />
                </div>
                <InlineButton
                  onClick={() => {
                    const newRaises = [...app.raisesIntents]
                    newRaises.splice(i, 1)
                    update({ ...app, raisesIntents: newRaises })
                  }}
                  text="Remove"
                  url="/icons/control/bin.svg"
                  className={styles.miniButton}
                />
              </div>
            ))}
            <div
              className={styles.addIntent}
              onClick={() => {
                update({
                  ...app,
                  raisesIntents: [
                    ...app.raisesIntents,
                    { name: "ViewQuote", contexts: ["fdc3.instrument"] },
                  ],
                })
              }}
            >
              <p>+ Add Intent I Raise</p>
            </div>
          </div>

          {/* User Channels Contexts */}
          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label className={styles.fieldLabel}>
                User Channels - Broadcasts:
              </label>
              <ContextPicker
                contextTypes={app.userChannelBroadcasts}
                update={(contexts) =>
                  update({ ...app, userChannelBroadcasts: contexts })
                }
              />
            </div>
            <div className={styles.formField}>
              <label className={styles.fieldLabel}>
                User Channels - Listens For:
              </label>
              <ContextPicker
                contextTypes={app.userChannelListensFor}
                update={(contexts) =>
                  update({ ...app, userChannelListensFor: contexts })
                }
              />
            </div>
          </div>
        </div>

        {/* Contact & Support Section */}
        <div className={styles.formSection}>
          <h4 className={styles.sectionTitle}>5. Contact & Support Info</h4>

          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label className={styles.fieldLabel}>Contact Email:</label>
              <input
                type="email"
                value={app.contactEmail}
                onChange={(e) =>
                  update({ ...app, contactEmail: e.target.value })
                }
                className={`${styles.input} ${validatedApp.errors.contactEmail ? styles.inputError : ""}`}
                placeholder="contact@company.com"
              />
              <ValidationError error={validatedApp.errors.contactEmail} />
            </div>

            <div className={styles.formField}>
              <label className={styles.fieldLabel}>Support Email:</label>
              <input
                type="email"
                value={app.supportEmail}
                onChange={(e) =>
                  update({ ...app, supportEmail: e.target.value })
                }
                className={`${styles.input} ${validatedApp.errors.supportEmail ? styles.inputError : ""}`}
                placeholder="support@company.com"
              />
              <ValidationError error={validatedApp.errors.supportEmail} />
            </div>

            <div className={styles.formField}>
              <label className={styles.fieldLabel}>More Info URL:</label>
              <input
                type="url"
                value={app.moreInfo}
                onChange={(e) => update({ ...app, moreInfo: e.target.value })}
                className={`${styles.input} ${validatedApp.errors.moreInfo ? styles.inputError : ""}`}
                placeholder="https://company.com/docs/app"
              />
              <ValidationError error={validatedApp.errors.moreInfo} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Main Page Component
export const EnhancedCustomAppList = () => {
  const [apps, setApps] = useState<EnhancedEditableState[]>(() =>
    convertFromDirectoryApps(getClientState().getCustomApps()),
  )
  const [exportAppTarget, setExportAppTarget] =
    useState<EnhancedEditableState | null>(null)
  const [showExportAll, setShowExportAll] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)

  async function updateApps(newApps: EnhancedEditableState[]): Promise<void> {
    const validatedApps = newApps.map(validateApp)
    const hasErrors = validatedApps.some((app) =>
      Object.values(app.errors).some((error) => error),
    )

    setApps(validatedApps)

    if (!hasErrors) {
      return getClientState()
        .setCustomApps(convertEnhancedToDirectoryApps(validatedApps))
        .then(async () => {
          getClientState().setKnownApps(
            await getServerState().getApplications(),
          )
        })
    }
  }

  const handleImportApps = async (
    importedApps: DirectoryApp[],
    overwrite: boolean,
  ) => {
    const convertedImported = convertFromDirectoryApps(importedApps)
    const currentList = [...apps]

    convertedImported.forEach((imp) => {
      const existingIdx = currentList.findIndex((a) => a.id === imp.id)
      if (existingIdx >= 0) {
        if (overwrite) {
          currentList[existingIdx] = imp
        } else {
          // Add with new id
          currentList.push({
            ...imp,
            id: `${imp.id}-${uuid().substring(0, 4)}`,
          })
        }
      } else {
        currentList.push(imp)
      }
    })

    await updateApps(currentList)
  }

  const handleDuplicateApp = (app: EnhancedEditableState) => {
    const duplicate: EnhancedEditableState = {
      ...app,
      id: `${app.id}-copy-${uuid().substring(0, 4)}`,
      title: `${app.title} (Copy)`,
    }
    updateApps([...apps, duplicate])
  }

  return (
    <div className={styles.list}>
      {/* Header and Toolbar */}
      <div className={styles.listHeader}>
        <h2>Custom Applications</h2>
        <p>
          Create, edit, import, and export FDC3 Application Directory (AppD)
          records.
        </p>

        <div className={styles.toolbar}>
          <div className={styles.toolbarActions}>
            <button
              type="button"
              className={styles.primaryButton}
              onClick={() => updateApps([...apps, newEnhancedApp()])}
            >
              + Add New App
            </button>
            <button
              type="button"
              className={styles.outlineButton}
              onClick={() => setShowImportModal(true)}
            >
              📋 Paste / Import AppD
            </button>
            <button
              type="button"
              className={styles.exportButton}
              onClick={() => setShowExportAll(true)}
              disabled={apps.length === 0}
            >
              ⬇ Export All AppD ({apps.length})
            </button>
          </div>
        </div>
      </div>

      {/* App List */}
      {apps.map((app) => (
        <EnhancedCustomAppItem
          key={app.id}
          app={app}
          isDuplicate={checkDuplicateId(app.id, apps)}
          onExport={() => setExportAppTarget(app)}
          onDuplicate={() => handleDuplicateApp(app)}
          update={(updatedApp) => {
            if (updatedApp) {
              const idx = apps.findIndex((a) => a.id === app.id)
              const newApps = [...apps]
              newApps[idx] = updatedApp
              updateApps(newApps)
            } else {
              const idx = apps.findIndex((a) => a.id === app.id)
              const newApps = [...apps]
              newApps.splice(idx, 1)
              updateApps(newApps)
            }
          }}
        />
      ))}

      {apps.length === 0 && (
        <div style={{ textAlign: "center", padding: "2rem", color: "#6c757d" }}>
          <p>No custom applications yet.</p>
          <p>
            Click <strong>"+ Add New App"</strong> or{" "}
            <strong>"Paste / Import AppD"</strong> to get started.
          </p>
        </div>
      )}

      {/* Add App Button Card */}
      <div
        className={styles.add}
        onClick={() => updateApps([...apps, newEnhancedApp()])}
      >
        <p>+ Click to Add A New Custom App</p>
      </div>

      {/* Export Single App Modal */}
      {exportAppTarget && (
        <ExportModal
          title={`Export AppD: ${exportAppTarget.title || exportAppTarget.id}`}
          app={exportAppTarget}
          onClose={() => setExportAppTarget(null)}
        />
      )}

      {/* Export All Catalog Modal */}
      {showExportAll && (
        <ExportModal
          title={`Export All Custom Applications (${apps.length})`}
          apps={apps}
          onClose={() => setShowExportAll(false)}
        />
      )}

      {/* Import / Paste AppD Modal */}
      {showImportModal && (
        <ImportModal
          onImport={handleImportApps}
          onClose={() => setShowImportModal(false)}
        />
      )}
    </div>
  )
}
