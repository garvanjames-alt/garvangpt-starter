import MessageBubble from "./MessageBubble";

export default function MessagePreview() {
  return (
    <section className="px-4 py-6 border-b border-zinc-800">
      <div className="max-w-[900px] mx-auto space-y-3">
        <MessageBubble role="assistant">
          Hello! How can I help today?
        </MessageBubble>
        <MessageBubble role="user">
          what is amoxicillin?
        </MessageBubble>
      </div>
    </section>
  );
}
