import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { MapContainer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import { ImagePlus, LocateFixed, Send, X, FilePlus, MapPin, Camera, Info } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import { CITY_CENTER, CITY_BOUNDS, CITY_DEFAULT_ZOOM, CITY_MIN_ZOOM } from '../lib/mapConfig'
import PageHeader from '../components/ui/PageHeader'
import BaseTiles from '../components/map/BaseTiles'
import Card, { CardHeader } from '../components/ui/Card'
import { Field, Select, Textarea } from '../components/ui/Field'
import Button from '../components/ui/Button'

// Fix Leaflet's default marker icon, which breaks under Vite's bundling by default
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
L.Marker.prototype.options.icon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})

function LocationMarker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition(e.latlng)
    },
  })
  return position ? <Marker position={position} /> : null
}

function FlyToPosition({ position }) {
  const map = useMap()
  useEffect(() => {
    if (position) map.flyTo(position, 16)
  }, [position, map])
  return null
}

// Kept in sync with the categories the CV detection model uses (Module 8)
const HAZARD_TYPE_OPTIONS = ['Pothole', 'Debris', 'Crack', 'Scouring']

export default function SubmitReport() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [imageFiles, setImageFiles] = useState([])
  const [imagePreviews, setImagePreviews] = useState([])
  const [position, setPosition] = useState(null)
  const [locating, setLocating] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const MAX_IMAGES = 5

  function handleImageChange(e) {
    const newFiles = Array.from(e.target.files || [])
    if (newFiles.length === 0) return

    const remainingSlots = MAX_IMAGES - imageFiles.length
    if (remainingSlots <= 0) {
      toast.error(`Maximum ${MAX_IMAGES} photos allowed`)
      e.target.value = ''
      return
    }

    const filesToAdd = newFiles.slice(0, remainingSlots)
    if (newFiles.length > remainingSlots) {
      toast.error(`Only ${remainingSlots} more photo${remainingSlots === 1 ? '' : 's'} allowed (max ${MAX_IMAGES})`)
    }

    setImageFiles((prev) => [...prev, ...filesToAdd])
    setImagePreviews((prev) => [...prev, ...filesToAdd.map((f) => URL.createObjectURL(f))])
    e.target.value = '' // allows re-selecting the same file later if removed
  }

  function removeImage(index) {
    setImageFiles((prev) => prev.filter((_, i) => i !== index))
    setImagePreviews((prev) => prev.filter((_, i) => i !== index))
  }

  function handleUseCurrentLocation() {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setLocating(false)
      },
      () => {
        toast.error('Could not get your location — please pin it on the map instead')
        setLocating(false)
      }
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!title) return toast.error('Please select what you are reporting')
    if (!description.trim()) return toast.error('Please describe the hazard')
    if (!position) return toast.error('Please pin the hazard location on the map')
    if (imageFiles.length === 0) return toast.error('Please upload at least one photo of the hazard')

    setSubmitting(true)

    try {
      // 1. Insert the report
      const { data: report, error: reportError } = await supabase
        .from('hazard_reports')
        .insert({
          user_id: user.id,
          title: title.trim() || null,
          description: description.trim(),
          latitude: position.lat,
          longitude: position.lng,
        })
        .select()
        .single()

      if (reportError) throw reportError

      // 2. Upload each photo, into a folder named after this user's id.
      // The first photo becomes the "primary" image used for CV detection.
      const uploadedUrls = []
      for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i]
        const fileExt = file.name.split('.').pop()
        const filePath = `${user.id}/${report.report_id}-${i}.${fileExt}`

        const { error: uploadError } = await supabase.storage.from('hazard-images').upload(filePath, file)
        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage.from('hazard-images').getPublicUrl(filePath)
        uploadedUrls.push(urlData.publicUrl)
      }

      // 3. Save all image records, linked to the report
      const { error: imageError } = await supabase
        .from('hazard_images')
        .insert(uploadedUrls.map((url) => ({ report_id: report.report_id, image_url: url })))

      if (imageError) throw imageError

      toast.success('Hazard report submitted! An LGU admin will review it.')
      navigate('/citizen')
    } catch (err) {
      console.error(err)
      toast.error(err.message || 'Something went wrong submitting your report')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Citizen Portal"
        title="Submit a Hazard Report"
        description="Describe the hazard, add a photo, and pin its exact location."
        icon={FilePlus}
      />

      <div className="flex items-start gap-2.5 rounded-2xl border border-primary/15 bg-primary-light/40 p-3.5">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-xs leading-relaxed text-ink-soft">
          Your first photo is used for AI-assisted hazard detection. Reports are reviewed by an LGU admin before they
          appear on the public map.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* Left column: details */}
        <Card className="p-5">
          <CardHeader title="Report details" description="What did you find and how does it look?" icon={Camera} />

          <div className="mt-5 space-y-5">
            <Field label="Hazard Type" htmlFor="hazard-type" required>
              <Select id="hazard-type" required value={title} onChange={(e) => setTitle(e.target.value)}>
                <option value="" disabled>
                  Select what you're reporting…
                </option>
                {HAZARD_TYPE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Description" htmlFor="hazard-description" required>
              <Textarea
                id="hazard-description"
                required
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the road damage — size, depth, how it affects traffic, etc."
              />
            </Field>

            <Field
              label="Photos"
              hint={`Up to ${MAX_IMAGES} photos. The first one is used for AI detection.`}
            >
              {imagePreviews.length > 0 && (
                <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {imagePreviews.map((src, i) => (
                    <div key={src} className="group relative aspect-square overflow-hidden rounded-xl ring-1 ring-line">
                      <img src={src} alt="" className="h-full w-full object-cover" />
                      {i === 0 && (
                        <span className="absolute left-1.5 top-1.5 rounded-md bg-brand-gradient px-1.5 py-0.5 text-[9px] font-bold text-white shadow-sm">
                          Primary
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        aria-label="Remove photo"
                        className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-ink/60 text-white opacity-0 transition hover:bg-danger group-hover:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {imageFiles.length < MAX_IMAGES && (
                <label
                  htmlFor="hazard-image"
                  className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line bg-canvas/50 px-4 py-6 text-center transition hover:border-primary/40 hover:bg-primary-light/30"
                >
                  <ImagePlus className="h-7 w-7 text-primary/70" />
                  <span className="text-sm font-medium text-ink-soft">
                    {imageFiles.length === 0
                      ? 'Click to upload photos'
                      : `Add more (${MAX_IMAGES - imageFiles.length} remaining)`}
                  </span>
                  <span className="text-[11px] text-ink-muted">JPG or PNG — up to {MAX_IMAGES} images</span>
                </label>
              )}
              <input
                id="hazard-image"
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageChange}
                className="hidden"
              />
            </Field>
          </div>
        </Card>

        {/* Right column: map */}
        <Card className="flex flex-col p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardHeader title="Hazard location" description="Tap the map to place the pin." icon={MapPin} />
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={locating}
              className="flex items-center gap-1.5 rounded-lg bg-primary-light/60 px-2.5 py-1.5 text-[11px] font-semibold text-primary transition hover:bg-primary-light disabled:opacity-50"
            >
              <LocateFixed className="h-3.5 w-3.5" />
              {locating ? 'Locating…' : 'Use my location'}
            </button>
          </div>

          <div className="mt-4 h-72 overflow-hidden rounded-xl border border-line lg:h-[420px]">
            <MapContainer
              center={CITY_CENTER}
              zoom={CITY_DEFAULT_ZOOM}
              minZoom={CITY_MIN_ZOOM}
              maxBounds={CITY_BOUNDS}
              maxBoundsViscosity={1.0}
              className="leaflet-container"
            >
              <BaseTiles />
              <LocationMarker position={position} setPosition={setPosition} />
              <FlyToPosition position={position} />
            </MapContainer>
          </div>

          <div className="mt-3 flex items-start gap-2 rounded-xl bg-canvas/70 px-3 py-2.5 text-xs">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            <span className="text-ink-soft">
              {position
                ? `Pinned: ${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`
                : 'Tap or click on the map to pin the hazard location.'}
            </span>
          </div>
        </Card>

        {/* Submit */}
        <div className="xl:col-span-2">
          <Card className="flex flex-col items-start justify-between gap-3 p-4 sm:flex-row sm:items-center">
            <p className="text-xs text-ink-soft">
              By submitting, you confirm the details are accurate to the best of your knowledge.
            </p>
            <Button
              type="submit"
              variant="gradient"
              size="lg"
              loading={submitting}
              iconRight={submitting ? undefined : Send}
              className="w-full sm:w-auto"
            >
              {submitting ? 'Submitting…' : 'Submit Report'}
            </Button>
          </Card>
        </div>
      </form>
    </div>
  )
}
