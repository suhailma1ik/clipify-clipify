import { useEffect, useState } from "react";
import "./App.css";

// Import components and utilities
import Header from "./components/Header";
import {
  NotificationBanner,
  AuthManager,
  ManageShortcutsPage,
} from "./components";
import { NotificationPermissionDialog } from "./components/NotificationPermissionDialog";
import {
  useNotification,
  useClipboardHistory,
  useTextProcessing,
  useAutoRephrase,
  useAutoProcess,
  useClipboardMonitoring,
  useShortcutStatus,
  useAuth,
  useAuthTokenSync,
  useHotkeys,
} from "./hooks";
import { formatHotkeyCombo, getPrimaryModifierKey } from "./utils/platform";

function App() {
  // Navigation state
  const [currentPage, setCurrentPage] = useState<"clipboard" | "shortcuts">(
    "clipboard"
  );

  // Use custom hooks for state management
  const { notification, showNotification, clearNotification } =
    useNotification();
  const { loadClipboardHistory } = useClipboardHistory();

  const { setCleanedText } = useTextProcessing(
    showNotification,
    loadClipboardHistory
  );
  const { setShortcutStatus } = useShortcutStatus();
  const { isAuthenticated, user } = useAuth();
  const { hotkeys, loadHotkeys } = useHotkeys();

  // Sync JWT tokens from auth service to API client
  useAuthTokenSync();

  // Auto-rephrase functionality (triggered by Cmd+Shift+C global shortcut)
  const { setupAutoRephraseListener } = useAutoRephrase({
    showNotification,
    setShortcutStatus,
  });

  // Auto-process functionality (unified code-based processing, gated by feature flag)
  const { setupAutoProcessListener } = useAutoProcess({
    showNotification,
    setShortcutStatus,
  });

  // Clipboard monitoring functionality (event-driven via Cmd+Shift+C global shortcut)
  const { setupClipboardMonitoring } = useClipboardMonitoring({
    setCleanedText,
    loadClipboardHistory,
    setShortcutStatus,
  });

  // const processedCount = clipboardHistory.length;
  const rephraseCombo =
    hotkeys.find((h) => h.prompt_code === "REPHRASE")?.combo ||
    "PRIMARY+SHIFT+KeyC";
  const summarizeCombo =
    hotkeys.find((h) => h.prompt_code === "SUMMARIZE")?.combo ||
    "PRIMARY+SHIFT+KeyS";
  const legalifyCombo =
    hotkeys.find((h) => h.prompt_code === "LEGALIFY")?.combo ||
    "PRIMARY+SHIFT+KeyL";
  const rephraseShortcutLabel = formatHotkeyCombo(rephraseCombo);
  const summarizeShortcutLabel = formatHotkeyCombo(summarizeCombo);
  const legalifyShortcutLabel = formatHotkeyCombo(legalifyCombo);
  const primaryShortcutLabel = rephraseShortcutLabel;
  const pasteShortcutLabel = `${getPrimaryModifierKey()}+V`;

  // Setup event listeners
  useEffect(() => {
    let mounted = true;
    let unlistenAutoRephrase: (() => void) | undefined;
    let unlistenAutoProcess: (() => void) | undefined;
    let cleanupClipboardMonitoring: (() => void) | undefined;

    // Load clipboard history on mount
    loadClipboardHistory();

    // No global shortcut registration here; Tauri backend registers default built-ins

    // Setup auto-rephrase listener
    setupAutoRephraseListener().then((unlisten) => {
      if (mounted && unlisten) {
        unlistenAutoRephrase = unlisten;
      }
    });

    // Setup auto-process listener (unified built-in/custom processing)
    setupAutoProcessListener().then((unlisten) => {
      if (mounted && unlisten) {
        unlistenAutoProcess = unlisten;
      }
    });

    // Setup clipboard monitoring
    setupClipboardMonitoring().then((cleanup) => {
      if (mounted && cleanup) {
        cleanupClipboardMonitoring = cleanup;
      }
    });

    return () => {
      mounted = false;
      if (unlistenAutoRephrase) unlistenAutoRephrase();
      if (unlistenAutoProcess) unlistenAutoProcess();
      if (cleanupClipboardMonitoring) cleanupClipboardMonitoring();
    };
  }, []); // Empty dependency array - this effect should only run once on mount

  useEffect(() => {
    if (isAuthenticated) {
      loadHotkeys();
    }
  }, [isAuthenticated, loadHotkeys]);

  return (
    <main className="container">
      <Header
        username={user?.name || user?.email || "Guest User"}
        userPlan={user?.plan || "Free Plan"}
      />

      <NotificationBanner
        notification={notification}
        onDismiss={clearNotification}
      />

      {/* Notification Permission Dialog - macOS only */}
      <NotificationPermissionDialog />

      {/* Authentication Section - Modern & Clean */}
      <div
        className="auth-section fade-in"
        style={{
          display: isAuthenticated ? "none" : "block",
        }}
      >
        {!isAuthenticated ? (
          <div className="auth-card glass-enhanced">
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
              }}
            >
              <div className="auth-icon">🔐</div>
              <div>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 600 }}>
                  Authentication Required
                </h3>
                <p
                  style={{ margin: "4px 0 0", fontSize: "14px", opacity: 0.7 }}
                >
                  Sign in to access clipboard management features
                </p>
              </div>
            </div>
            <AuthManager showUserInfo={true} compact={false} />
          </div>
        ) : (
          <></>
        )}
      </div>

      {/* Navigation Tabs - Only show when authenticated */}
      {isAuthenticated && (
        <div className="card">
          <div className="row-center">
            <button
              className={`btn ${
                currentPage === "clipboard" ? "btn-primary" : ""
              }`}
              onClick={() => setCurrentPage("clipboard")}
            >
              📘 View Tutorial
            </button>
            <button
              className={`btn ${
                currentPage === "shortcuts" ? "btn-primary" : ""
              }`}
              onClick={() => setCurrentPage("shortcuts")}
            >
              ⌨️ Manage Shortcuts
            </button>
          </div>
        </div>
      )}

      {/* Main Content - Only show when authenticated */}
      {isAuthenticated && (
        <div className="main-content fade-in">
          {currentPage === "clipboard" ? (
            <>
              {/* <ClipboardHistory
                clipboardHistory={clipboardHistory}
                searchQuery={searchQuery}
                filteredHistory={filteredHistory}
                selectedEntry={selectedEntry}
                {...clipboardHandlers}
              /> */}
              <div
                className="card"
                style={{ padding: "24px", lineHeight: 1.6 }}
              >
                <h2 style={{ marginBottom: "16px" }}>How Clipify Works</h2>
                <p
                  style={{
                    margin: "0 0 16px",
                    fontSize: "14px",
                    opacity: 0.75,
                  }}
                >
                  Clipify lets you improve any text instantly with one shortcut.
                </p>
                <ol
                  style={{
                    paddingLeft: "20px",
                    margin: 0,
                    display: "grid",
                    gap: "12px",
                  }}
                >
                  <li>
                    <strong>Select and refine:</strong> Highlight any text in
                    your email, doc, or chat, then press {primaryShortcutLabel}{" "}
                    to instantly improve it.
                  </li>
                  <li>
                    <strong>Paste the result:</strong> The polished version is
                    copied to your clipboard, ready to paste anywhere using{" "}
                    {pasteShortcutLabel}.
                  </li>
                </ol>
                <div
                  style={{
                    marginTop: "20px",
                    padding: "16px",
                    borderRadius: "12px",
                    background: "rgba(79, 70, 229, 0.08)",
                    border: "1px solid rgba(79, 70, 229, 0.15)",
                  }}
                >
                  <strong style={{ display: "block", marginBottom: "8px" }}>
                    Examples: One shortcut, different results
                  </strong>
                  <ul
                    style={{
                      margin: 0,
                      paddingLeft: "20px",
                      display: "grid",
                      gap: "8px",
                      fontSize: "14px",
                    }}
                  >
                    <li>
                      <strong>Rephrase:</strong> Press {""}
                      {rephraseShortcutLabel} to fix tone, grammar, and clarity.
                    </li>
                    <li>
                      <strong>Legalify:</strong> Press {""}
                      {legalifyShortcutLabel} to turn your text into formal
                      legal language.
                    </li>
                    <li>
                      <strong>Summarize:</strong> Press {""}
                      {summarizeShortcutLabel} to condense long text into key
                      takeaways.
                    </li>
                  </ul>
                </div>
                <div
                  style={{
                    marginTop: "20px",
                    fontSize: "14px",
                    opacity: 0.75,
                    display: "flex",
                    justifyContent: "space-between",
                    flexWrap: "wrap",
                    gap: "8px",
                  }}
                >
                  {/* <span>
                    Clipify polished {processedCount} snippet
                    {processedCount === 1 ? "" : "s"} this session.
                  </span> */}
                  <span>
                    Tip: You can manage built-in hotkeys under the “Manage
                    Shortcuts” tab.
                  </span>
                </div>
              </div>
            </>
          ) : (
            <ManageShortcutsPage />
          )}
        </div>
      )}
    </main>
  );
}

export default App;
