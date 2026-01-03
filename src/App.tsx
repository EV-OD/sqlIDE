import { useAppStore } from "./store/useAppStore";
import WelcomePage from "./components/pages/WelcomePage";
import ConnectionManagerPage from "./components/pages/ConnectionManager";
import EditorPage from "./components/pages/EditorPage";
import ErGenerator from "./components/ErGenerator";

function App() {
  const { currentPage } = useAppStore();

  return (
    <div className="h-screen bg-zinc-950">
      {currentPage === "welcome" && <WelcomePage />}
      {currentPage === "connection-manager" && <ConnectionManagerPage />}
      {currentPage === "editor" && <EditorPage />}
      {currentPage === "er-generator" && <ErGeneratorPage />}
    </div>
  );
}

// Wrapper for ErGenerator with back button
function ErGeneratorPage() {
  const { setCurrentPage, connections } = useAppStore();

  return (
    <div className="min-h-screen bg-zinc-950 overflow-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-zinc-900 border-b border-zinc-800">
        <div className="max-w-6xl mx-auto px-6 py-3 flex items-center justify-between">
          <button
            onClick={() => setCurrentPage("welcome")}
            className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Home
          </button>
          {connections.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-zinc-400">
              <span>Tip: You can also use connections from</span>
              <button
                onClick={() => setCurrentPage("connection-manager")}
                className="text-blue-400 hover:text-blue-300 underline"
              >
                Connection Manager
              </button>
            </div>
          )}
        </div>
      </div>
      {/* ER Generator Content */}
      <div className="py-8">
        <ErGenerator />
      </div>
    </div>
  );
}

export default App;
