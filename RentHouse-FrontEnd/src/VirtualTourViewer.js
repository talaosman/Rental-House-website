import React, { useEffect, useRef, useState } from "react";
import "./VirtualTourViewer.css";

const VirtualTourViewer = ({ tourUrl, location }) => {
  const viewerRef = useRef(null);
  const instanceRef = useRef(null);
  const [status, setStatus] = useState("idle"); // idle | loading | ready | error

  useEffect(() => {
    if (!tourUrl || !viewerRef.current) return;

    let blobUrl = null;
    let destroyed = false;
    // Fallback: if onLoad never fires within 15s after Pannellum init, assume ready
    let loadTimeout = null;

    const initPannellum = (objectUrl) => {
      if (destroyed || !viewerRef.current) return;

      if (instanceRef.current) {
        try { instanceRef.current.destroy(); } catch (_) { }
        instanceRef.current = null;
      }

      // Clear any leftover DOM inside the container (Pannellum leaves stale nodes on reinit)
      viewerRef.current.innerHTML = "";

      instanceRef.current = window.pannellum.viewer(viewerRef.current, {
        type: "equirectangular",
        panorama: objectUrl,
        autoLoad: true,
        autoRotate: -1.5,

        // ✅ Quality fixes
        hfov: 100,              // wider FOV = less zoom-in distortion
        minHfov: 50,
        maxHfov: 120,

        // ✅ Force full resolution rendering
        multiRes: false,        // disable multi-res downscaling
        dynamic: false,

        // ✅ Prevent Pannellum from downsampling the texture
        // These force WebGL to use the full image size
        haov: 360,
        vaov: 180,
        vOffset: 0,

        compass: false,
        showFullscreenCtrl: true,
        showZoomCtrl: true,
        mouseZoom: true,
        keyboardZoom: true,

        // ✅ WebGL quality
        backgroundColor: [0, 0, 0],

        onLoad: () => {
          clearTimeout(loadTimeout);
          if (!destroyed) {
            setStatus("ready");
            setTimeout(fixCanvasResolution, 100); // after Pannellum paints
          }
        },
        onError: (err) => {
          clearTimeout(loadTimeout);
          console.error("Pannellum error:", err);
          if (!destroyed) setStatus("error");
        },
      });

      loadTimeout = setTimeout(() => {
        if (!destroyed && status !== "ready" && status !== "error") {
          const canvas = viewerRef.current?.querySelector("canvas");
          if (canvas) {
            setStatus("ready"); // Pannellum rendered — just missed the callback
          } else {
            setStatus("error"); // Nothing rendered at all
          }
        }
      }, 12000);
    };

    // After initPannellum runs, fix canvas resolution
    const fixCanvasResolution = () => {
      if (!viewerRef.current) return;
      const canvas = viewerRef.current.querySelector("canvas");
      if (!canvas) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();

      // Only upscale if canvas is lower than display resolution
      if (canvas.width < rect.width * dpr) {
        canvas.width = Math.floor(rect.width * dpr);
        canvas.height = Math.floor(rect.height * dpr);
        canvas.style.width = rect.width + "px";
        canvas.style.height = rect.height + "px";
      }
    };

    const loadImage = async () => {
      setStatus("loading");
      try {
        const res = await fetch(tourUrl, { credentials: "include" });
        if (!res.ok) { setStatus("error"); return; }

        const contentType = res.headers.get("content-type") || "";
        if (!contentType.startsWith("image/")) { setStatus("error"); return; }

        // ✅ Read entire blob before initializing Pannellum
        const blob = await res.blob();

        // ✅ Verify it's fully downloaded
        console.log(`Panorama loaded: ${(blob.size / 1024 / 1024).toFixed(1)} MB`);

        blobUrl = URL.createObjectURL(blob);
        if (destroyed) { URL.revokeObjectURL(blobUrl); return; }

        // ✅ Pre-decode the image so WebGL gets the full texture
        const img = new Image();
        img.src = blobUrl;
        await new Promise((resolve) => {
          img.onload = resolve;
          img.onerror = resolve; // proceed anyway
        });

        if (window.pannellum) {
          initPannellum(blobUrl);
        } else {
          loadPannellumScripts(() => initPannellum(blobUrl));
        }
      } catch (err) {
        console.error("Failed to fetch panorama:", err);
        if (!destroyed) setStatus("error");
      }
    };

    const loadPannellumScripts = (callback) => {
      if (!document.querySelector('link[href*="pannellum"]')) {
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.css";
        document.head.appendChild(link);
      }

      if (!document.querySelector('script[src*="pannellum"]')) {
        const script = document.createElement("script");
        script.src = "https://cdn.jsdelivr.net/npm/pannellum@2.5.6/build/pannellum.js";
        script.onload = callback;
        script.onerror = () => setStatus("error");
        document.head.appendChild(script);
      } else {
        // Script tag exists but window.pannellum may not be assigned yet — poll
        const poll = setInterval(() => {
          if (window.pannellum) { clearInterval(poll); callback(); }
        }, 100);
      }
    };

    if (window.pannellum) {
      loadImage();
    } else {
      loadPannellumScripts(loadImage);
    }

    return () => {
      destroyed = true;
      clearTimeout(loadTimeout);
      if (instanceRef.current) {
        try { instanceRef.current.destroy(); } catch (_) { }
        instanceRef.current = null;
      }
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [tourUrl]); // ← do NOT add `status` here — it would cause an infinite loop

  return (
    <div className="vt-wrapper">


      {location && <span className="vt-location">{location}</span>}


      <div className="vt-body">
        {/* Overlay only shown while loading or on error */}
        {(status === "loading" || status === "idle") && (
          <div className="vt-overlay">
            <div className="vt-spinner" />
            <p>Loading panorama…</p>
            <p style={{ fontSize: "12px", opacity: 0.5, marginTop: "4px" }}>
              This may take a few seconds
            </p>
          </div>
        )}

        {status === "error" && (
          <div className="vt-overlay vt-error">
            <p>⚠ Could not load the virtual tour.</p>
            <button
              onClick={() => window.location.reload()}
              style={{ marginTop: "10px", padding: "8px 16px", cursor: "pointer" }}
            >
              Retry
            </button>
          </div>
        )}

        {/* 
          ← KEY FIX: always render the div, never set visibility:hidden.
          Pannellum MUST paint into a visible, mounted DOM node.
          The overlay above sits on top via CSS z-index until status === "ready".
        */}
        <div ref={viewerRef} className="vt-canvas" />
      </div>

      {status === "ready" && (
        <p className="vt-hint">
          Click &amp; drag to look around · Scroll to zoom · F for fullscreen
        </p>
      )}
    </div>
  );
};

export default VirtualTourViewer;