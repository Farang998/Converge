import React, { useRef, useState, useEffect } from "react";
import "./accordion.css";

/*
  Props:
   - title: string
   - children: React nodes (content)
   - defaultOpen: boolean (optional)
*/
export default function AccordionSection({ title, children, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const contentRef = useRef(null);
  const [maxHeight, setMaxHeight] = useState("0px");

  useEffect(() => {
    if (contentRef.current) {
      // when open, set max height to scrollHeight for smooth slide
      setMaxHeight(open ? `${contentRef.current.scrollHeight}px` : "0px");
    }
  }, [open, children]);

  // On window resize, recompute expanded height so animation stays correct
  useEffect(() => {
    function onResize() {
      if (open && contentRef.current) {
        setMaxHeight(`${contentRef.current.scrollHeight}px`);
      }
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open]);

  return (
    <div className="accordion-section">
      <button
        className="accordion-header"
        aria-expanded={open}
        onClick={() => {
          setOpen((s) => {
            const next = !s;
            // when opening, force a window 'resize' event after the animation completes so charts like Recharts recompute dimensions
            if (next) setTimeout(() => window.dispatchEvent(new Event('resize')), 260);
            return next;
          });
        }}
      >
        <span className="accordion-title">{title}</span>
      </button>

      <div
        ref={contentRef}
        className={`accordion-content ${open ? "open" : ""}`}
        style={{
          maxHeight,
          opacity: open ? 1 : 0,
        }}
      >
        <div className="accordion-inner">
          {children}
        </div>
      </div>
    </div>
  );
}
