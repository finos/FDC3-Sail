import { getClientState, getServerState } from "@finos/fdc3-sail-common"
import styles from "./styles.module.css"
import { DirectoryApp, WebAppDetails } from "@finos/fdc3-sail-da-impl"
import { v4 as uuid } from "uuid"
import { InlineButton } from "./shared"
import { intentTypes } from "./intentTypes"
import { CONTEXT_TYPES } from "./contextTypes"
import Combobox from "react-widgets/Combobox"
import Multiselect from "react-widgets/Multiselect"
import "react-widgets/styles.css"
import { useState, useRef } from "react"

// Enhanced types for better app configuration
type EditableIntent = {
  name: string
  contexts: string[]
}

type AppType = "web" | "native"

type AppIcon = {
  src: string
  size?: string
  type?: string
}

type AppScreenshot = {
  src: string
  label?: string
  size?: string
  type?: string
}

type EnhancedEditableState = {
  id: string
  title: string
  type: AppType
  url: string
  description: string
  publisher: string
  version: string
  categories: string[]
  icons: AppIcon[]
  screenshots: AppScreenshot[]
  intents: EditableIntent[]
  // Validation state
  errors: {
    title?: string
    url?: string
    publisher?: string
    version?: string
  }
}

// Validation functions
function validateUrl(url: string, type: AppType): string | undefined {
  if (type === "native") return undefined

  if (!url.trim()) return "URL is required for web apps"

  try {
    new URL(url)
    return undefined
  } catch {
    return "Please enter a valid URL"
  }
}

function validateTitle(title: string): string | undefined {
  if (!title.trim()) return "App title is required"
  if (title.length < 2) return "Title must be at least 2 characters"
  return undefined
}

function validatePublisher(publisher: string): string | undefined {
  if (!publisher.trim()) return "Publisher is required"
  return undefined
}

function validateVersion(version: string): string | undefined {
  if (!version.trim()) return "Version is required"
  if (!/^\d+\.\d+\.\d+$/.test(version)) return "Version must be in format x.y.z"
  return undefined
}

function validateApp(app: EnhancedEditableState): EnhancedEditableState {
  const errors = {
    title: validateTitle(app.title),
    url: validateUrl(app.url, app.type),
    publisher: validatePublisher(app.publisher),
    version: validateVersion(app.version),
  }

  return { ...app, errors }
}

function checkDuplicateId(
  id: string,
  currentApps: EnhancedEditableState[],
): boolean {
  return currentApps.filter((app) => app.id === id).length > 1
}

function newEnhancedApp(): EnhancedEditableState {
  return {
    id: "app-" + uuid().substring(0, 8),
    title: "",
    type: "web",
    url: "",
    description: "",
    publisher: "",
    version: "1.0.0",
    categories: [],
    icons: [{ src: "/icons/control/choose-app.svg" }],
    screenshots: [
      { src: "/images/screenshot.webp", label: "Default Screenshot" },
    ],
    intents: [],
    errors: {},
  }
}

// File upload utilities
function uploadFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      // In a real implementation, this would upload to server
      // For now, we'll create a data URL
      resolve(reader.result as string)
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

// Enhanced components
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
      if (file.size > 5 * 1024 * 1024) {
        // 5MB limit
        alert("File size must be less than 5MB")
        return
      }

      if (!file.type.startsWith("image/")) {
        alert("Please select an image file")
        return
      }

      try {
        const dataUrl = await uploadFile(file)
        onUpload(dataUrl)
      } catch {
        alert("Failed to upload image")
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
            Upload Image
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

const ValidationError = ({ error }: { error?: string }) => {
  if (!error) return null
  return <div className={styles.validationError}>{error}</div>
}

const TagEditor = ({
  tags,
  onUpdate,
}: {
  tags: string[]
  onUpdate: (tags: string[]) => void
}) => {
  const [newTag, setNewTag] = useState("")

  const addTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      onUpdate([...tags, newTag.trim()])
      setNewTag("")
    }
  }

  const removeTag = (tagToRemove: string) => {
    onUpdate(tags.filter((tag) => tag !== tagToRemove))
  }

  return (
    <div className={styles.tagEditor}>
      <label className={styles.fieldLabel}>Categories/Tags:</label>
      <div className={styles.tagList}>
        {tags.map((tag) => (
          <span key={tag} className={styles.tag}>
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className={styles.tagRemove}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className={styles.tagInput}>
        <input
          type="text"
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && addTag()}
          placeholder="Add category/tag"
          className={styles.input}
        />
        <button type="button" onClick={addTag} className={styles.addTagButton}>
          Add
        </button>
      </div>
    </div>
  )
}

const EnhancedCustomAppItem = ({
  app,
  update,
  isDuplicate,
}: {
  app: EnhancedEditableState
  update: (app: EnhancedEditableState | null) => void
  isDuplicate: boolean
}) => {
  const validatedApp = validateApp(app)
  const hasErrors = Object.values(validatedApp.errors).some((error) => error)

  return (
    <div className={`${styles.item} ${hasErrors ? styles.itemWithErrors : ""}`}>
      <div className={styles.appHeader}>
        <h3 className={styles.appTitle}>
          {app.title || "New App"}
          {isDuplicate && (
            <span className={styles.duplicateWarning}> (Duplicate ID)</span>
          )}
        </h3>
        <InlineButton
          onClick={() => update(null)}
          text="Remove This App"
          url="/icons/control/bin.svg"
          className={styles.actionButton}
        />
      </div>

      <div className={styles.appForm}>
        {/* Basic Information */}
        <div className={styles.formSection}>
          <h4 className={styles.sectionTitle}>Basic Information</h4>

          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label className={styles.fieldLabel}>App ID:</label>
              <input
                type="text"
                value={app.id}
                onChange={(e) => update({ ...app, id: e.target.value })}
                className={`${styles.input} ${isDuplicate ? styles.inputError : ""}`}
                placeholder="unique-app-id"
              />
              {isDuplicate && <ValidationError error="App ID must be unique" />}
            </div>

            <div className={styles.formField}>
              <label className={styles.fieldLabel}>Title *:</label>
              <input
                type="text"
                value={app.title}
                onChange={(e) => update({ ...app, title: e.target.value })}
                className={`${styles.input} ${validatedApp.errors.title ? styles.inputError : ""}`}
                placeholder="My Awesome App"
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
                placeholder="Your Company Name"
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
          </div>

          <div className={styles.formField}>
            <label className={styles.fieldLabel}>Description:</label>
            <textarea
              value={app.description}
              onChange={(e) => update({ ...app, description: e.target.value })}
              className={styles.textarea}
              placeholder="Describe what your app does..."
              rows={3}
            />
          </div>

          <TagEditor
            tags={app.categories}
            onUpdate={(categories) => update({ ...app, categories })}
          />
        </div>

        {/* App Type & URL */}
        <div className={styles.formSection}>
          <h4 className={styles.sectionTitle}>Application Details</h4>

          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label className={styles.fieldLabel}>Type:</label>
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

            {app.type === "web" && (
              <div className={styles.formField}>
                <label className={styles.fieldLabel}>URL *:</label>
                <input
                  type="url"
                  value={app.url}
                  onChange={(e) => update({ ...app, url: e.target.value })}
                  className={`${styles.input} ${validatedApp.errors.url ? styles.inputError : ""}`}
                  placeholder="https://your-app.com"
                />
                <ValidationError error={validatedApp.errors.url} />
              </div>
            )}
          </div>
        </div>

        {/* Visual Assets */}
        <div className={styles.formSection}>
          <h4 className={styles.sectionTitle}>Visual Assets</h4>

          <ImageUpload
            label="App Icon"
            currentSrc={app.icons[0]?.src || "/icons/control/choose-app.svg"}
            onUpload={(src) =>
              update({
                ...app,
                icons: [{ src, type: "image/png" }],
              })
            }
          />

          <ImageUpload
            label="Screenshot"
            currentSrc={app.screenshots[0]?.src || "/images/screenshot.webp"}
            onUpload={(src) =>
              update({
                ...app,
                screenshots: [
                  { src, label: "App Screenshot", type: "image/png" },
                ],
              })
            }
          />
        </div>

        {/* Intents Configuration */}
        <div className={styles.formSection}>
          <h4 className={styles.sectionTitle}>FDC3 Intents</h4>
          <InteropList app={app} update={update} />
        </div>
      </div>
    </div>
  )
}

// Keep existing InteropList component but update the interface
const InteropList = ({
  app,
  update,
}: {
  app: EnhancedEditableState
  update: (d: EnhancedEditableState) => void
}) => {
  return (
    <div className={styles.interop}>
      <div className={styles.addIntent}>Intents I Listen To:</div>
      {app.intents.map((e, i) => (
        <IntentItem
          key={i}
          ei={e}
          update={(ei: EditableIntent | null) => {
            if (ei) {
              const newState = { ...app, intents: [...app.intents] }
              newState.intents[i] = ei
              update(newState)
            } else {
              const newIntents = [...app.intents]
              newIntents.splice(i, 1)
              const newState = { ...app, intents: newIntents }
              update(newState)
            }
          }}
        />
      ))}

      <AddIntentButton
        onClick={() => {
          const newState = { ...app, intents: [...app.intents] }
          newState.intents.push({
            name: intentTypes[0]?.title || "ViewChart",
            contexts: [CONTEXT_TYPES[0] || "fdc3.instrument"],
          })
          update(newState)
        }}
      />
    </div>
  )
}

// Keep existing helper components
const AddButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <div className={styles.add} onClick={onClick}>
      <p>Click to Add A New Custom App</p>
    </div>
  )
}

const AddIntentButton = ({ onClick }: { onClick: () => void }) => {
  return (
    <div className={styles.addIntent} onClick={onClick}>
      <p>Click to Add A New Intent</p>
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
  const getAllIntentNames = (): string[] => {
    const allIntents = intentTypes.map((i) => i.title)
    // Add existing intents from other apps
    getClientState()
      .getKnownApps()
      .forEach((a) => {
        if (a.interop?.intents?.listensFor) {
          allIntents.push(...Object.keys(a.interop.intents.listensFor))
        }
      })
    return [...new Set(allIntents)].sort()
  }

  return (
    <div className={styles.picker}>
      <Combobox
        hideEmptyPopup
        data={getAllIntentNames()}
        value={name}
        onChange={update}
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
  const getAllContextTypes = (): string[] => {
    const allContexts = [...CONTEXT_TYPES]
    // Add existing contexts from other apps
    getClientState()
      .getKnownApps()
      .forEach((a) => {
        if (a.interop?.intents?.listensFor) {
          Object.values(a.interop.intents.listensFor).forEach((v) => {
            allContexts.push(...v.contexts)
          })
        }
      })
    return [...new Set(allContexts)].sort()
  }

  return (
    <div className={styles.contexts}>
      <Multiselect
        value={contextTypes}
        data={getAllContextTypes()}
        allowCreate="onFilter"
        onChange={update}
        onCreate={(n) => {
          update([...contextTypes, n])
        }}
      />
    </div>
  )
}

const IntentItem = ({
  ei,
  update,
}: {
  ei: EditableIntent
  update: (ei: EditableIntent | null) => void
}) => {
  return (
    <div className={styles.intentItem}>
      <IntentPicker
        name={ei.name}
        update={(x) => {
          const ei2 = { ...ei, name: x }
          update(ei2)
        }}
      />

      <ContextPicker
        contextTypes={ei.contexts}
        update={(x) => {
          const ei2 = { ...ei, contexts: x }
          update(ei2)
        }}
      />

      <div className={styles.rowicon}>
        <InlineButton
          onClick={() => update(null)}
          text="Remove This Intent"
          url="/icons/control/bin.svg"
          className={styles.miniButton}
        />
      </div>
    </div>
  )
}

// Convert enhanced state to DirectoryApp format
function convertEnhancedToDirectoryApps(
  apps: EnhancedEditableState[],
): DirectoryApp[] {
  return apps.map((app) => {
    return {
      appId: app.id,
      title: app.title,
      name: app.title,
      details: app.type === "web" ? { url: app.url } : { path: "" },
      type: app.type,
      description: app.description,
      publisher: app.publisher,
      version: app.version,
      categories: app.categories,
      icons: app.icons,
      screenshots: app.screenshots,
      interop: {
        intents: {
          listensFor: Object.fromEntries(
            app.intents.map((i) => [
              i.name,
              {
                displayName: i.name,
                contexts: i.contexts,
              },
            ]),
          ),
        },
      },
    }
  })
}

// Convert existing DirectoryApp to enhanced state
function convertFromDirectoryApps(
  apps: DirectoryApp[],
): EnhancedEditableState[] {
  return apps.map((a) => {
    const lf = a.interop?.intents?.listensFor ?? {}
    return {
      id: a.appId,
      type: (a.type === "native" ? "native" : "web") as AppType,
      url: (a.details as WebAppDetails)?.url ?? "",
      title: a.title,
      description: a.description ?? "",
      publisher: a.publisher ?? "FINOS",
      version: a.version ?? "1.0.0",
      categories: a.categories ?? [],
      icons: a.icons ?? [{ src: "/icons/control/choose-app.svg" }],
      screenshots: a.screenshots ?? [{ src: "/images/screenshot.webp" }],
      intents: Object.keys(lf).map((k) => {
        const val = lf[k] ?? { contexts: [] }
        return {
          name: k,
          contexts: val.contexts,
        }
      }),
      errors: {},
    }
  })
}

export const EnhancedCustomAppList = () => {
  const [apps, setApps] = useState<EnhancedEditableState[]>(() =>
    convertFromDirectoryApps(getClientState().getCustomApps()),
  )

  async function updateApps(newApps: EnhancedEditableState[]): Promise<void> {
    // Validate all apps before saving
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

  return (
    <div className={styles.list}>
      <div className={styles.listHeader}>
        <h2>Custom Applications</h2>
        <p>
          Create and manage your custom FDC3 applications with proper icons,
          screenshots, and metadata.
        </p>
      </div>

      {apps.map((app) => (
        <EnhancedCustomAppItem
          key={app.id}
          app={app}
          isDuplicate={checkDuplicateId(app.id, apps)}
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

      <AddButton onClick={() => updateApps([...apps, newEnhancedApp()])} />
    </div>
  )
}
