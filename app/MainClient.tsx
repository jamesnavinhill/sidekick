"use client"

import * as React from "react"
import { useDropzone } from "react-dropzone"
import { Loader2, UploadCloud, Settings2, LayoutGrid, List, X, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
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

type Result = {
  base64Data: string;
  description: string;
}

export function MainClient() {
  const [files, setFiles] = React.useState<{file: File, base64: string}[]>([])
  const [loading, setLoading] = React.useState(false)
  const [results, setResults] = React.useState<Result[]>([])
  const [viewMode, setViewMode] = React.useState<"grid" | "list">("list")
  
  // Settings
  const [systemPrompt, setSystemPrompt] = React.useState("")
  const [activeProvider, setActiveProvider] = React.useState("gemini")
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

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [] },
    onDrop: async (acceptedFiles) => {
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

      const newFiles = await Promise.all(acceptedFiles.map(async file => ({
        file,
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
      setFiles([]) // Clear queue on success
    } catch (err: any) {
      alert(err.message || 'Error processing images')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-50 font-sans p-4 md:p-8">
      <header className="max-w-7xl mx-auto mb-8 flex justify-between items-end border-b border-zinc-200 dark:border-zinc-800 pb-4">
        <div>
          <h1 className="text-3xl font-light tracking-tight">sidekick</h1>
          <p className="text-zinc-500 dark:text-zinc-400 font-medium">Property Manager Move-out Inspection Assistant</p>
        </div>
        
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" className="text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-50 hover:bg-zinc-200 dark:hover:bg-zinc-900">
              <Settings2 className="w-4 h-4 mr-2" />
              Settings
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-50 sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>Configuration</DialogTitle>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="space-y-2">
                <Label>System Prompt / Instructions</Label>
                <Textarea 
                  value={systemPrompt}
                  onChange={e => setSystemPrompt(e.target.value)}
                  className="bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 min-h-[120px] resize-none" 
                  placeholder="Enter specific instructions for the AI..."
                />
                <p className="text-xs text-zinc-500 dark:text-zinc-400">Guides the formatting and brevity of the generated descriptions.</p>
              </div>
              <div className="space-y-2">
                <Label>AI Provider</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 dark:focus-visible:ring-zinc-700"
                  value={activeProvider}
                  onChange={e => setActiveProvider(e.target.value)}
                >
                  <option value="gemini">Google Gemini</option>
                  <option value="openai-compatible">Custom OpenAI Compatible</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={saveSettings} className="bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-300">Save Configuration</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </header>

      <main className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
        
        {/* Left Panel: Upload & Queue */}
        <div className="w-full lg:w-1/3 flex flex-col gap-4">
          <div 
            {...getRootProps()} 
            className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors ${isDragActive ? 'border-zinc-400 dark:border-zinc-500 bg-zinc-100 dark:bg-zinc-900/50' : 'border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-900/20'}`}
          >
            <input {...getInputProps()} />
            <UploadCloud className="w-10 h-10 text-zinc-400 dark:text-zinc-600 mb-4" />
            <p className="text-sm text-zinc-500 dark:text-zinc-400 text-center">Drag & drop images here, or click to select files</p>
          </div>

          {files.length > 0 && (
            <div className="bg-zinc-100/50 dark:bg-zinc-900/40 rounded-xl border border-zinc-200 dark:border-zinc-800 p-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Queue ({files.length})</h3>
                <Button variant="ghost" size="sm" onClick={() => setFiles([])} className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">Clear</Button>
              </div>
              <div className="grid grid-cols-3 gap-2 max-h-[400px] overflow-y-auto pr-2 pb-2">
                {files.map((f, i) => (
                  <div key={i} className="relative aspect-square rounded-md overflow-hidden group bg-zinc-200 dark:bg-zinc-950">
                    <img src={`data:image/jpeg;base64,${f.base64}`} className="object-cover w-full h-full opacity-80 group-hover:opacity-100 transition-opacity" alt="preview" />
                    <button 
                      onClick={() => removeFile(i)}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button 
            disabled={files.length === 0 || loading} 
            onClick={submit}
            className="w-full h-14 text-base font-medium bg-zinc-900 dark:bg-zinc-100 text-zinc-50 dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-300 disabled:opacity-50 mt-auto"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
            {loading ? 'Processing Images...' : 'Process & Email Report'}
          </Button>
        </div>

        {/* Right Panel: Output */}
        <div className="w-full lg:w-2/3 flex flex-col bg-white dark:bg-zinc-900/20 rounded-xl border border-zinc-200 dark:border-zinc-800 p-6 min-h-[600px] shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">Inspection Results</h2>
            {results.length > 0 && (
              <div className="flex items-center space-x-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800">
                <button 
                  onClick={() => setViewMode('grid')}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'grid' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                >
                  <LayoutGrid className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setViewMode('list')}
                  className={`p-1.5 rounded-md transition-colors ${viewMode === 'list' ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto pr-2">
            {results.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 dark:text-zinc-600">
                <p>No results yet.</p>
                <p className="text-sm mt-1 text-center max-w-sm">Upload images and process them to generate a succinct move-out report for chargebacks and records.</p>
              </div>
            ) : (
              <AnimatePresence mode="wait">
                <motion.div 
                  key={viewMode}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                  className={`grid gap-6 ${viewMode === 'grid' ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}
                >
                  {results.map((res, i) => (
                    <div 
                      key={i} 
                      className={`flex ${viewMode === 'grid' ? 'flex-col' : 'flex-col sm:flex-row'} gap-4 bg-zinc-50 dark:bg-zinc-900/60 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800/50`}
                    >
                      <div className={`shrink-0 rounded-lg overflow-hidden bg-zinc-200 dark:bg-zinc-950 ${viewMode === 'grid' ? 'w-full aspect-video' : 'w-full sm:w-64 aspect-video sm:aspect-square'}`}>
                        <img src={`data:image/jpeg;base64,${res.base64Data}`} className="w-full h-full object-cover" alt="Processed" />
                      </div>
                      <div className="flex-1">
                        <p className="text-zinc-700 dark:text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">{res.description}</p>
                      </div>
                    </div>
                  ))}
                </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>

      </main>
    </div>
  )
}
