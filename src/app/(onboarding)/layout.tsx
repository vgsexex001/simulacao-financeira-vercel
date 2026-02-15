export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="mx-auto w-full max-w-2xl flex-1 px-4 py-8">
        {children}
      </div>
    </div>
  );
}
