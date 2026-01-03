import { useState, useCallback, useRef, useEffect } from "react";
import clsx from "clsx";

interface ResizablePanelsProps {
  direction: "horizontal" | "vertical";
  children: [React.ReactNode, React.ReactNode];
  defaultSize?: number; // percentage for first panel
  minSize?: number; // minimum percentage
  maxSize?: number; // maximum percentage
  className?: string;
}

export function ResizablePanels({
  direction,
  children,
  defaultSize = 50,
  minSize = 10,
  maxSize = 90,
  className,
}: ResizablePanelsProps) {
  const [size, setSize] = useState(defaultSize);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = direction === "horizontal" ? "col-resize" : "row-resize";
    document.body.style.userSelect = "none";
  }, [direction]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();
      let newSize: number;

      if (direction === "horizontal") {
        newSize = ((e.clientX - rect.left) / rect.width) * 100;
      } else {
        newSize = ((e.clientY - rect.top) / rect.height) * 100;
      }

      newSize = Math.max(minSize, Math.min(maxSize, newSize));
      setSize(newSize);
    };

    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [direction, minSize, maxSize]);

  const isHorizontal = direction === "horizontal";

  return (
    <div
      ref={containerRef}
      className={clsx(
        "flex h-full w-full",
        isHorizontal ? "flex-row" : "flex-col",
        className
      )}
    >
      {/* First Panel */}
      <div
        className="overflow-hidden"
        style={{
          [isHorizontal ? "width" : "height"]: `${size}%`,
          flexShrink: 0,
        }}
      >
        {children[0]}
      </div>

      {/* Resize Handle */}
      <div
        onMouseDown={handleMouseDown}
        className={clsx(
          "flex-shrink-0 bg-zinc-800 hover:bg-blue-500 active:bg-blue-500 transition-colors flex items-center justify-center group",
          isHorizontal
            ? "w-1.5 cursor-col-resize"
            : "h-1.5 cursor-row-resize"
        )}
      >
        <div
          className={clsx(
            "bg-zinc-600 group-hover:bg-blue-400 rounded-full transition-colors",
            isHorizontal ? "w-0.5 h-8" : "h-0.5 w-8"
          )}
        />
      </div>

      {/* Second Panel */}
      <div className="flex-1 overflow-hidden min-w-0 min-h-0">
        {children[1]}
      </div>
    </div>
  );
}
