// frontend/src/App.jsx
import React, { useState } from "react";
import SupportBar from "./components/SupportBar.jsx";
import AvatarStage from "./components/AvatarStage.jsx";
import VoiceChat from "./VoiceChat.jsx";

export default function App() {
  const [isSpeaking, setIsSpeaking] = useState(false);

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <SupportBar />

      {/* Hero / Avatar stage kept isolated so voice/chat stays safe */}
      <AvatarStage isSpeaking={isSpeaking} />

      <main className="mx-auto max-w-5xl px-4 py-8">
        <VoiceChat onSpeakingChange={setIsSpeaking} />
      </main>
    </div>
  );
}
