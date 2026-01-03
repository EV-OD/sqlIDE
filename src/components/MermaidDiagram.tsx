import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { Download, ZoomIn, ZoomOut, RotateCcw, Image, FileImage } from "lucide-react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { save } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";

interface MermaidDiagramProps {
  code: string;
  background?: "light" | "dark" | "transparent";
}

const BACKGROUND_CLASSES = {
  light: "bg-white",
  dark: "bg-zinc-900",
  transparent: "bg-transparent",
};

const BACKGROUND_COLORS = {
  light: "#ffffff",
  dark: "#18181b",
  transparent: "transparent",
};

export default function MermaidDiagram({ code, background = "light" }: MermaidDiagramProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: "default",
      securityLevel: "loose",
    });
  }, []);

  useEffect(() => {
    const renderDiagram = async () => {
      if (!code) return;
      try {
        setError(null);
        const { svg } = await mermaid.render(`mermaid-${Date.now()}`, code);
        // Remove max-width constraint and ensure SVG takes full space
        const cleanSvg = svg
          .replace(/max-width:[^;"]+;?/g, "")
          .replace(/height="[^"]*"/, "")
          .replace(/width="[^"]*"/, 'width="100%"');
        setSvg(cleanSvg);
      } catch (err) {
        console.error("Mermaid render error:", err);
        setError("Failed to render diagram. Syntax might be invalid.");
      }
    };

    renderDiagram();
  }, [code]);

  const [downloading, setDownloading] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  const handleDownloadSvg = async () => {
    if (!code) return;
    
    setDownloading(true);
    setShowDownloadMenu(false);
    
    try {
      const filePath = await save({
        defaultPath: "er-diagram.svg",
        filters: [
          { name: "SVG Image", extensions: ["svg"] },
        ],
      });

      if (filePath) {
        const bgColor = BACKGROUND_COLORS[background];
        await invoke("export_mermaid_diagram", {
          mermaidCode: code,
          outputPath: filePath,
          background: bgColor,
          theme: null,
        });
      }
    } catch (err) {
      console.error("Failed to save SVG:", err);
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadPng = async () => {
    if (!code) return;
    
    setDownloading(true);
    setShowDownloadMenu(false);
    
    try {
      const filePath = await save({
        defaultPath: "er-diagram.png",
        filters: [
          { name: "PNG Image", extensions: ["png"] },
        ],
      });

      if (filePath) {
        const bgColor = BACKGROUND_COLORS[background];
        await invoke("export_mermaid_diagram", {
          mermaidCode: code,
          outputPath: filePath,
          background: bgColor,
          theme: null,
        });
      }
    } catch (err) {
      console.error("Failed to save PNG:", err);
    } finally {
      setDownloading(false);
    }
  };

  if (error) {
    return <div className="text-red-400 p-4 border border-red-800 rounded bg-red-900/20">{error}</div>;
  }

  return (
    <div className={`relative w-full h-full flex flex-col ${BACKGROUND_CLASSES[background]} rounded-lg shadow-sm border border-zinc-700 overflow-hidden`}>
      <TransformWrapper
        initialScale={1}
        minScale={0.01}
        maxScale={100}
        limitToBounds={false}
        centerOnInit
      >
        {({ zoomIn, zoomOut, resetTransform }) => (
          <>
            <div className="absolute top-2 right-2 z-10 flex gap-2">
              <div className="flex bg-zinc-800 rounded-md shadow-sm border border-zinc-700 overflow-hidden">
                <button
                  onClick={() => zoomIn()}
                  className="p-2 text-zinc-300 hover:bg-zinc-700 transition-colors border-r border-zinc-700"
                  title="Zoom In"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => zoomOut()}
                  className="p-2 text-zinc-300 hover:bg-zinc-700 transition-colors border-r border-zinc-700"
                  title="Zoom Out"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={() => resetTransform()}
                  className="p-2 text-zinc-300 hover:bg-zinc-700 transition-colors"
                  title="Reset Zoom"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
              
              {/* Download dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowDownloadMenu(!showDownloadMenu)}
                  disabled={downloading}
                  className="p-2 bg-zinc-800 text-zinc-300 rounded-md shadow-sm border border-zinc-700 hover:bg-zinc-700 transition-colors disabled:opacity-50"
                  title="Download"
                >
                  <Download className={`w-4 h-4 ${downloading ? "animate-pulse" : ""}`} />
                </button>
                
                {showDownloadMenu && (
                  <div className="absolute right-0 mt-1 bg-zinc-800 border border-zinc-700 rounded-md shadow-lg overflow-hidden z-20">
                    <button
                      onClick={handleDownloadSvg}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
                    >
                      <FileImage className="w-4 h-4" />
                      Download SVG
                    </button>
                    <button
                      onClick={handleDownloadPng}
                      className="flex items-center gap-2 w-full px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-700 transition-colors"
                    >
                      <Image className="w-4 h-4" />
                      Download PNG
                    </button>
                  </div>
                )}
              </div>
            </div>
            <TransformComponent
              wrapperClass="w-full h-full min-h-[500px] overflow-hidden"
              wrapperStyle={{ width: "100%", height: "100%" }}
              contentClass="w-full h-full flex items-center justify-center"
            >
              <div 
                ref={ref} 
                className="w-full h-full flex items-center justify-center"
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </div>
  );
}
