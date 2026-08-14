import { Dashboard } from "@/components/Dashboard";

export default function Home() {
  return (
    <div className="w-full bg-black border-4 border-green-500 rounded p-6 shadow-[0_0_15px_rgba(34,197,94,0.3)] min-h-[80vh]">
      <Dashboard />
    </div>
  );
}
