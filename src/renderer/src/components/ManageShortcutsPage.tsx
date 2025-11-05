/**
 * Manage Shortcuts Page
 * Main page for managing custom prompts and hotkey bindings
 */

import React from "react";
import InbuiltPromptsManager from "./InbuiltPromptsManager";

const ManageShortcutsPage: React.FC = () => {
  return (
    <div style={{ padding: "20px 0" }}>
      <div className="card" style={{ marginBottom: "20px" }}>
        <h1 style={{ margin: "0 0 8px", fontSize: "24px", fontWeight: 700 }}>
          Manage Shortcuts
        </h1>
        <p style={{ margin: 0, fontSize: "14px", opacity: 0.7 }}>
          Create custom prompts and bind them to global hotkeys for quick access
        </p>
      </div>

      <InbuiltPromptsManager />
      {/* <CustomPromptsManager /> */}
      {/* <HotkeyBindingsManager /> */}
    </div>
  );
};

export default ManageShortcutsPage;
