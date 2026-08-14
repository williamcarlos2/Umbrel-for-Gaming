"use client";
import { useState } from "react";

type Check = { id: string; text: string; weight: number; failNote?: string };
type Category = { id: string; label: string; checks: Check[] };
type Platform = { id: string; name: string; categories: Category[]; gradeNotes: string };

const PLATFORMS: Platform[] = [
  {
    id: "nes-snes-n64",
    name: "NES / SNES / N64 Cartridge",
    gradeNotes: "Loose cart grading. CIB adds 40-80% value — score box and manual separately.",
    categories: [
      {
        id: "label", label: "Label", checks: [
          { id: "l1", text: "Label is present (not missing or replaced)", weight: 30, failNote: "Missing/replaced label drastically reduces value and flags possible counterfeit" },
          { id: "l2", text: "Label is fully intact — no tears, peeling, or lifting edges", weight: 15 },
          { id: "l3", text: "Label has no writing, stickers, or price tags", weight: 10 },
          { id: "l4", text: "Color is not faded or sun-bleached", weight: 10 },
          { id: "l5", text: "Label is correctly centered and aligned", weight: 5 },
        ]
      },
      {
        id: "shell", label: "Cart Shell", checks: [
          { id: "s1", text: "No cracks in the plastic shell", weight: 10 },
          { id: "s2", text: "No deep gouges or missing plastic chunks", weight: 10 },
          { id: "s3", text: "Correct screw type (Nintendo: gamebit/tri-wing, not Phillips)", weight: 5, failNote: "Phillips screws on Nintendo carts often indicate opening/repair or counterfeit" },
          { id: "s4", text: "Cartridge connector pins look clean (not corroded/green)", weight: 5 },
        ]
      },
      {
        id: "auth", label: "Authentication Flags", checks: [
          { id: "a1", text: "Game ID / revision on label matches expected format for platform", weight: 0, failNote: "Check against known good examples online" },
          { id: "a2", text: "Label printing quality looks sharp (not blurry, low-res, or inkjet-printed)", weight: 0, failNote: "Counterfeits often have noticeably different print quality" },
          { id: "a3", text: "PCB visible through label slot matches expected chip layout (if verifiable)", weight: 0, failNote: "Real NES/SNES PCBs have specific chip configurations — fakes often differ" },
        ]
      }
    ]
  },
  {
    id: "gba-gb",
    name: "GBA / Game Boy / GBC Cartridge",
    gradeNotes: "GBA is the most counterfeited platform. Extra authentication attention required.",
    categories: [
      {
        id: "label", label: "Label", checks: [
          { id: "l1", text: "Label present and not replaced", weight: 25, failNote: "Replacement labels are common on fakes" },
          { id: "l2", text: "Label texture matches official Nintendo feel (slightly textured, not glossy)", weight: 15, failNote: "Fakes are often glossy/laminated" },
          { id: "l3", text: "No writing, stickers, or price tags", weight: 10 },
          { id: "l4", text: "Color saturation matches reference images", weight: 10 },
        ]
      },
      {
        id: "shell", label: "Cart Shell", checks: [
          { id: "s1", text: "Correct screw type: tri-wing (not Phillips)", weight: 20, failNote: "Phillips screws = almost certainly a fake or opened cart" },
          { id: "s2", text: "Plastic quality feels solid, correct weight", weight: 5 },
          { id: "s3", text: "Cart fits correctly in GBA slot without wobble", weight: 5 },
          { id: "s4", text: "Battery backup test: saves game and retains after power cycle", weight: 10, failNote: "Fakes often have no or very short battery life" },
        ]
      }
    ]
  },
  {
    id: "disc",
    name: "PS1 / PS2 / Dreamcast / GameCube Disc",
    gradeNotes: "Disc condition is everything. Deep scratches = unplayable. Surface marks = usually fine after cleaning.",
    categories: [
      {
        id: "disc", label: "Disc Condition", checks: [
          { id: "d1", text: "No deep radial scratches (scratches going through the data layer)", weight: 40, failNote: "Deep radial scratches often cause read errors — test if possible" },
          { id: "d2", text: "No surface cracks or chips in the disc substrate", weight: 20 },
          { id: "d3", text: "Light circular scratches (from disc rot) are minor/absent", weight: 15 },
          { id: "d4", text: "Disc label side has no writing, damage, or moisture marks", weight: 10 },
          { id: "d5", text: "Disc hub area (center) is undamaged", weight: 5 },
        ]
      },
      {
        id: "case", label: "Case / Manual", checks: [
          { id: "c1", text: "Case has no cracks (spine, hinges, corners)", weight: 5, failNote: "Cracked cases are common — significantly impacts CIB grade" },
          { id: "c2", text: "Original artwork/insert is present and not torn", weight: 3 },
          { id: "c3", text: "Manual is present (if CIB)", weight: 2 },
        ]
      }
    ]
  },
  {
    id: "console",
    name: "Console / Hardware",
    gradeNotes: "Test all ports and functions before buying. Always-on hardware has higher failure rates.",
    categories: [
      {
        id: "function", label: "Functionality", checks: [
          { id: "f1", text: "Powers on and boots correctly", weight: 35, failNote: "Non-functional consoles are parts units — price accordingly (typically 10-20% of working value)" },
          { id: "f2", text: "All controller ports function", weight: 15 },
          { id: "f3", text: "AV output is clean (no static, color bleeding, or signal issues)", weight: 15 },
          { id: "f4", text: "Disc drive / cart slot reads media correctly", weight: 20, failNote: "Laser replacement is $15-40 for most consoles — factor into offer" },
          { id: "f5", text: "All buttons and resets function", weight: 5 },
        ]
      },
      {
        id: "cosmetic", label: "Cosmetics", checks: [
          { id: "c1", text: "No major cracks or missing plastic", weight: 5 },
          { id: "c2", text: "Yellowing is minimal (common on white consoles — SNES, Famicom, etc.)", weight: 3, failNote: "Yellowing can be reversed with retrobriting but is labor-intensive" },
          { id: "c3", text: "Labels and markings are intact", weight: 2 },
        ]
      }
    ]
  }
];

const GRADE_LABELS: { min: number; label: string; color: string; desc: string }[] = [
  { min: 90, label: "NM — Near Mint", color: "text-cyan-400", desc: "Virtually perfect. Minimal handling wear. Top tier for display or collection." },
  { min: 75, label: "EX — Excellent", color: "text-green-400", desc: "Light wear consistent with careful handling. A great copy." },
  { min: 55, label: "VG — Very Good", color: "text-yellow-400", desc: "Noticeable wear but fully functional. Average collector grade." },
  { min: 35, label: "G — Good", color: "text-orange-400", desc: "Significant cosmetic wear. Functional. Priced below market." },
  { min: 0, label: "P — Poor / Parts", color: "text-red-400", desc: "Major damage or non-functional. Parts value or heavy discount only." },
];

function getGrade(score: number) {
  return GRADE_LABELS.find(g => score >= g.min) || GRADE_LABELS[GRADE_LABELS.length - 1];
}

export default function ConditionPage() {
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>(PLATFORMS[0]);
  const [checks, setChecks] = useState<Record<string, boolean | null>>({});

  const allChecks = selectedPlatform.categories.flatMap(c => c.checks);
  const gradedChecks = allChecks.filter(c => c.weight > 0);
  const answeredGraded = gradedChecks.filter(c => checks[c.id] !== undefined && checks[c.id] !== null);
  const passedWeight = gradedChecks.filter(c => checks[c.id] === true).reduce((s, c) => s + c.weight, 0);
  const totalWeight = gradedChecks.reduce((s, c) => s + c.weight, 0);
  const score = totalWeight > 0 ? Math.round((passedWeight / totalWeight) * 100) : 0;
  const grade = getGrade(score);
  const progress = (answeredGraded.length / gradedChecks.length) * 100;
  const failures = allChecks.filter(c => checks[c.id] === false && c.failNote);

  const reset = () => { setChecks({}); };
  const switchPlatform = (p: Platform) => { setSelectedPlatform(p); setChecks({}); };

  return (
    <div className="w-full bg-black border-4 border-green-500 rounded p-6 shadow-[0_0_15px_rgba(34,197,94,0.3)] min-h-[80vh]">
      <div className="border-b-4 border-green-900 pb-6 mb-6">
        <h2 className="text-2xl sm:text-3xl text-green-400 tracking-widest uppercase font-terminal">🔍 Condition Grader</h2>
        <p className="text-zinc-500 font-terminal text-sm mt-1">Step-by-step condition assessment. Use in the field before buying.</p>
      </div>

      {/* Platform selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {PLATFORMS.map(p => (
          <button key={p.id} onClick={() => switchPlatform(p)}
            className={`px-4 py-2 font-terminal text-sm border-2 transition-colors ${selectedPlatform.id === p.id ? "bg-green-700 text-black border-green-500" : "text-zinc-500 border-zinc-700 hover:border-zinc-500"}`}>
            {p.name}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Checklist */}
        <div className="lg:col-span-2 space-y-5">
          <p className="text-zinc-500 font-terminal text-sm italic">{selectedPlatform.gradeNotes}</p>

          {selectedPlatform.categories.map(cat => (
            <div key={cat.id} className="space-y-2">
              <h3 className="text-green-600 font-terminal text-base uppercase border-b border-zinc-800 pb-1">{cat.label}</h3>
              {cat.checks.map(check => (
                <div key={check.id} className={`border p-3 transition-colors ${
                  checks[check.id] === true ? "border-green-800 bg-green-950/20" :
                  checks[check.id] === false ? "border-red-900 bg-red-950/10" :
                  "border-zinc-800"
                }`}>
                  <div className="flex items-start gap-3">
                    <div className="flex gap-2 shrink-0 pt-0.5">
                      <button onClick={() => setChecks(c => ({ ...c, [check.id]: true }))}
                        className={`w-7 h-7 font-terminal text-sm border transition-colors ${checks[check.id] === true ? "bg-green-600 text-black border-green-400" : "text-zinc-600 border-zinc-700 hover:border-green-700"}`}>
                        ✓
                      </button>
                      <button onClick={() => setChecks(c => ({ ...c, [check.id]: false }))}
                        className={`w-7 h-7 font-terminal text-sm border transition-colors ${checks[check.id] === false ? "bg-red-700 text-white border-red-500" : "text-zinc-600 border-zinc-700 hover:border-red-800"}`}>
                        ✕
                      </button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-zinc-200 font-terminal text-sm">{check.text}</p>
                      {check.weight > 0 && <span className="text-zinc-700 font-terminal text-xs">weight: {check.weight}pts</span>}
                      {checks[check.id] === false && check.failNote && (
                        <p className="text-red-400 font-terminal text-xs mt-1">⚠ {check.failNote}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>

        {/* Live score panel */}
        <div className="space-y-4">
          <div className="border-2 border-green-800 p-5 sticky top-4 space-y-4">
            <h3 className="text-green-400 font-terminal text-lg uppercase">Live Grade</h3>

            {/* Progress */}
            <div>
              <div className="flex justify-between text-zinc-600 font-terminal text-xs mb-1">
                <span>{answeredGraded.length}/{gradedChecks.length} answered</span>
                <span>{progress.toFixed(0)}%</span>
              </div>
              <div className="w-full bg-zinc-800 h-2 rounded-full overflow-hidden">
                <div className="h-full bg-zinc-500 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>

            {/* Score */}
            <div className="text-center py-4 border border-zinc-800">
              <div className={`font-terminal text-6xl font-bold ${grade.color}`}>{score}</div>
              <div className={`font-terminal text-lg mt-1 ${grade.color}`}>{grade.label}</div>
              <p className="text-zinc-600 font-terminal text-xs mt-2">{grade.desc}</p>
            </div>

            {/* Failures */}
            {failures.length > 0 && (
              <div className="space-y-2">
                <p className="text-red-500 font-terminal text-xs uppercase">Failed checks:</p>
                {failures.map(f => (
                  <div key={f.id} className="bg-red-950/20 border border-red-900 p-2">
                    <p className="text-zinc-400 font-terminal text-xs">{f.text}</p>
                  </div>
                ))}
              </div>
            )}

            <button onClick={reset} className="w-full py-2 font-terminal text-sm text-zinc-500 border border-zinc-700 hover:border-zinc-500 transition-colors">
              RESET / NEW ITEM
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
