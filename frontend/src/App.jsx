// frontend/src/App.jsx
import React, { useMemo, useState } from "react";
import AvatarStage from "./components/AvatarStage.jsx";
import SupportBar from "./components/SupportBar.jsx";
import VoiceChat from "./VoiceChat.jsx";

export default function App() {
  const [isSpeaking, setIsSpeaking] = useState(false);

  // use your real hero image if different
  const avatarSrc = useMemo(() => "/avatar.jpg", []);

  return (
    <div className="min-h-screen bg-white text-neutral-900">
      <SupportBar />

      <AvatarStage src={avatarSrc} isSpeaking={isSpeaking} />

      <main className="mx-auto max-w-5xl px-4 py-8">
        <VoiceChat />
      </main>
    </div>
  );
}
