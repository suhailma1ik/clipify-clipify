/**
 * Hotkey Bindings Manager Component
 * Provides UI for creating, editing, and deleting hotkey bindings
 */

import React, { useState, useEffect } from "react";
import { useHotkeys } from "../hooks/useHotkeys";
import { useCustomPrompts } from "../hooks/useCustomPrompts";
import { validateHotkeyCombo } from "../utils/hotkeyNormalization";
import HotkeyInput from "./HotkeyInput";
import HotkeyDisplay from "./HotkeyDisplay";

interface HotkeyFormData {
  promptCode: string;
  combo: string;
}

const BUILTIN_PROMPTS = [
  { code: "REPHRASE", name: "Rephrase" },
  { code: "SUMMARIZE", name: "Summarize" },
  { code: "LEGALIFY", name: "Legalify" },
];

const HotkeyBindingsManager: React.FC = () => {
  const {
    hotkeys,
    loading: hotkeysLoading,
    error: hotkeysError,
    loadHotkeys,
    createHotkey,
    updateHotkey,
    deleteHotkey,
    checkConflict,
  } = useHotkeys();

  const { prompts, loading: promptsLoading, loadPrompts } = useCustomPrompts();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingHotkeyId, setEditingHotkeyId] = useState<string | null>(null);
  const [formData, setFormData] = useState<HotkeyFormData>({
    promptCode: "",
    combo: "",
  });
  const [formErrors, setFormErrors] = useState<{
    promptCode?: string;
    combo?: string;
  }>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Load hotkeys and prompts on mount
  useEffect(() => {
    loadHotkeys();
    loadPrompts();
  }, [loadHotkeys, loadPrompts]);

  // Reset form when opening/closing
  useEffect(() => {
    if (!isFormOpen && !editingHotkeyId) {
      setFormData({ promptCode: "", combo: "" });
      setFormErrors({});
    }
  }, [isFormOpen, editingHotkeyId]);

  // Populate form when editing
  useEffect(() => {
    if (editingHotkeyId) {
      const hotkey = hotkeys.find((h) => h.id === editingHotkeyId);
      if (hotkey) {
        setFormData({
          promptCode: hotkey.prompt_code,
          combo: hotkey.combo,
        });
        setIsFormOpen(true);
      }
    }
  }, [editingHotkeyId, hotkeys]);

  const validateForm = (): boolean => {
    const errors: { promptCode?: string; combo?: string } = {};

    if (!formData.promptCode) {
      errors.promptCode = "Please select a prompt";
    }

    const comboValidation = validateHotkeyCombo(formData.combo);
    if (!comboValidation.isValid) {
      errors.combo = comboValidation.error;
    } else {
      // Check for conflicts
      const hasConflict = checkConflict(
        formData.combo,
        editingHotkeyId || undefined
      );
      if (hasConflict) {
        errors.combo = "This hotkey combination is already in use";
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);

    try {
      if (editingHotkeyId) {
        await updateHotkey(editingHotkeyId, formData.combo);
      } else {
        await createHotkey(formData.promptCode, formData.combo);
      }

      // Close form and reset
      setIsFormOpen(false);
      setEditingHotkeyId(null);
      setFormData({ promptCode: "", combo: "" });
    } catch (err) {
      // Error is handled by the hook
      console.error("Failed to save hotkey:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (id: string) => {
    setEditingHotkeyId(id);
  };

  const handleCancelEdit = () => {
    setEditingHotkeyId(null);
    setIsFormOpen(false);
    setFormData({ promptCode: "", combo: "" });
    setFormErrors({});
  };

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId) return;

    try {
      await deleteHotkey(deleteConfirmId);
      setDeleteConfirmId(null);
    } catch (err) {
      // Error is handled by the hook
      console.error("Failed to delete hotkey:", err);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmId(null);
  };

  const handleHotkeyChange = (combo: string) => {
    setFormData({ ...formData, combo });
  };

  const getPromptName = (promptCode: string): string => {
    // Check builtin prompts
    const builtin = BUILTIN_PROMPTS.find((p) => p.code === promptCode);
    if (builtin) return builtin.name;

    // Check custom prompts
    const custom = prompts.find((p) => p.id === promptCode);
    if (custom) return custom.name;

    return promptCode;
  };

  const getRegistrationStatusBadge = (
    status: "pending" | "success" | "failed",
    error?: string
  ) => {
    if (status === "success") {
      return (
        <span className="badge badge-success" style={{ fontSize: "11px" }}>
          ✓ Registered
        </span>
      );
    }

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
      <span className="badge badge-muted" style={{ fontSize: "11px" }}>
        ⏳ Pending
      </span>
    );
  };

  return (
    <div className="card" style={{ marginTop: "20px" }}>
      <div className="row-between" style={{ marginBottom: "20px" }}>
        <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 600 }}>
          Hotkey Bindings
        </h2>
        <button
          className="btn btn-primary"
          onClick={() => setIsFormOpen(true)}
          disabled={isFormOpen || editingHotkeyId !== null}
        >
          + New Binding
        </button>
      </div>

      {hotkeysError && (
        <div
          className="card"
          style={{
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            marginBottom: "16px",
          }}
        >
          <p style={{ margin: 0, color: "#ef4444" }}>{hotkeysError}</p>
        </div>
      )}

      {/* Hotkey Form */}
      {isFormOpen && (
        <div
          className="card"
          style={{
            background: "rgba(61, 113, 236, 0.05)",
            border: "1px solid rgba(61, 113, 236, 0.2)",
            marginBottom: "20px",
          }}
        >
          <h3 style={{ margin: "0 0 16px", fontSize: "16px", fontWeight: 600 }}>
            {editingHotkeyId
              ? "Edit Hotkey Binding"
              : "Create New Hotkey Binding"}
          </h3>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "16px" }}>
              <label
                htmlFor="hotkey-prompt"
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontSize: "14px",
                  fontWeight: 500,
                }}
              >
                Prompt
              </label>
              <select
                id="hotkey-prompt"
                className="input"
                value={formData.promptCode}
                onChange={(e) =>
                  setFormData({ ...formData, promptCode: e.target.value })
                }
                disabled={submitting || !!editingHotkeyId}
              >
                <option value="">Select a prompt...</option>
                <optgroup label="Built-in Prompts">
                  {BUILTIN_PROMPTS.map((prompt) => (
                    <option key={prompt.code} value={prompt.code}>
                      {prompt.name}
                    </option>
                  ))}
                </optgroup>
                {prompts.length > 0 && (
                  <optgroup label="Custom Prompts">
                    {prompts.map((prompt) => (
                      <option key={prompt.id} value={prompt.id}>
                        {prompt.name}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              {formErrors.promptCode && (
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: "12px",
                    color: "#ef4444",
                  }}
                >
                  {formErrors.promptCode}
                </p>
              )}
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label
                htmlFor="hotkey-combo"
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
                {submitting
                  ? "Saving..."
                  : editingHotkeyId
                  ? "Update"
                  : "Create"}
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

      {/* Hotkeys List */}
      {hotkeysLoading || promptsLoading ? (
        <div style={{ textAlign: "center", padding: "40px", opacity: 0.6 }}>
          Loading hotkeys...
        </div>
      ) : hotkeys.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", opacity: 0.6 }}>
          No hotkey bindings yet. Create one to get started!
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {hotkeys.map((hotkey) => (
            <div
              key={hotkey.id}
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
                    {getPromptName(hotkey.prompt_code)}
                  </h4>
                  <HotkeyDisplay combo={hotkey.combo} />
                </div>
                <div className="row-center gap-8">
                  {getRegistrationStatusBadge(
                    hotkey.registrationStatus,
                    hotkey.registrationError
                  )}
                  <button
                    className="btn btn-sm"
                    onClick={() => handleEdit(hotkey.id)}
                    disabled={isFormOpen || editingHotkeyId !== null}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-sm"
                    onClick={() => handleDeleteClick(hotkey.id)}
                    style={{
                      background: "rgba(239, 68, 68, 0.1)",
                      color: "#ef4444",
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Delete Confirmation Dialog */}
              {deleteConfirmId === hotkey.id && (
                <div
                  style={{
                    marginTop: "12px",
                    padding: "12px",
                    background: "rgba(239, 68, 68, 0.1)",
                    border: "1px solid rgba(239, 68, 68, 0.3)",
                    borderRadius: "8px",
                  }}
                >
                  <p
                    style={{
                      margin: "0 0 12px",
                      fontSize: "14px",
                      color: "#ef4444",
                    }}
                  >
                    Are you sure you want to delete this hotkey binding?
                  </p>
                  <div className="row-center gap-8">
                    <button
                      className="btn btn-sm"
                      onClick={handleDeleteConfirm}
                      style={{
                        background: "#ef4444",
                        color: "white",
                      }}
                    >
                      Delete
                    </button>
                    <button className="btn btn-sm" onClick={handleDeleteCancel}>
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HotkeyBindingsManager;
