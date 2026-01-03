import { useAppStore } from "./store/useAppStore";
import WelcomePage from "./components/pages/WelcomePage";
import ConnectionManagerPage from "./components/pages/ConnectionManager";
import EditorPage from "./components/pages/EditorPage";

function App() {
  const { currentPage } = useAppStore();

  return (
    <div className="h-screen bg-zinc-950">
      {currentPage === "welcome" && <WelcomePage />}
      {currentPage === "connection-manager" && <ConnectionManagerPage />}
      {currentPage === "editor" && <EditorPage />}
    </div>
  );
}

export default App;
