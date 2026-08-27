"use client"

import * as React from "react"
import { useDropzone } from "react-dropzone"
import { 
  Loader2, 
  UploadCloud, 
  Settings2, 
  LayoutGrid, 
  List, 
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  X, 
  CheckCircle2, 
  Building2, 
  Sparkles,
  AlertTriangle,
  Flame,
  Wrench,
  Layers,
  Maximize2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { motion, AnimatePresence } from "framer-motion"
import { SEEDED_PROPERTIES, Property, PropertyResult } from "@/lib/data/seededProperties"

type Result = {
  fileName?: string;
  imageUrl?: string;
  base64Data?: string;
  description: string;
}

function getImageSrc(item?: { imageUrl?: string; base64?: string; base64Data?: string }) {
  if (!item) return ''
  if (item.imageUrl) return item.imageUrl
  if (item.base64) return `data:image/jpeg;base64,${item.base64}`
  if (item.base64Data) return `data:image/jpeg;base64,${item.base64Data}`
  return ''
}

export function MainClient() {
  // Selected Property
  const [selectedPropertyId, setSelectedPropertyId] = React.useState<string>(SEEDED_PROPERTIES[0].id)
  
  // Custom upload state vs Seeded property state
  const [isCustomMode, setIsCustomMode] = React.useState(false)
  const [files, setFiles] = React.useState<{file?: File, base64?: string, imageUrl?: string, name?: string}[]>([])
  const [loading, setLoading] = React.useState(false)
  const [results, setResults] = React.useState<Result[]>(SEEDED_PROPERTIES[0].results)
  
  // View mode: 'list' (Horizontal Cards), 'grid', 'slideshow'
  const [viewMode, setViewMode] = React.useState<"list" | "grid" | "slideshow">("list")
  const [slideIndex, setSlideIndex] = React.useState(0)
  
  // Settings
  const [systemPrompt, setSystemPrompt] = React.useState("")
  const [activeProvider, setActiveProvider] = React.useState("cf-jami-qwen-qwen3-8-27b")
  const [settingsOpen, setSettingsOpen] = React.useState(false)

  React.useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        if (data.systemPrompt) setSystemPrompt(data.systemPrompt)
        if (data.activeAiProvider) setActiveProvider(data.activeAiProvider)
      })
      .catch(console.error)
  }, [])

  // Property Selection Handler
  const handlePropertyChange = (propertyId: string) => {
    if (propertyId === 'new-custom') {
      setIsCustomMode(true)
      setSelectedPropertyId('new-custom')
      setResults([])
      setFiles([])
      setSlideIndex(0)
      return
    }

    const prop = SEEDED_PROPERTIES.find(p => p.id === propertyId)
    if (prop) {
      setIsCustomMode(false)
      setSelectedPropertyId(prop.id)
      setResults(prop.results)
      setFiles(prop.results.map(r => ({ imageUrl: r.imageUrl, base64: r.base64Data || '', name: r.fileName })))
      setSlideIndex(0)
    }
  }

  const saveSettings = async () => {
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ systemPrompt, activeAiProvider: activeProvider })
      })
      setSettingsOpen(false)
    } catch (error) {
      console.error(error)
    }
  }

  // Client-side image compression
  const compressAndToB64 = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new window.Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          let width = img.width
          let height = img.height
          const maxDim = 1600
          if (width > maxDim || height > maxDim) {
            if (width > height) {
              height = Math.round((height * maxDim) / width)
              width = maxDim
            } else {
              width = Math.round((width * maxDim) / height)
              height = maxDim
            }
          }
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext('2d')
          ctx?.drawImage(img, 0, 0, width, height)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.82)
          resolve(dataUrl.split(',')[1])
        }
        img.src = e.target?.result as string
      }
      reader.readAsDataURL(file)
    })
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [] },
    onDrop: async (acceptedFiles) => {
      setIsCustomMode(true)
      setSelectedPropertyId('new-custom')
      
      const newFiles = await Promise.all(acceptedFiles.map(async file => ({
        file,
        name: file.name,
        base64: await compressAndToB64(file)
      })))
      
      setFiles(prev => [...prev, ...newFiles])
    }
  })

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  const submit = async () => {
    if (files.length === 0) return
    setLoading(true)
    
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images: files.map(f => f.base64) })
      })
      
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      
      setResults(data.results)
      setSlideIndex(0)
    } catch (err: any) {
      alert(err.message || 'Error processing images')
    } finally {
      setLoading(false)
    }
  }

  const currentProperty = SEEDED_PROPERTIES.find(p => p.id === selectedPropertyId)

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 font-sans flex flex-col selection:bg-zinc-800">
      
      {/* 1. STICKY TOP HEADER */}
      <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80 px-4 md:px-8 py-3">
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          
          {/* Logo & Subtitle */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-white text-zinc-950 flex items-center justify-center font-bold text-base shadow-sm">
                S
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-lg font-semibold tracking-tight text-white">sidekick</h1>
                  <span className="text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/50">
                    Inspection AI
                  </span>
                </div>
                <p className="text-xs text-zinc-400 hidden md:block">Property Move-Out & Turnover Assistant</p>
              </div>
            </div>
          </div>

          {/* Property Selector & Config */}
          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            
            {/* Clean Property Selector */}
            <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 shadow-sm">
              <Building2 className="w-4 h-4 text-zinc-400" />
              <label htmlFor="property-select" className="sr-only">Select Property</label>
              <select
                id="property-select"
                value={selectedPropertyId}
                onChange={(e) => handlePropertyChange(e.target.value)}
                className="bg-transparent text-sm text-zinc-200 font-medium focus:outline-none cursor-pointer pr-1"
              >
                <optgroup label="Seeded Inspection Reports">
                  {SEEDED_PROPERTIES.map(p => (
                    <option key={p.id} value={p.id} className="bg-zinc-900 text-zinc-200">
                      {p.name} ({p.modelLabel})
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Custom Walkthrough">
                  <option value="new-custom" className="bg-zinc-900 text-zinc-200">
                    + New Property Walkthrough...
                  </option>
                </optgroup>
              </select>
            </div>

            {/* Configuration Dialog */}
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="bg-zinc-900 border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800">
                  <Settings2 className="w-3.5 h-3.5 mr-1.5 text-zinc-400" />
                  Settings
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-50 sm:max-w-[620px]">
                <DialogHeader>
                  <DialogTitle className="text-lg font-medium">Model & Prompt Configuration</DialogTitle>
                </DialogHeader>
                <div className="space-y-5 py-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">AI Inspection Instructions</Label>
                    <Textarea 
                      value={systemPrompt}
                      onChange={e => setSystemPrompt(e.target.value)}
                      className="bg-zinc-950 border-zinc-800 min-h-[140px] text-sm text-zinc-200 font-mono resize-none focus-visible:ring-zinc-700" 
                      placeholder="Enter specific move-out guidelines..."
                    />
                    <p className="text-xs text-zinc-400">Controls the structural format, brevity, and chargeback focus of descriptions.</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Default Model Provider</Label>
                    <select 
                      className="flex h-10 w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-700"
                      value={activeProvider}
                      onChange={e => setActiveProvider(e.target.value)}
                    >
                      <optgroup label="Default Providers">
                        <option value="gemini">Google Gemini (GenAI)</option>
                        <option value="openai-compatible">Custom OpenAI Compatible</option>
                      </optgroup>
                      <optgroup label="Cloudflare Workers AI (JAMI STUDIO)">
                        <option value="cf-jami-zai-org-glm-5-3-flash">JAMI · GLM 5.3 Flash (@cf/zai-org/glm-5.3-flash)</option>
                        <option value="cf-jami-qwen-qwen3-8-27b">JAMI · Qwen 3.8 27B (@cf/qwen/qwen3.8-27b)</option>
                        <option value="cf-jami-moondream-moondream3-1-9b-a2b">JAMI · Moondream 3.1 9B (@cf/moondream/moondream3.1-9B-A2B)</option>
                        <option value="cf-jami-moonshotai-kimi-k2-7-code">JAMI · Kimi K2.7 Code (@cf/moonshotai/kimi-k2.7-code)</option>
                        <option value="cf-jami-moonshotai-kimi-k2-6">JAMI · Kimi K2.6 (@cf/moonshotai/kimi-k2.6)</option>
                        <option value="cf-jami-google-gemma-4-26b-a4b-it">JAMI · Gemma 4 26B (@cf/google/gemma-4-26b-a4b-it)</option>
                        <option value="cf-jami-meta-llama-4-scout-17b-16e-instruct">JAMI · Llama 4 Scout 17B (@cf/meta/llama-4-scout-17b-16e-instruct)</option>
                        <option value="cf-jami-meta-llama-3-2-11b-vision-instruct">JAMI · Llama 3.2 11B Vision (@cf/meta/llama-3.2-11b-vision-instruct)</option>
                      </optgroup>
                      <optgroup label="Cloudflare Workers AI (YRKA IO)">
                        <option value="cf-yrka-zai-org-glm-5-3-flash">YRKA · GLM 5.3 Flash (@cf/zai-org/glm-5.3-flash)</option>
                        <option value="cf-yrka-qwen-qwen3-8-27b">YRKA · Qwen 3.8 27B (@cf/qwen/qwen3.8-27b)</option>
                        <option value="cf-yrka-moondream-moondream3-1-9b-a2b">YRKA · Moondream 3.1 9B (@cf/moondream/moondream3.1-9B-A2B)</option>
                        <option value="cf-yrka-moonshotai-kimi-k2-7-code">YRKA · Kimi K2.7 Code (@cf/moonshotai/kimi-k2.7-code)</option>
                        <option value="cf-yrka-moonshotai-kimi-k2-6">YRKA · Kimi K2.6 (@cf/moonshotai/kimi-k2.6)</option>
                        <option value="cf-yrka-google-gemma-4-26b-a4b-it">YRKA · Gemma 4 26B (@cf/google/gemma-4-26b-a4b-it)</option>
                        <option value="cf-yrka-meta-llama-4-scout-17b-16e-instruct">YRKA · Llama 4 Scout 17B (@cf/meta/llama-4-scout-17b-16e-instruct)</option>
                        <option value="cf-yrka-meta-llama-3-2-11b-vision-instruct">YRKA · Llama 3.2 11B Vision (@cf/meta/llama-3.2-11b-vision-instruct)</option>
                      </optgroup>
                    </select>
                  </div>
                </div>
                <DialogFooter>
                  <Button onClick={saveSettings} className="bg-white text-zinc-950 hover:bg-zinc-200">Save Configuration</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

          </div>

        </div>
      </header>

      {/* 2. MAIN WORKSPACE (Sticky Pinned Left Panel + Independently Scrollable Right Panel) */}
      <main className="max-w-[1600px] mx-auto w-full p-4 md:p-6 flex-1 flex flex-col lg:flex-row gap-6">
        
        {/* ========================================================================= */}
        {/* LEFT PANEL: Pinned to viewport, Previews on top, Ghost Dropzone BELOW */}
        {/* ========================================================================= */}
        <aside className="w-full lg:w-[380px] shrink-0 lg:h-[calc(100vh-6.5rem)] lg:sticky lg:top-[4.5rem] flex flex-col justify-between bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-4 shadow-sm backdrop-blur-sm">
          
          <div className="flex flex-col gap-4 flex-1 overflow-hidden">
            
            {/* Header / Active Property Summary */}
            <div className="flex justify-between items-center pb-3 border-b border-zinc-800/60">
              <div>
                <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-zinc-400" />
                  {isCustomMode ? 'Custom Upload Batch' : currentProperty?.name}
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {isCustomMode ? `${files.length} photos ready` : `${currentProperty?.modelLabel} · ${currentProperty?.date}`}
                </p>
              </div>
              {files.length > 0 && isCustomMode && (
                <Button variant="ghost" size="sm" onClick={() => setFiles([])} className="h-7 text-xs text-zinc-400 hover:text-zinc-200">
                  Clear
                </Button>
              )}
            </div>

            {/* 1. IMAGE PREVIEWS (Shown ON TOP) */}
            {files.length > 0 ? (
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  Photos in Queue ({files.length})
                </span>
                <div className="grid grid-cols-4 gap-2 max-h-[220px] overflow-y-auto pr-1 pb-1">
                  {files.map((f, i) => (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden group bg-zinc-950 border border-zinc-800">
                      <img 
                        src={getImageSrc(f)} 
                        className="object-cover w-full h-full opacity-85 group-hover:opacity-100 transition-opacity" 
                        alt="preview thumbnail" 
                      />
                      {isCustomMode && (
                        <button 
                          onClick={() => removeFile(i)}
                          className="absolute top-1 right-1 bg-black/75 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black"
                          title="Remove photo"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-2 text-center text-xs text-zinc-400">
                No photos loaded. Select a property above or drop new photos below.
              </div>
            )}

            {/* 2. UPLOAD GHOST CARD / DROPZONE (PLACED BELOW PREVIEWS) */}
            <div 
              {...getRootProps()} 
              className={`border-2 border-dashed rounded-xl p-5 flex flex-col items-center justify-center cursor-pointer transition-all ${
                isDragActive 
                  ? 'border-zinc-400 bg-zinc-800/40 text-white' 
                  : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/40 hover:bg-zinc-900/40 text-zinc-400 hover:text-zinc-300'
              }`}
            >
              <input {...getInputProps()} />
              <UploadCloud className="w-8 h-8 mb-2 opacity-80" />
              <p className="text-xs font-medium text-center">
                <span className="text-zinc-200">Click to upload</span> or drag & drop
              </p>
              <p className="text-[11px] text-zinc-400 mt-1">Multi-photo batch supported (JPG, PNG)</p>
            </div>

          </div>

          {/* Action Button */}
          <div className="pt-4 border-t border-zinc-800/60 mt-auto">
            <Button 
              disabled={files.length === 0 || loading} 
              onClick={submit}
              className="w-full h-12 text-sm font-semibold bg-white text-zinc-950 hover:bg-zinc-200 disabled:opacity-40 transition-all rounded-xl shadow-sm"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Processing Multi-Photo Inspection...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2 text-zinc-800" />
                  {isCustomMode ? 'Process & Generate Report' : 'Re-run Evaluation'}
                </>
              )}
            </Button>
          </div>

        </aside>

        {/* ========================================================================= */}
        {/* RIGHT PANEL: Independently scrollable, cleanly formatted results */}
        {/* ========================================================================= */}
        <section className="flex-1 lg:h-[calc(100vh-6.5rem)] lg:overflow-y-auto bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-5 md:p-6 shadow-sm flex flex-col">
          
          {/* Output Control Header */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-zinc-800/80 mb-6">
            <div>
              <h2 className="text-base font-semibold text-white tracking-tight flex items-center gap-2">
                Move-Out Inspection Report
                <span className="text-xs font-normal text-zinc-400 bg-zinc-800/80 px-2 py-0.5 rounded-full border border-zinc-700/50">
                  {results.length} Photos Analyzed
                </span>
              </h2>
            </div>

            {/* Layout Toggle: List (Horizontal Cards) | Grid | Slideshow */}
            <div className="flex items-center gap-1 bg-zinc-950 border border-zinc-800 p-1 rounded-lg">
              <button 
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === 'list' 
                    ? 'bg-zinc-800 text-white shadow-sm' 
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Horizontal Cards View"
              >
                <List className="w-3.5 h-3.5" />
                <span>Cards</span>
              </button>
              
              <button 
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === 'grid' 
                    ? 'bg-zinc-800 text-white shadow-sm' 
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Grid View"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Grid</span>
              </button>

              <button 
                onClick={() => setViewMode('slideshow')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  viewMode === 'slideshow' 
                    ? 'bg-zinc-800 text-white shadow-sm' 
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
                title="Slideshow Layout"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Slideshow</span>
              </button>
            </div>
          </div>

          {/* Report Content */}
          <div className="flex-1">
            {results.length === 0 ? (
              <div className="h-full min-h-[350px] flex flex-col items-center justify-center text-zinc-400 text-center">
                <Building2 className="w-12 h-12 stroke-1 text-zinc-400 mb-3" />
                <p className="text-sm font-medium text-zinc-400">No inspection reports in view</p>
                <p className="text-xs text-zinc-400 mt-1 max-w-sm">
                  Upload walkthrough images on the left or select a property from the top menu to view condition breakdowns.
                </p>
              </div>
            ) : (
              <>
                {/* 1. SLIDESHOW VIEW MODE */}
                {viewMode === 'slideshow' && (
                  <div className="flex flex-col gap-6 max-w-4xl mx-auto py-2">
                    
                    {/* Slideshow Controller & Photo Container */}
                    <div className="relative aspect-[16/10] w-full rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800 shadow-lg group">
                      <img 
                        src={getImageSrc(results[slideIndex])} 
                        className="w-full h-full object-contain bg-zinc-950" 
                        alt={`Slide ${slideIndex + 1}`} 
                      />

                      {/* Navigation Controls */}
                      <button 
                        onClick={() => setSlideIndex(prev => (prev > 0 ? prev - 1 : results.length - 1))}
                        className="absolute left-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2.5 rounded-full backdrop-blur-sm transition-all shadow-md"
                        title="Previous Photo"
                      >
                        <ChevronLeft className="w-5 h-5" />
                      </button>

                      <button 
                        onClick={() => setSlideIndex(prev => (prev < results.length - 1 ? prev + 1 : 0))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2.5 rounded-full backdrop-blur-sm transition-all shadow-md"
                        title="Next Photo"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>

                      {/* Slide Indicator Badge */}
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-zinc-300 border border-zinc-700/60 shadow">
                        Photo {slideIndex + 1} of {results.length}
                      </div>
                    </div>

                    {/* Report Text Displayed Below Slideshow Photo */}
                    <div className="bg-zinc-900/80 border border-zinc-800/80 rounded-2xl p-6 shadow-sm">
                      <div className="flex justify-between items-center mb-4 pb-3 border-b border-zinc-800/60">
                        <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                          {results[slideIndex].fileName || `Photo #${slideIndex + 1}`} Breakdown
                        </span>
                      </div>
                      <FormattedReport description={results[slideIndex].description} />
                    </div>

                  </div>
                )}

                {/* 2. HORIZONTAL CARD LIST VIEW (Clean, ratio-locked, highly legible) */}
                {viewMode === 'list' && (
                  <div className="flex flex-col gap-5">
                    {results.map((res, i) => (
                      <motion.div 
                        key={i}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.15, delay: i * 0.03 }}
                        className="flex flex-col md:flex-row gap-5 bg-zinc-900/70 hover:bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-4 md:p-5 transition-all shadow-sm group"
                      >
                        {/* Fixed Ratio Photo Preview */}
                        <div className="shrink-0 w-full md:w-[280px] lg:w-[320px] aspect-[4/3] rounded-xl overflow-hidden bg-zinc-950 border border-zinc-800/80 relative">
                          <img 
                            src={getImageSrc(res)} 
                            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300" 
                            alt={`Inspection item ${i + 1}`} 
                          />
                          <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-[11px] font-semibold text-zinc-300 border border-zinc-700/50">
                            #{i + 1}
                          </div>
                        </div>

                        {/* Structured Report Breakdown */}
                        <div className="flex-1 flex flex-col justify-between min-w-0">
                          <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-semibold text-zinc-400">
                              {res.fileName || `Inspection Photo #${i + 1}`}
                            </span>
                          </div>
                          <FormattedReport description={res.description} />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}

                {/* 3. BALANCED 2-COLUMN GRID VIEW */}
                {viewMode === 'grid' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {results.map((res, i) => (
                      <div 
                        key={i} 
                        className="flex flex-col bg-zinc-900/70 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-sm"
                      >
                        <div className="aspect-video w-full bg-zinc-950 border-b border-zinc-800/60 overflow-hidden relative">
                          <img 
                            src={getImageSrc(res)} 
                            className="w-full h-full object-cover" 
                            alt={`Inspection grid item ${i + 1}`} 
                          />
                          <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-[11px] font-semibold text-zinc-300 border border-zinc-700/50">
                            Photo #{i + 1}
                          </div>
                        </div>
                        <div className="p-4 flex-1">
                          <FormattedReport description={res.description} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

        </section>

      </main>
    </div>
  )
}

// Clean, professional report parser that structures Condition, Dirt, and Damages
function FormattedReport({ description }: { description: string }) {
  if (!description) {
    return <p className="text-xs text-zinc-400">No report generated.</p>
  }

  // Parse structured sections if present
  const hasStructuredSections = 
    description.includes('Condition Overview') || 
    description.includes('Excessive Dirt') || 
    description.includes('Damages Details')

  if (!hasStructuredSections) {
    return (
      <div className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap font-sans">
        {description}
      </div>
    )
  }

  const sections = description.split(/(?=\*\*?[A-Z][a-zA-Z\s]+(?:Overview|Details|Condition)\*?\*?)/g)

  return (
    <div className="space-y-3.5 text-sm">
      {sections.map((sec, idx) => {
        const trimmed = sec.trim()
        if (!trimmed) return null

        const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean)
        const header = lines[0].replace(/\*\*/g, '').replace(/#/g, '').trim()
        const bodyLines = lines.slice(1)

        const isCondition = header.toLowerCase().includes('condition')
        const isDirt = header.toLowerCase().includes('dirt')
        const isDamage = header.toLowerCase().includes('damage')

        return (
          <div key={idx} className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              {isCondition && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
              {isDirt && <Flame className="w-3.5 h-3.5 text-amber-400" />}
              {isDamage && <Wrench className="w-3.5 h-3.5 text-rose-400" />}
              <span className={`text-xs font-semibold uppercase tracking-wider ${
                isCondition ? 'text-emerald-400' : isDirt ? 'text-amber-400' : isDamage ? 'text-rose-400' : 'text-zinc-300'
              }`}>
                {header}
              </span>
            </div>
            <div className="pl-5 text-xs text-zinc-300 leading-relaxed space-y-1">
              {bodyLines.length > 0 ? (
                bodyLines.map((line, li) => (
                  <p key={li} className="text-zinc-300">
                    {line.startsWith('-') ? (
                      <span>
                        <span className="text-zinc-400 mr-1.5">•</span>
                        {line.replace(/^-+\s*/, '')}
                      </span>
                    ) : (
                      line
                    )}
                  </p>
                ))
              ) : (
                <p className="text-zinc-400 italic">None noted</p>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
