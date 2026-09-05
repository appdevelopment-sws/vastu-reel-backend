import React, { useState, useEffect, useRef } from "react"
import axios from "axios"
import { reelsApi, propertyTypesApi, categoriesApi } from "../../services/api"
import {
  Upload,
  X,
  Film,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FileVideo,
} from "lucide-react"

interface UploadReelModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

const ELEMENTS = [
  "Fire (Agni)",
  "Water (Jal)",
  "Air (Vayu)",
  "Earth (Prithvi)",
  "Space (Akash)",
]

const DEFAULT_PROPERTY_TYPES = [
  "Residential",
  "Commercial",
  "Plot / Land",
  "Industrial",
  "Villa",
]

export const UploadReelModal: React.FC<UploadReelModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [categoriesList, setCategoriesList] = useState<any[]>([])
  const [title, setTitle] = useState("")
  const [caption, setCaption] = useState("")
  const [category, setCategory] = useState("")
  const [selectedSubCategoryId, setSelectedSubCategoryId] = useState("")
  const [subCategory, setSubCategory] = useState("")
  const [element, setElement] = useState("")
  const [propertyTypeList, setPropertyTypeList] = useState<string[]>(
    DEFAULT_PROPERTY_TYPES
  )
  const [propertyType, setPropertyType] = useState(DEFAULT_PROPERTY_TYPES[0])
  const [location, setLocation] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  // Fetch dynamic categories and their subcategories & types
  useEffect(() => {
    if (isOpen) {
      categoriesApi
        .getAllPublic()
        .then((cats: any) => {
          if (Array.isArray(cats) && cats.length > 0) {
            setCategoriesList(cats)
            const firstCat = cats[0]
            setCategory(firstCat.name)

            if (firstCat.subCategories && firstCat.subCategories.length > 0) {
              const firstSub = firstCat.subCategories[0]
              setSelectedSubCategoryId(firstSub.id)
              setSubCategory(firstSub.name)

              if (firstSub.propertyTypes && firstSub.propertyTypes.length > 0) {
                const names = firstSub.propertyTypes.map((t: any) => t.name)
                setPropertyTypeList(names)
                setPropertyType(names[0])
              } else {
                fetchTypesForSubCategory(firstSub.id)
              }
            } else {
              setSelectedSubCategoryId("")
              setSubCategory("")
            }
          }
        })
        .catch((e: any) => {
          console.warn("Could not fetch dynamic categories in upload modal:", e)
        })
    }
  }, [isOpen])

  const fetchTypesForSubCategory = (subId: string) => {
    if (!subId) return
    propertyTypesApi
      .getAll(subId)
      .then((types: any) => {
        if (Array.isArray(types) && types.length > 0) {
          const names = types.map((t: any) => t.name)
          setPropertyTypeList(names)
          setPropertyType(names[0])
        } else {
          setPropertyTypeList(DEFAULT_PROPERTY_TYPES)
          setPropertyType(DEFAULT_PROPERTY_TYPES[0])
        }
      })
      .catch(() => {
        setPropertyTypeList(DEFAULT_PROPERTY_TYPES)
      })
  }

  const handleCategoryChange = (catName: string) => {
    setCategory(catName)
    const catObj = categoriesList.find((c) => c.name === catName)
    if (catObj && catObj.subCategories && catObj.subCategories.length > 0) {
      const firstSub = catObj.subCategories[0]
      setSelectedSubCategoryId(firstSub.id)
      setSubCategory(firstSub.name)

      if (firstSub.propertyTypes && firstSub.propertyTypes.length > 0) {
        const names = firstSub.propertyTypes.map((t: any) => t.name)
        setPropertyTypeList(names)
        setPropertyType(names[0])
      } else {
        fetchTypesForSubCategory(firstSub.id)
      }
    } else {
      setSelectedSubCategoryId("")
      setSubCategory("")
    }
  }

  const handleSubCategoryChange = (subId: string) => {
    setSelectedSubCategoryId(subId)
    const catObj = categoriesList.find((c) => c.name === category)
    const subObj = catObj?.subCategories?.find((s: any) => s.id === subId)
    if (subObj) {
      setSubCategory(subObj.name)
      if (subObj.propertyTypes && subObj.propertyTypes.length > 0) {
        const names = subObj.propertyTypes.map((t: any) => t.name)
        setPropertyTypeList(names)
        setPropertyType(names[0])
      } else {
        fetchTypesForSubCategory(subId)
      }
    }
  }

  // Upload Progress & States
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [statusMessage, setStatusMessage] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  if (!isOpen) return null

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith("video/")) {
        setError("Please select a valid video file (MP4, MOV, WebM).")
        setSelectedFile(null)
        return
      }
      if (file.size > 500 * 1024 * 1024) {
        setError("Video file size exceeds the 500MB maximum limit.")
        setSelectedFile(null)
        return
      }
      setSelectedFile(file)
      setError(null)
      if (!title) {
        setTitle(file.name.replace(/\.[^/.]+$/, ""))
      }
    }
  }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFile) {
      setError("Please select a video file to upload.")
      return
    }
    if (!title.trim()) {
      setError("Please enter a title for the reel.")
      return
    }

    setUploading(true)
    setProgress(5)
    setStatusMessage("Requesting secure pre-signed upload URL...")
    setError(null)

    try {
      // 1. Initialize upload session
      const initRes = await reelsApi.initUpload({
        title: title.trim(),
        caption: caption.trim() || undefined,
        category,
        subCategory: subCategory.trim() || undefined,
        propertyType,
        element: element || undefined,
        location: location.trim() || undefined,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        mimeType: selectedFile.type || "video/mp4",
      })

      const { uploadId, uploadUrl } = initRes
      setProgress(15)
      setStatusMessage("Uploading video file to storage...")

      // 2. Direct upload to storage with progress tracking
      await axios.put(uploadUrl, selectedFile, {
        headers: {
          "Content-Type": selectedFile.type || "video/mp4",
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round(
              15 + (progressEvent.loaded / progressEvent.total) * 70
            )
            setProgress(percentCompleted)
          }
        },
      })

      setProgress(90)
      setStatusMessage("Finalizing and queuing HLS video transcoder...")

      // 3. Complete upload and trigger processing worker
      await reelsApi.completeUpload(uploadId)

      setProgress(100)
      setStatusMessage(
        "Video  uploaded and queued for processing successfully!"
      )
      setSuccess(true)

      setTimeout(() => {
        onSuccess()
        onClose()
      }, 1500)
    } catch (err: any) {
      console.error("Upload error", err)
      const msg =
        err.response?.data?.message || err.message || "Failed to upload video"
      setError(Array.isArray(msg) ? msg.join(", ") : msg)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex animate-in items-center justify-center bg-black/70 p-4 backdrop-blur-xs duration-200 fade-in">
      <div className="relative max-h-[90vh] w-full max-w-2xl space-y-5 overflow-y-auto rounded-3xl border border-border bg-card p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/80 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Film className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground">
                Upload Vastu Reel
              </h2>
              <p className="text-xs text-muted-foreground">
                Publish a new vertical short video to the feed and HLS pipeline
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={uploading}
            className="rounded-full p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-30"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="flex items-start gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 p-3.5 text-xs text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {success && (
          <div className="flex items-center gap-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs text-emerald-500">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span className="font-semibold">{statusMessage}</span>
          </div>
        )}

        {/* Upload Form */}
        <form onSubmit={handleUpload} className="space-y-4">
          {/* File Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-6 text-center transition ${
              selectedFile
                ? "border-primary/50 bg-primary/5"
                : "border-border/80 bg-muted/20 hover:border-primary/40 hover:bg-muted/40"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm,video/x-matroska"
              onChange={handleFileChange}
              className="hidden"
            />
            {selectedFile ? (
              <div className="space-y-1">
                <FileVideo className="mx-auto h-8 w-8 text-primary" />
                <p className="text-xs font-bold text-foreground">
                  {selectedFile.name}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Click to
                  change
                </p>
              </div>
            ) : (
              <div className="space-y-1">
                <Upload className="mx-auto h-8 w-8 text-muted-foreground" />
                <p className="text-xs font-semibold text-foreground">
                  Click to browse or drag & drop video file
                </p>
                <p className="text-[11px] text-muted-foreground">
                  MP4, MOV, WebM (Recommended 9:16 vertical, up to 500MB)
                </p>
              </div>
            )}
          </div>

          {/* Progress Bar when uploading */}
          {uploading && (
            <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3.5">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-foreground">{statusMessage}</span>
                <span className="font-mono text-primary">{progress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-gradient-to-r from-primary to-chart-1 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Video Metadata Inputs */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Reel Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. North-East Water Element Remedy"
                required
                className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              >
                {categoriesList.map((cat) => (
                  <option key={cat.id || cat.name} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Sub-Category / Space
            </label>
            {(() => {
              const currentCat = categoriesList.find((c) => c.name === category)
              const subs = currentCat?.subCategories || []
              return subs.length > 0 ? (
                <select
                  value={selectedSubCategoryId}
                  onChange={(e) => handleSubCategoryChange(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                >
                  {subs.map((sub: any) => (
                    <option key={sub.id} value={sub.id}>
                      {sub.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={subCategory}
                  onChange={(e) => setSubCategory(e.target.value)}
                  placeholder="e.g. Flat, Duplex, Main Door, Kitchen"
                  className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
                />
              )
            })()}
          </div>

          <div>
            <label className="block text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Caption / Description
            </label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Provide Vedic details, recommendations, hashtags (#Vastu #HomeEnergy)..."
              rows={3}
              className="mt-1.5 w-full rounded-xl border border-input bg-background p-3 text-xs text-foreground focus:border-primary focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Vastu Element
              </label>
              <select
                value={element}
                onChange={(e) => setElement(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              >
                <option value="">None / General</option>
                {ELEMENTS.map((el) => (
                  <option key={el} value={el}>
                    {el}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Property Type
              </label>
              <select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              >
                {propertyTypeList.map((pt) => (
                  <option key={pt} value={pt}>
                    {pt}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Location / Direction
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="e.g. North-East, Delhi"
                className="mt-1.5 w-full rounded-xl border border-input bg-background px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 border-t border-border/80 pt-3">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="cursor-pointer rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground transition hover:bg-muted disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !selectedFile}
              className="flex cursor-pointer items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-semibold text-primary-foreground shadow-md shadow-primary/20 transition hover:bg-primary/90 disabled:opacity-50"
            >
              {uploading ? (
                <>
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>Uploading & Processing...</span>
                </>
              ) : (
                <>
                  <Upload className="h-3.5 w-3.5" />
                  <span>Publish Reel</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
