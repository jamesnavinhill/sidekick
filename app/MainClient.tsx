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
  Flame,
  Wrench,
  PanelLeftClose,
  PanelLeftOpen,
  Sun,
  Moon
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
import { SEEDED_PROPERTIES } from "@/lib/data/seededProperties"

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
  // Theme state
  const [theme, setTheme] = React.useState<"dark" | "light">("dark")
  
  // Panel collapse
  const [sidebarOpen, setSidebarOpen] = React.useState(true)

  // Selected Property
  const [selectedPropertyId, setSelectedPropertyId] = React.useState<string>(SEEDED_PROPERTIES[0].id)
  
  // Custom upload state vs Seeded property state
  const [isCustomMode, setIsCustomMode] = React.useState(false)
  const [files, setFiles] = React.useState<{file?: File, base64?: string, imageUrl?: string, name?: string}[]>(
    SEEDED_PROPERTIES[0].results.map(r => ({ imageUrl: r.imageUrl, name: r.fileName }))
  )
  const [loading, setLoading] = React.useState(false)
  const [results, setResults] = React.useState<Result[]>(SEEDED_PROPERTIES[0].results)
  
  // View mode: 'slideshow' | 'list' | 'grid'
  const [viewMode, setViewMode] = React.useState<"slideshow" | "list" | "grid">("slideshow")
  const [slideIndex, setSlideIndex] = React.useState(0)
  
  // Settings
  const [systemPrompt, setSystemPrompt] = React.useState("")
  const [activeProvider, setActiveProvider] = React.useState("cf-jami-qwen-qwen3-8-27b")
  const [settingsOpen, setSettingsOpen] = React.useState(false)

  // Initialize theme
  React.useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'dark' | 'light' | null
    if (savedTheme) {
      setTheme(savedTheme)
      document.documentElement.classList.toggle('dark', savedTheme === 'dark')
    } else {
      document.documentElement.classList.add('dark')
    }
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('theme', next)
    document.documentElement.classList.toggle('dark', next === 'dark')
  }

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
      setFiles(prop.results.map(r => ({ imageUrl: r.imageUrl, name: r.fileName })))
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

  return (
    <div className="h-screen w-screen overflow-hidden bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans flex flex-col">
      
      {/* ========================================================================= */}
      {/* 1. HEADER (ICONS ONLY EXCEPT THE PROPERTY SELECTOR) */}
      {/* Left: [Toggle Input] | [Property Selector] */}
      {/* Right: [Slideshow/Card/Grid] | [Theme Toggle (Sun/Moon)] | [Settings] */}
      {/* ========================================================================= */}
      <header className="shrink-0 h-13 bg-white/95 dark:bg-zinc-950/95 border-b border-zinc-200 dark:border-zinc-800/80 px-3 flex items-center justify-between z-30">
        
        {/* Left Group */}
        <div className="flex items-center gap-2">
          
          {/* Input Panel Toggle Icon */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setSidebarOpen(prev => !prev)}
            className="w-8 h-8 rounded-md text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800"
            title={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
          >
            {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </Button>

          {/* Property Selector */}
          <div className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-md px-2.5 py-1 shadow-2xs">
            <Building2 className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400 shrink-0" />
            <select
              id="property-select"
              aria-label="Select Property"
              value={selectedPropertyId}
              onChange={(e) => handlePropertyChange(e.target.value)}
              className="bg-transparent text-xs text-zinc-900 dark:text-zinc-200 font-medium focus:outline-none cursor-pointer pr-1"
            >
              <optgroup label="Seeded Inspection Reports">
                {SEEDED_PROPERTIES.map(p => (
                  <option key={p.id} value={p.id} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-200">
                    {p.name} ({p.modelLabel})
                  </option>
                ))}
              </optgroup>
              <optgroup label="Custom Walkthrough">
                <option value="new-custom" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-200">
                  + New Property Walkthrough...
                </option>
              </optgroup>
            </select>
          </div>

        </div>

        {/* Right Group */}
        <div className="flex items-center gap-2">
          
          {/* View Mode Switcher Icons: Slideshow | Cards | Grid */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-0.5 rounded-md">
            <button 
              onClick={() => setViewMode('slideshow')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'slideshow' 
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-2xs' 
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
              title="Slideshow View"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
            </button>
            
            <button 
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'list' 
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-2xs' 
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
              title="Horizontal Cards View"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded transition-colors ${
                viewMode === 'grid' 
                  ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-2xs' 
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Theme Toggle Button (Sun on Moon / One Icon) */}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={toggleTheme}
            className="w-8 h-8 rounded-md text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800"
            title={theme === 'dark' ? "Switch to light theme" : "Switch to dark theme"}
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>

          {/* Settings Icon Dialog */}
          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="w-8 h-8 rounded-md text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-800"
                title="Settings & Model Configuration"
              >
                <Settings2 className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 sm:max-w-[660px] max-h-[88vh] flex flex-col p-5 overflow-hidden shadow-xl rounded-xl">
              <DialogHeader className="pb-2 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
                <DialogTitle className="text-base font-semibold">Model & Prompt Configuration</DialogTitle>
              </DialogHeader>
              
              <div className="overflow-y-auto pr-1 py-3 space-y-4 flex-1">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">AI Inspection Instructions</Label>
                  <Textarea 
                    value={systemPrompt}
                    onChange={e => setSystemPrompt(e.target.value)}
                    className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 min-h-[160px] text-xs text-zinc-800 dark:text-zinc-200 font-mono resize-none focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-700 leading-relaxed" 
                    placeholder="Enter specific move-out guidelines..."
                  />
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">Controls the structural format, brevity, and chargeback focus of descriptions.</p>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">Default Model Provider</Label>
                  <select 
                    className="flex h-9 w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-1.5 text-xs text-zinc-800 dark:text-zinc-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-700"
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

              <DialogFooter className="pt-2 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
                <Button onClick={saveSettings} size="sm" className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 text-xs">
                  Save Configuration
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

        </div>

      </header>

      {/* ========================================================================= */}
      {/* 2. MAIN WORKSPACE (NO DUAL SCROLLBARS, COMPACT PADDING) */}
      {/* ========================================================================= */}
      <main className="flex-1 flex overflow-hidden p-2 md:p-3 gap-3">
        
        {/* ========================================================================= */}
        {/* LEFT PANEL: Collapsible, Previews on top, Ghost Dropzone right above submit */}
        {/* ========================================================================= */}
        <AnimatePresence initial={false}>
          {sidebarOpen && (
            <motion.aside 
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="shrink-0 h-full flex flex-col bg-white dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-3 shadow-2xs overflow-hidden"
            >
              <div className="flex-1 flex flex-col min-h-0 gap-3">
                
                {/* 1. IMAGE PREVIEWS (Expands to fill vertical room, hidden scrollbar) */}
                <div className="flex-1 min-h-0 flex flex-col">
                  <div className="flex justify-between items-center pb-1.5 shrink-0">
                    <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                      Queue ({files.length})
                    </span>
                    {files.length > 0 && isCustomMode && (
                      <Button variant="ghost" size="sm" onClick={() => setFiles([])} className="h-5 px-1.5 text-[11px] text-zinc-400 hover:text-zinc-200">
                        Clear
                      </Button>
                    )}
                  </div>

                  <div className="flex-1 min-h-0 overflow-y-auto no-scrollbar pr-0.5">
                    {files.length > 0 ? (
                      <div className="grid grid-cols-3 gap-1.5 pb-1">
                        {files.map((f, i) => (
                          <div key={i} className="relative aspect-square rounded-md overflow-hidden group bg-zinc-200 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800">
                            <img 
                              src={getImageSrc(f)} 
                              className="object-cover w-full h-full opacity-90 group-hover:opacity-100 transition-opacity" 
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
                    ) : (
                      <div className="h-full flex items-center justify-center text-center text-xs text-zinc-400 px-4">
                        Drop photos below or select a seeded property above.
                      </div>
                    )}
                  </div>
                </div>

                {/* 2. UPLOAD GHOST CARD (Placed right above submit button) */}
                <div 
                  {...getRootProps()} 
                  className={`shrink-0 border border-dashed rounded-lg p-3 flex flex-col items-center justify-center cursor-pointer transition-all ${
                    isDragActive 
                      ? 'border-zinc-400 bg-zinc-100 dark:bg-zinc-800/40 text-zinc-900 dark:text-white' 
                      : 'border-zinc-300 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700 bg-zinc-50 dark:bg-zinc-950/40 text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  <input {...getInputProps()} />
                  <UploadCloud className="w-5 h-5 mb-1 opacity-70" />
                  <p className="text-xs font-medium text-center">
                    <span className="text-zinc-800 dark:text-zinc-200">Click to upload</span> or drag & drop
                  </p>
                </div>

                {/* 3. SUBMIT / ACTION BUTTON */}
                <div className="shrink-0 pt-1">
                  <Button 
                    disabled={files.length === 0 || loading} 
                    onClick={submit}
                    className="w-full h-10 text-xs font-semibold bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 disabled:opacity-40 transition-all rounded-lg shadow-2xs"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                        {isCustomMode ? 'Process & Generate Report' : 'Re-run Evaluation'}
                      </>
                    )}
                  </Button>
                </div>

              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* ========================================================================= */}
        {/* RIGHT PANEL: Pure scrollable output viewport (No redundant top headers) */}
        {/* ========================================================================= */}
        <section className="flex-1 h-full overflow-y-auto bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-4 shadow-2xs flex flex-col">
          
          {results.length === 0 ? (
            <div className="flex-1 min-h-[300px] flex flex-col items-center justify-center text-zinc-400 text-center">
              <Building2 className="w-10 h-10 stroke-1 text-zinc-400 mb-2" />
              <p className="text-xs font-medium text-zinc-400">No inspection reports in view</p>
              <p className="text-[11px] text-zinc-400 mt-0.5 max-w-xs">
                Upload images or choose a property from the top menu.
              </p>
            </div>
          ) : (
            <div className="flex-1">
              
              {/* 1. SLIDESHOW VIEW MODE */}
              {viewMode === 'slideshow' && (
                <div className="flex flex-col gap-4 max-w-4xl mx-auto py-1">
                  
                  {/* Slideshow Photo Container */}
                  <div className="relative aspect-[16/10] w-full rounded-xl overflow-hidden bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 shadow group">
                    <img 
                      src={getImageSrc(results[slideIndex])} 
                      className="w-full h-full object-contain bg-zinc-950" 
                      alt={`Slide ${slideIndex + 1}`} 
                    />

                    {/* Navigation Arrows */}
                    <button 
                      onClick={() => setSlideIndex(prev => (prev > 0 ? prev - 1 : results.length - 1))}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-sm transition-all shadow"
                      title="Previous Photo"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <button 
                      onClick={() => setSlideIndex(prev => (prev < results.length - 1 ? prev + 1 : 0))}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-sm transition-all shadow"
                      title="Next Photo"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    {/* Slide Badge */}
                    <div className="absolute bottom-2.5 left-1/2 -translate-x-1/2 bg-black/70 backdrop-blur-md px-2.5 py-0.5 rounded-full text-[11px] font-semibold text-zinc-200 border border-zinc-700/60 shadow">
                      {slideIndex + 1} / {results.length}
                    </div>
                  </div>

                  {/* Report Breakdown Displayed Neatly Below Slideshow Photo */}
                  <div className="bg-zinc-50 dark:bg-zinc-900/80 border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-5 shadow-2xs">
                    <FormattedReport description={results[slideIndex].description} />
                  </div>

                </div>
              )}

              {/* 2. HORIZONTAL CARD LIST VIEW */}
              {viewMode === 'list' && (
                <div className="flex flex-col gap-4">
                  {results.map((res, i) => (
                    <motion.div 
                      key={i}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.12, delay: i * 0.02 }}
                      className="flex flex-col md:flex-row gap-4 bg-zinc-50 dark:bg-zinc-900/70 hover:dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800/80 rounded-xl p-3.5 transition-all shadow-2xs group"
                    >
                      {/* Fixed Ratio Photo */}
                      <div className="shrink-0 w-full md:w-[260px] lg:w-[290px] aspect-[4/3] rounded-lg overflow-hidden bg-zinc-950 border border-zinc-200 dark:border-zinc-800/80 relative">
                        <img 
                          src={getImageSrc(res)} 
                          className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-200" 
                          alt={`Inspection item ${i + 1}`} 
                        />
                        <div className="absolute top-1.5 left-1.5 bg-black/70 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-semibold text-zinc-200 border border-zinc-700/50">
                          #{i + 1}
                        </div>
                      </div>

                      {/* Formatted Report */}
                      <div className="flex-1 flex flex-col justify-center min-w-0">
                        <FormattedReport description={res.description} />
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              {/* 3. BALANCED GRID VIEW */}
              {viewMode === 'grid' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {results.map((res, i) => (
                    <div 
                      key={i} 
                      className="flex flex-col bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200 dark:border-zinc-800/80 rounded-xl overflow-hidden shadow-2xs"
                    >
                      <div className="aspect-video w-full bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800/60 overflow-hidden relative">
                        <img 
                          src={getImageSrc(res)} 
                          className="w-full h-full object-cover" 
                          alt={`Inspection grid item ${i + 1}`} 
                        />
                        <div className="absolute top-1.5 left-1.5 bg-black/70 backdrop-blur-md px-1.5 py-0.5 rounded text-[10px] font-semibold text-zinc-200 border border-zinc-700/50">
                          #{i + 1}
                        </div>
                      </div>
                      <div className="p-3.5 flex-1">
                        <FormattedReport description={res.description} />
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          )}

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

  const hasStructuredSections = 
    description.includes('Condition Overview') || 
    description.includes('Excessive Dirt') || 
    description.includes('Damages Details')

  if (!hasStructuredSections) {
    return (
      <div className="text-xs text-zinc-700 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap font-sans">
        {description}
      </div>
    )
  }

  const sections = description.split(/(?=\*\*?[A-Z][a-zA-Z\s]+(?:Overview|Details|Condition)\*?\*?)/g)

  return (
    <div className="space-y-2.5 text-xs">
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
          <div key={idx} className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5">
              {isCondition && <CheckCircle2 className="w-3 h-3 text-emerald-500 dark:text-emerald-400 shrink-0" />}
              {isDirt && <Flame className="w-3 h-3 text-amber-500 dark:text-amber-400 shrink-0" />}
              {isDamage && <Wrench className="w-3 h-3 text-rose-500 dark:text-rose-400 shrink-0" />}
              <span className={`text-[11px] font-bold uppercase tracking-wider ${
                isCondition 
                  ? 'text-emerald-600 dark:text-emerald-400' 
                  : isDirt 
                  ? 'text-amber-600 dark:text-amber-400' 
                  : isDamage 
                  ? 'text-rose-600 dark:text-rose-400' 
                  : 'text-zinc-700 dark:text-zinc-300'
              }`}>
                {header}
              </span>
            </div>
            <div className="pl-4.5 text-zinc-700 dark:text-zinc-300 leading-relaxed space-y-0.5">
              {bodyLines.length > 0 ? (
                bodyLines.map((line, li) => (
                  <p key={li}>
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
