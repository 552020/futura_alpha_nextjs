import ForceClient from "./_force-client";

export default function ChatGroupTemplate({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ForceClient />
      {children}
    </>
  );
}
