/**
 * Inbuilt Prompts Manager Component
 * Provides UI for managing hotkey bindings for inbuilt prompts
 */

import React, { useState, useEffect } from "react";
import { useHotkeys } from "../hooks/useHotkeys";
import { validateHotkeyCombo } from "../utils/hotkeyNormalization";
import { notificationService } from "../services/notificationService";
import HotkeyInput from "./HotkeyInput";
import HotkeyDisplay from "./HotkeyDisplay";

interface InbuiltPrompt {
  code: string;
  name: string;
}

const INBUILT_PROMPTS: InbuiltPrompt[] = [
  { code: "REPHRASE", name: "Rephrase" },
  { code: "SUMMARIZE", name: "Summarize" },
  { code: "LEGALIFY", name: "Legalify" },
];

// Default combos for inbuilt prompts (platform-neutral PRIMARY modifier)
function getDefaultComboFor(code: string): string | null {
  switch (code) {
    case "REPHRASE":
      return "PRIMARY+SHIFT+KeyC";
    case "SUMMARIZE":
      return "PRIMARY+SHIFT+KeyS";
    case "LEGALIFY":
      return "PRIMARY+SHIFT+KeyL";
    default:
      return null;
  }
}

interface EditingState {
  promptCode: string;
  combo: string;
}

const InbuiltPromptsManager: React.FC = () => {
  const {
    hotkeys,
    loading,
    error,
    loadHotkeys,
    createHotkey,
    updateHotkey,
    checkConflict,
  } = useHotkeys();

  const [editingPrompt, setEditingPrompt] = useState<string | null>(null);
  const [formData, setFormData] = useState<EditingState>({
    promptCode: "",
    combo: "",
  });
  const [formErrors, setFormErrors] = useState<{ combo?: string }>({});
  const [submitting, setSubmitting] = useState(false);

  // Load hotkeys on mount
  useEffect(() => {
    loadHotkeys();
  }, [loadHotkeys]);

  // Reset form when not editing
  useEffect(() => {
    if (!editingPrompt) {
      setFormData({ promptCode: "", combo: "" });
      setFormErrors({});
    }
  }, [editingPrompt]);

  // Populate form when editing
  useEffect(() => {
    if (editingPrompt) {
      const hotkey = hotkeys.find((h) => h.prompt_code === editingPrompt);
      setFormData({
        promptCode: editingPrompt,
        combo: hotkey?.combo || "", // Use existing combo or empty string for new hotkeys
      });
    }
  }, [editingPrompt, hotkeys]);

  const validateForm = (): boolean => {
    const errors: { combo?: string } = {};

    const comboValidation = validateHotkeyCombo(formData.combo);
    if (!comboValidation.isValid) {
      errors.combo = comboValidation.error;
    } else {
      // Check for conflicts (exclude current hotkey)
      const currentHotkey = hotkeys.find(
        (h) => h.prompt_code === editingPrompt
      );
      const hasConflict = checkConflict(formData.combo, currentHotkey?.id);
      if (hasConflict) {
        // Find which prompt is using this hotkey
        const conflictingHotkey = hotkeys.find(
          (h) => h.combo === formData.combo && h.id !== currentHotkey?.id
        );
        const conflictingPromptName = conflictingHotkey
          ? INBUILT_PROMPTS.find((p) => p.code === conflictingHotkey.prompt_code)?.name || conflictingHotkey.prompt_code
          : "another workflow";
        
        errors.combo = `This hotkey is already assigned to ${conflictingPromptName}`;
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleEdit = (promptCode: string) => {
    setEditingPrompt(promptCode);
  };

  const handleCancelEdit = () => {
    setEditingPrompt(null);
    setFormData({ promptCode: "", combo: "" });
    setFormErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      // Show notification for validation errors
      if (formErrors.combo) {
        await notificationService.error(
          "Invalid Hotkey",
          formErrors.combo
        );
      }
      return;
    }

    setSubmitting(true);

    try {
      const hotkey = hotkeys.find((h) => h.prompt_code === editingPrompt);

      if (hotkey) {
        // Update existing hotkey
        await updateHotkey(hotkey.id, formData.combo);
      } else {
        // Create new hotkey for inbuilt prompt
        if (!editingPrompt) {
          throw new Error("No prompt selected for editing");
        }
        await createHotkey(editingPrompt, formData.combo);
      }

      // Close form and reset
      setEditingPrompt(null);
      setFormData({ promptCode: "", combo: "" });
    } catch (err) {
      // Error is handled by the hook
      console.error("Failed to update hotkey:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleHotkeyChange = (combo: string) => {
    setFormData({ ...formData, combo });
  };

  const getRegistrationStatusBadge = (
    status: "pending" | "success" | "failed",
    error?: string
  ) => {
    if (status === "failed") {
      return (
        <span
          className="badge"
          style={{
            fontSize: "11px",
            background: "rgba(239, 68, 68, 0.1)",
            color: "#ef4444",
          }}
          title={error}
        >
          ✗ Failed
        </span>
      );
    }

    return (
      <span className="badge badge-success" style={{ fontSize: "11px" }}>
        ✓ Registered
      </span>
    );
  };

  // Get hotkey data for each inbuilt prompt
  const getInbuiltPromptHotkeys = () => {
    return INBUILT_PROMPTS.map((prompt) => {
      const hotkey = hotkeys.find((h) => h.prompt_code === prompt.code);
      return {
        ...prompt,
        hotkey,
      };
    });
  };

  return (
    <div className="card" style={{ marginTop: "20px" }}>
      <div style={{ marginBottom: "20px" }}>
        <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 600 }}>
          Inbuilt Prompts
        </h2>
        <p style={{ margin: "4px 0 0", fontSize: "14px", opacity: 0.7 }}>
          Manage hotkey bindings for built-in prompts
        </p>
      </div>

      {error && (
        <div
          className="card"
          style={{
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            marginBottom: "16px",
          }}
        >
          <p style={{ margin: 0, color: "#ef4444" }}>{error}</p>
        </div>
      )}

      {/* Edit Form */}
      {editingPrompt && (
        <div
          className="card"
          style={{
            background: "rgba(61, 113, 236, 0.05)",
            border: "1px solid rgba(61, 113, 236, 0.2)",
            marginBottom: "20px",
          }}
        >
          <h3 style={{ margin: "0 0 16px", fontSize: "16px", fontWeight: 600 }}>
            Edit Hotkey for{" "}
            {INBUILT_PROMPTS.find((p) => p.code === editingPrompt)?.name}
          </h3>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "16px" }}>
              <label
                htmlFor="inbuilt-hotkey-combo"
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontSize: "14px",
                  fontWeight: 500,
                }}
              >
                Hotkey Combination
              </label>
              <HotkeyInput
                value={formData.combo}
                onChange={handleHotkeyChange}
                placeholder="Click to capture hotkey"
                disabled={submitting}
              />
              {formErrors.combo && (
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: "12px",
                    color: "#ef4444",
                  }}
                >
                  {formErrors.combo}
                </p>
              )}
              <p style={{ margin: "4px 0 0", fontSize: "12px", opacity: 0.6 }}>
                Click the input and press your desired key combination
              </p>
            </div>

            <div className="row-center gap-12">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? "Updating..." : "Update"}
              </button>
              <button
                type="button"
                className="btn"
                onClick={handleCancelEdit}
                disabled={submitting}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Inbuilt Prompts List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", opacity: 0.6 }}>
          Loading inbuilt prompts...
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {getInbuiltPromptHotkeys().map(({ code, name, hotkey }) => (
            <div
              key={code}
              className="card card-hover"
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              <div className="row-between" style={{ marginBottom: "8px" }}>
                <div>
                  <h4
                    style={{
                      margin: "0 0 4px",
                      fontSize: "16px",
                      fontWeight: 600,
                    }}
                  >
                    {name}
                  </h4>
                  {(() => {
                    const displayCombo =
                      hotkey?.combo || getDefaultComboFor(code);
                    if (displayCombo) {
                      return <HotkeyDisplay combo={displayCombo} />;
                    }
                    return (
                      <span style={{ fontSize: "14px", opacity: 0.6 }}>
                        No hotkey assigned
                      </span>
                    );
                  })()}
                </div>
                <div className="row-center gap-8">
                  {hotkey
                    ? getRegistrationStatusBadge(
                        hotkey.registrationStatus,
                        hotkey.registrationError
                      )
                    : getRegistrationStatusBadge("success")}
                  <button
                    className="btn btn-sm"
                    onClick={() => handleEdit(code)}
                    disabled={editingPrompt !== null}
                  >
                    {hotkey ? "Edit" : "Assign"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InbuiltPromptsManager;
