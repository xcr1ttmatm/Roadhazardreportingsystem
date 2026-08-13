import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import { ImagePlus, LocateFixed, Send } from 'lucide-react'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import { CITY_CENTER, CITY_BOUNDS, CITY_DEFAULT_ZOOM, CITY_MIN_ZOOM } from '../lib/mapConfig'

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

export default function SubmitReport() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [position, setPosition] = useState(null)
  const [locating, setLocating] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  function handleImageChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
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

    if (!description.trim()) return toast.error('Please describe the hazard')
    if (!position) return toast.error('Please pin the hazard location on the map')
    if (!imageFile) return toast.error('Please upload a photo of the hazard')

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

      // 2. Upload the photo into a folder named after this user's id
      const fileExt = imageFile.name.split('.').pop()
      const filePath = `${user.id}/${report.report_id}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('hazard-images')
        .upload(filePath, imageFile)

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage.from('hazard-images').getPublicUrl(filePath)

      // 3. Save the image record, linked to the report
      const { error: imageError } = await supabase
        .from('hazard_images')
        .insert({ report_id: report.report_id, image_url: urlData.publicUrl })

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
    <div className="mx-auto max-w-4xl px-4 py-8">
      <h1 className="text-2xl font-bold text-[#0F4C81]">Submit a Hazard Report</h1>
      <p className="mt-1 text-sm text-gray-500">
        Describe the hazard, add a photo, and pin its exact location.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-2">
        {/* Left column: details */}
        <div className="space-y-5">
          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#0F4C81]">
              Title <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Large pothole near barangay hall"
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-[#0F4C81] transition focus:border-[#0F4C81] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#0F4C81]/10"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#0F4C81]">Description</label>
            <textarea
              required
              rows={5}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the road damage — size, depth, how it affects traffic, etc."
              className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-[#0F4C81] transition focus:border-[#0F4C81] focus:bg-white focus:outline-none focus:ring-4 focus:ring-[#0F4C81]/10"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-medium text-[#0F4C81]">Photo</label>
            <label
              htmlFor="hazard-image"
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-8 text-center transition hover:border-[#0F4C81] hover:bg-[#0F4C81]/5"
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Preview" className="h-40 w-full rounded-lg object-cover" />
              ) : (
                <>
                  <ImagePlus className="h-8 w-8 text-gray-400" />
                  <span className="text-sm text-gray-500">Click to upload a photo</span>
                </>
              )}
            </label>
            <input
              id="hazard-image"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="hidden"
            />
          </div>
        </div>

        {/* Right column: map */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="block text-sm font-medium text-[#0F4C81]">Hazard Location</label>
            <button
              type="button"
              onClick={handleUseCurrentLocation}
              disabled={locating}
              className="flex items-center gap-1 text-xs font-medium text-[#0F4C81] hover:underline disabled:opacity-50"
            >
              <LocateFixed className="h-3.5 w-3.5" />
              {locating ? 'Locating...' : 'Use my current location'}
            </button>
          </div>

          <div className="h-72 overflow-hidden rounded-xl border border-gray-200 lg:h-[420px]">
            <MapContainer
              center={CITY_CENTER}
              zoom={CITY_DEFAULT_ZOOM}
              minZoom={CITY_MIN_ZOOM}
              maxBounds={CITY_BOUNDS}
              maxBoundsViscosity={1.0}
              className="leaflet-container"
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <LocationMarker position={position} setPosition={setPosition} />
              <FlyToPosition position={position} />
            </MapContainer>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            {position
              ? `Pinned: ${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`
              : 'Tap or click on the map to pin the hazard location.'}
          </p>
        </div>

        {/* Submit button spans both columns */}
        <div className="lg:col-span-2">
          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F4C81] py-3.5 text-sm font-semibold text-white shadow-lg shadow-[#0F4C81]/20 transition hover:bg-[#0B3A63] disabled:opacity-60 sm:w-auto sm:px-8"
          >
            {submitting ? 'Submitting...' : 'Submit Report'}
            {!submitting && <Send className="h-4 w-4" />}
          </button>
        </div>
      </form>
    </div>
  )
}