import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";
import { Download, ZoomIn, ZoomOut, RotateCcw, Image, FileImage } from "lucide-react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import { save } from "@tauri-apps/plugin-dialog";
import { writeFile } from "@tauri-apps/plugin-fs";

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
  const downloadMenuRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [showDownloadMenu, setShowDownloadMenu] = useState(false);

  // Close download menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (downloadMenuRef.current && !downloadMenuRef.current.contains(event.target as Node)) {
        setShowDownloadMenu(false);
      }
    };

    if (showDownloadMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showDownloadMenu]);

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

  // Generate export-ready SVG with proper dimensions and background
  const generateExportSvg = async (): Promise<{ svg: string; width: number; height: number }> => {
    const { svg: rawSvg } = await mermaid.render(`mermaid-export-${Date.now()}`, code);
    
    const parser = new DOMParser();
    const doc = parser.parseFromString(rawSvg, "image/svg+xml");
    const svgEl = doc.querySelector("svg");
    
    if (!svgEl) throw new Error("Failed to parse SVG");
    
    // Get dimensions from viewBox or attributes
    let width = 800;
    let height = 600;
    
    const viewBox = svgEl.getAttribute("viewBox");
    if (viewBox) {
      const parts = viewBox.split(" ").map(Number);
      if (parts.length === 4) {
        width = Math.ceil(parts[2]);
        height = Math.ceil(parts[3]);
      }
    }
    
    // Also check width/height attributes
    const attrWidth = svgEl.getAttribute("width");
    const attrHeight = svgEl.getAttribute("height");
    if (attrWidth && !attrWidth.includes("%")) {
      width = Math.ceil(parseFloat(attrWidth));
    }
    if (attrHeight && !attrHeight.includes("%")) {
      height = Math.ceil(parseFloat(attrHeight));
    }
    
    // Set explicit dimensions for export
    svgEl.setAttribute("width", String(width));
    svgEl.setAttribute("height", String(height));
    svgEl.removeAttribute("style");
    
    // Add background
    const bgColor = BACKGROUND_COLORS[background];
    if (bgColor !== "transparent") {
      const bgRect = doc.createElementNS("http://www.w3.org/2000/svg", "rect");
      bgRect.setAttribute("x", "0");
      bgRect.setAttribute("y", "0");
      bgRect.setAttribute("width", String(width));
      bgRect.setAttribute("height", String(height));
      bgRect.setAttribute("fill", bgColor);
      svgEl.insertBefore(bgRect, svgEl.firstChild);
    }
    
    // Add xmlns if missing
    if (!svgEl.getAttribute("xmlns")) {
      svgEl.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    }
    
    return {
      svg: new XMLSerializer().serializeToString(svgEl),
      width,
      height,
    };
  };

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
        const { svg: exportSvg } = await generateExportSvg();
        await writeFile(filePath, new TextEncoder().encode(exportSvg));
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
        const { svg: exportSvg, width, height } = await generateExportSvg();
        const scale = 2; // High DPI
        
        // Convert SVG to base64 data URL to avoid CORS/tainted canvas issues
        const svgBase64 = btoa(unescape(encodeURIComponent(exportSvg)));
        const dataUrl = `data:image/svg+xml;base64,${svgBase64}`;
        
        // Create an image from the SVG
        const img = new window.Image();
        
        await new Promise<void>((resolve, reject) => {
          img.onload = async () => {
            try {
              const canvas = document.createElement("canvas");
              canvas.width = width * scale;
              canvas.height = height * scale;
              
              const ctx = canvas.getContext("2d");
              if (!ctx) throw new Error("Failed to get canvas context");
              
              // Fill background first (for transparent SVGs)
              const bgColor = BACKGROUND_COLORS[background];
              if (bgColor !== "transparent") {
                ctx.fillStyle = bgColor;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
              }
              
              // Draw the SVG
              ctx.scale(scale, scale);
              ctx.drawImage(img, 0, 0, width, height);
              
              // Convert to PNG
              const pngDataUrl = canvas.toDataURL("image/png");
              const base64Data = pngDataUrl.split(",")[1];
              const binaryString = atob(base64Data);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              
              await writeFile(filePath, bytes);
              resolve();
            } catch (err) {
              reject(err);
            }
          };
          
          img.onerror = () => {
            reject(new Error("Failed to load SVG as image"));
          };
          
          img.src = dataUrl;
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
              <div className="relative" ref={downloadMenuRef}>
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
                className="w-full h-full flex items-center justify-center p-4"
                dangerouslySetInnerHTML={{ __html: svg }}
              />
            </TransformComponent>
          </>
        )}
      </TransformWrapper>
    </div>
  );
}
