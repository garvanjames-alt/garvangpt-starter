// frontend/src/components/AvatarStage.jsx
// D-ID Agents SDK stage with holding image.
import React, { useEffect, useRef, useState } from "react";
import * as sdk from "@d-id/client-sdk";

export default function AvatarStage({ agentId: agentIdProp, onManager }) {
  const videoRef = useRef(null);
  const bootedRef = useRef(false);
  const mgrRef = useRef(null);
  const streamTimeoutRef = useRef(null);

  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [needsUserGesture, setNeedsUserGesture] = useState(false);
  const [debug, setDebug] = useState("booting");
  const [hasStream, setHasStream] = useState(false);
  const [showStart, setShowStart] = useState(false);

  const agentId = agentIdProp || import.meta.env.VITE_DID_AGENT_ID;

  const backendUrl = import.meta.env.VITE_BACKEND_URL || "";
  const apiBase = backendUrl
    ? backendUrl.replace(/\/$/, "") + "/api"
    : (import.meta.env.VITE_API_BASE || "/api");

  // ✅ holding photo
  const holdingUrl =
    import.meta.env.VITE_DID_HOLDING_URL ||
    import.meta.env.VITE_DID_SOURCE_URL ||
    "";

  const cleanup = () => {
    if (streamTimeoutRef.current) {
      clearTimeout(streamTimeoutRef.current);
      streamTimeoutRef.current = null;
    }
    try {
      mgrRef.current?.disconnect?.();
    } catch {}
    mgrRef.current = null;
    bootedRef.current = false;
    setHasStream(false);
    setShowStart(false);
  };

  const boot = async () => {
    try {
      if (bootedRef.current) return;
      bootedRef.current = true;

      setLoading(true);
      setError(null);
      setNeedsUserGesture(false);
      setShowStart(false);
      setDebug("checking agent id");

      if (!agentId) throw new Error("Missing agentId (VITE_DID_AGENT_ID)");

      setDebug("fetching client_key");
      const ckResp = await fetch(`${apiBase}/did/client-key`, {
        method: "GET",
        headers: { Accept: "application/json" },
        credentials: "include",
      });

      const ckJson = await ckResp.json().catch(() => ({}));
      if (!ckResp.ok || !ckJson?.client_key) {
        throw new Error(ckJson?.error || "Failed to get D-ID client_key from backend");
      }

      const clientKey = ckJson.client_key;
      setDebug("creating agent manager");

      const auth = {
        type: "key",
        clientKey,
        client_key: clientKey,
        key: clientKey,
        token: clientKey,
      };

      const mgr = await sdk.createAgentManager(agentId, {
        auth,
        callbacks: {
          onSrcObjectReady: async (stream) => {
            setDebug("stream received");
            setHasStream(true);
            setShowStart(false);

            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              try {
                videoRef.current.muted = true;
                await videoRef.current.play();
                setNeedsUserGesture(false);
              } catch (playErr) {
                console.warn("[AvatarStage] play blocked", playErr);
                setNeedsUserGesture(true);
              }
            }
          },
          onVideoStateChange: (state) => {
            setDebug(`video state: ${state}`);
          },
          onConnectionStateChange: (state) => {
            setDebug(`connection: ${state}`);
          },
        },
        streamOptions: {
          compatibilityMode: "auto",
          streamWarmup: true,
        },
      });

      mgrRef.current = mgr;
      onManager?.(mgr);

      setDebug("connecting");
      await mgr.connect();

      streamTimeoutRef.current = setTimeout(() => {
        if (!hasStream) {
          setShowStart(true);
          setDebug("connected, no stream yet");
        }
      }, 2500);

      setLoading(false);
    } catch (e) {
      console.error("[AvatarStage] boot error", e);
      setError(String(e?.message || e));
      setLoading(false);
      setNeedsUserGesture(false);
      setShowStart(false);
      setDebug(`boot error: ${String(e?.message || e)}`);
      bootedRef.current = false;
    }
  };

  useEffect(() => {
    boot();
    return cleanup;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId, apiBase]);

  const handleUserPlay = async () => {
    try {
      await videoRef.current?.play();
      setNeedsUserGesture(false);
    } catch {}
  };

  const handleRetry = () => {
    cleanup();
    boot();
  };

  const handleUnmute = () => {
    if (videoRef.current) videoRef.current.muted = false;
  };

  const handleStartAvatar = async () => {
    try {
      setShowStart(false);
      setDebug("sending warmup chat");
      await mgrRef.current?.chat("Hello Garvan, starting the stream.");
    } catch (e) {
      console.warn("[AvatarStage] warmup failed", e);
      setShowStart(true);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      <div
        className="relative w-full max-w-3xl bg-black rounded-xl overflow-hidden shadow-lg"
        style={{ height: 360 }}
      >
        {/* ✅ holding image behind video */}
        {!hasStream && holdingUrl && (
          <img
            src={holdingUrl}
            alt="Holding"
            className="absolute inset-0 w-full h-full object-cover"
          />
        )}

        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          autoPlay
          muted
          controls={false}
        />

        {loading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-sm">
            Starting avatar…
          </div>
        )}

        {needsUserGesture && !loading && !error && (
          <button
            onClick={handleUserPlay}
            className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-sm"
          >
            Tap to start avatar video
          </button>
        )}

        {showStart && !loading && !error && (
          <button
            onClick={handleStartAvatar}
            className="absolute inset-0 flex items-center justify-center bg-black/60 text-white text-sm"
          >
            Start avatar
          </button>
        )}

        {error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-red-200 text-sm p-4 text-center gap-3">
            <div>{error}</div>
            <button
              onClick={handleRetry}
              className="px-3 py-1 rounded bg-white/10 hover:bg-white/20 text-white"
            >
              Retry avatar
            </button>
          </div>
        )}

        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-[11px] text-white/70 bg-black/40 rounded px-2 py-1">
          <div className="truncate">{debug}</div>
          <div className="flex gap-2">
            <button
              onClick={handleRetry}
              className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20"
              title="Retry connection"
            >
              Retry
            </button>
            <button
              onClick={handleUnmute}
              className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20"
              title="Unmute"
            >
              Unmute
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
