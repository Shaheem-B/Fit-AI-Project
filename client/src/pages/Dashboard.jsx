import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { aiAPI, plansAPI } from '../services/api'
import toast from 'react-hot-toast'
import { Upload, Loader2, Dumbbell, Camera, Sparkles } from 'lucide-react'

export default function Dashboard() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [imageSource, setImageSource] = useState('Upload') // 'Upload' | 'Camera'

  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const [cameraActive, setCameraActive] = useState(false)
  const [cameraError, setCameraError] = useState(null)
  const [captureFlash, setCaptureFlash] = useState(false)
  const [inputMode, setInputMode] = useState('upload') // 'upload' or 'camera'
  const [classifierLabel, setClassifierLabel] = useState(null)
  const [predictingHW, setPredictingHW] = useState(false)
  const [predictedHW, setPredictedHW] = useState(null)

  const [formData, setFormData] = useState({
    name: '',
    age: 21,
    sex: 'Male',
    weight: 60,
    height_cm: 170,
    activity_level: 'Moderately active',
    goal: 'Lose fat / get lean',
    diet_prefs: ''
  })

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image must be less than 10MB')
        return
      }

      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
      setImageSource('Upload')
      setClassifierLabel(null)
    }
  }

  const stopCameraStream = () => {
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop())
      }
    } catch (e) {
      // ignore
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    streamRef.current = null
    setCameraActive(false)
  }

  const handleStartCamera = async () => {
    setCameraError(null)
    try {
      const constraints = {
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false
      }
      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setCameraActive(true)
      setInputMode('camera')
      setImagePreview(null)
      setImageFile(null)
      setImageSource('Camera')
      setClassifierLabel(null)
    } catch (err) {
      console.error('Camera start failed', err)
      setCameraError(err?.message || 'Unable to access camera')
      toast.error('Camera permission denied or not available')
      setInputMode('upload')
      stopCameraStream()
    }
  }

  const handleCapture = () => {
    if (!videoRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current || document.createElement('canvas')
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

    setCaptureFlash(true)
    setTimeout(() => setCaptureFlash(false), 200)

    canvas.toBlob((blob) => {
      if (!blob) {
        toast.error('Capture failed')
        return
      }

      if (blob.size > 10 * 1024 * 1024) {
        toast.error('Captured image must be less than 10MB')
        return
      }

      const file = new File([blob], `capture_${Date.now()}.jpg`, { type: blob.type })
      setImageFile(file)
      setImagePreview(URL.createObjectURL(file))
      setImageSource('Camera')
      setClassifierLabel(null)

      // stop camera after capture for privacy
      stopCameraStream()
    }, 'image/jpeg', 0.95)
  }

  const handleClassifyImage = async () => {
    if (!imageFile) {
      toast.error('Please upload an image first')
      return
    }

    setLoading(true)
    try {
      const result = await aiAPI.classifyImage(imageFile)
      setClassifierLabel(result.classifier_label)
      toast.success(`Body type: ${result.classifier_label}`)
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Classification failed')
    } finally {
      setLoading(false)
    }
  }

  const handlePredictHeightWeight = async () => {
    if (!imageFile) {
      toast.error('Please upload an image first')
      return
    }
    setPredictingHW(true)
    try {
      const result = await aiAPI.predictHeightWeight(imageFile)
      setFormData(prev => ({
        ...prev,
        height_cm: result.height_cm,
        weight: result.weight_kg
      }))
      setPredictedHW(result)
      toast.success(`Predicted: ${result.height_cm} cm, ${result.weight_kg} kg`)
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Height/weight prediction failed')
    } finally {
      setPredictingHW(false)
    }
  }

  const handleGeneratePlan = async () => {
    if (!imageFile) {
      toast.error('Please upload an image first')
      return
    }

    setLoading(true)
    try {
      const formDataToSend = new FormData()
      formDataToSend.append('file', imageFile)
      formDataToSend.append('name', formData.name)
      formDataToSend.append('age', formData.age)
      formDataToSend.append('sex', formData.sex)
      formDataToSend.append('weight', formData.weight)
      formDataToSend.append('height_cm', formData.height_cm)
      formDataToSend.append('activity_level', formData.activity_level)
      formDataToSend.append('goal', formData.goal)
      if (formData.diet_prefs) {
        formDataToSend.append('diet_prefs', formData.diet_prefs)
      }

      const result = await aiAPI.generatePlan(formDataToSend)

      // Save plan to database
      await plansAPI.createPlan({
        user_inputs: result.user_inputs,
        classifier_label: result.classifier_label,
        plan_text: result.plan_text
      })

      toast.success('Plan generated successfully!')

      // Navigate to plans page
      navigate('/plans')
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to generate plan')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    return () => {
      stopCameraStream()
    }
  }, [])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-10 flex items-center gap-4">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-100 to-indigo-200 text-indigo-700 shadow-lg">
          <Dumbbell className="w-8 h-8" />
        </div>
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">Generate Your Plan</h1>
          <p className="text-gray-700 mt-2 text-lg">Upload your photo and complete your profile to get a personalized fitness & nutrition plan</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Image Input Section (Upload + Camera) */}
        <div className="card-elevated">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">📸 Your Photo</h2>
            <div className="flex items-center space-x-2 bg-gray-100 p-1 rounded-lg">
              <button
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${inputMode === 'upload' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-white/50'}`}
                onClick={() => { setInputMode('upload'); stopCameraStream(); setImageSource('Upload') }}
              >
                <Upload className="w-4 h-4 inline mr-2" /> Upload
              </button>
              <button
                className={`px-4 py-2 rounded-md text-sm font-semibold transition-all ${inputMode === 'camera' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-600 hover:bg-white/50'}`}
                onClick={handleStartCamera}
              >
                <Camera className="w-4 h-4 inline mr-2" /> Camera
              </button>
            </div>
          </div>

          <div className="mb-4">
            {inputMode === 'upload' && (
              <label className="flex flex-col items-center justify-center w-full h-72 border-3 border-dashed border-indigo-200 rounded-2xl cursor-pointer hover:border-indigo-400 hover:bg-indigo-50 transition-all bg-gradient-to-br from-indigo-50 to-blue-50">
                {imagePreview ? (
                  <div className="relative w-full h-full">
                    <img src={imagePreview} alt="Preview" className="w-full h-full object-cover rounded-xl" />
                    <span className="absolute top-3 left-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-xs px-3 py-1 rounded-full font-semibold">{imageSource}</span>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center pt-6 pb-8">
                    <Upload className="w-16 h-16 text-indigo-300 mb-4" />
                    <p className="text-center text-gray-700">
                      <span className="font-bold text-lg">Click to upload</span><br />
                      <span className="text-sm">or drag and drop</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-2">PNG, JPG (MAX. 10MB)</p>
                  </div>
                )}
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </label>
            )}

            {inputMode === 'camera' && (
              <div className="relative w-full h-64 bg-black/5 rounded-lg overflow-hidden transition-transform transform-gpu will-change-transform">
                <div className={`absolute inset-0 bg-white/70 pointer-events-none transition-opacity ${captureFlash ? 'opacity-100' : 'opacity-0'}`} />
                <div className={`w-full h-full flex items-center justify-center ${cameraActive ? 'animate-scaleIn' : 'opacity-0'}`}>
                  {!cameraActive && (
                    <div className="text-center">
                      <p className="text-sm text-gray-600">Opening camera...</p>
                      {cameraError && <p className="text-xs text-red-500 mt-2">{cameraError}</p>}
                    </div>
                  )}
                  <video ref={videoRef} className="w-full h-full object-cover" playsInline muted />
                </div>
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute top-2 left-2">
                  <span className="bg-black/60 text-white text-xs px-2 py-1 rounded">Source: Camera</span>
                </div>
                <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center space-x-3">
                  <button
                    onClick={() => { stopCameraStream(); setInputMode('upload'); setImageSource('Upload') }}
                    className="bg-gray-100 text-gray-700 px-3 py-2 rounded-md"
                  >
                    Close
                  </button>
                  <button
                    onClick={handleCapture}
                    className="bg-white border border-gray-300 rounded-full w-16 h-16 flex items-center justify-center shadow-lg"
                    aria-label="Capture photo"
                  >
                    <div className="bg-red-500 w-10 h-10 rounded-full" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {imageFile && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleClassifyImage}
                  disabled={loading}
                  className="btn-secondary w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
                      Classifying...
                    </>
                  ) : (
                    'Classify Body Type'
                  )}
                </button>

                <button
                  onClick={handlePredictHeightWeight}
                  disabled={predictingHW}
                  className="btn-secondary w-full bg-gradient-to-r from-violet-50 to-purple-50 border-violet-200 text-violet-700 hover:border-violet-400 hover:bg-violet-100"
                >
                  {predictingHW ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
                      Predicting...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2 inline" />
                      AI Predict H/W
                    </>
                  )}
                </button>
              </div>

              {classifierLabel && (
                <div className="mt-2 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm font-medium text-green-800">
                    Body Type Classified: <span className="font-bold">{classifierLabel}</span>
                  </p>
                </div>
              )}

              {predictedHW && (
                <div className="mt-2 p-4 bg-violet-50 border border-violet-200 rounded-lg">
                  <p className="text-sm font-medium text-violet-800">
                    <Sparkles className="w-4 h-4 inline mr-1" />
                    AI Predicted: <span className="font-bold">{predictedHW.height_cm} cm</span> / <span className="font-bold">{predictedHW.weight_kg} kg</span>
                  </p>
                  <p className="text-xs text-violet-600 mt-1">Values auto-filled — you can still adjust them manually</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Form Section */}
        <div className="card">
          <h2 className="text-xl font-semibold mb-4">Your Details</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Name (optional)
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="input-field"
                placeholder="John Doe"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Age
                </label>
                <input
                  type="number"
                  name="age"
                  value={formData.age}
                  onChange={handleInputChange}
                  className="input-field"
                  min="10"
                  max="100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sex
                </label>
                <select
                  name="sex"
                  value={formData.sex}
                  onChange={handleInputChange}
                  className="input-field"
                >
                  <option>Male</option>
                  <option>Female</option>
                  <option>Other / Prefer not to say</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Weight (kg)
                </label>
                <input
                  type="number"
                  name="weight"
                  value={formData.weight}
                  onChange={handleInputChange}
                  className="input-field"
                  min="20"
                  max="300"
                  step="0.5"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Height (cm)
                </label>
                <input
                  type="number"
                  name="height_cm"
                  value={formData.height_cm}
                  onChange={handleInputChange}
                  className="input-field"
                  min="100"
                  max="250"
                  step="0.5"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Activity Level
              </label>
              <select
                name="activity_level"
                value={formData.activity_level}
                onChange={handleInputChange}
                className="input-field"
              >
                <option>Sedentary</option>
                <option>Lightly active</option>
                <option>Moderately active</option>
                <option>Active</option>
                <option>Very active</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Primary Goal
              </label>
              <select
                name="goal"
                value={formData.goal}
                onChange={handleInputChange}
                className="input-field"
              >
                <option>Gain weight / muscle</option>
                <option>Maintain</option>
                <option>Lose fat / get lean</option>
                <option>Improve performance / athletic</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Diet Preferences (optional)
              </label>
              <input
                type="text"
                name="diet_prefs"
                value={formData.diet_prefs}
                onChange={handleInputChange}
                className="input-field"
                placeholder="e.g. vegetarian, low carb, high protein"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Generate Plan Button */}
      <div className="mt-6">
        <button
          onClick={handleGeneratePlan}
          disabled={loading || !imageFile}
          className="btn-primary w-full py-4 text-lg"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin inline" />
              Generating Your Personalized Plan...
            </>
          ) : (
            'Generate Personalized Plan 🚀'
          )}
        </button>
      </div>
    </div>
  )
}

