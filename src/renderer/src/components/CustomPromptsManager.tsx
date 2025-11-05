/**
 * Custom Prompts Manager Component
 * Provides UI for creating, editing, and deleting custom prompts
 */

import React, { useState, useEffect } from "react";
import { CustomPrompt } from "../types/customPrompts";
import { useCustomPrompts } from "../hooks/useCustomPrompts";

interface PromptFormData {
  name: string;
  template: string;
}

const CustomPromptsManager: React.FC = () => {
  const {
    filteredPrompts,
    loading,
    error,
    searchQuery,
    setSearchQuery,
    loadPrompts,
    createPrompt,
    updatePrompt,
    deletePrompt,
  } = useCustomPrompts();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<CustomPrompt | null>(null);
  const [formData, setFormData] = useState<PromptFormData>({
    name: "",
    template: "",
  });
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    template?: string;
  }>({});
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Load prompts on mount
  useEffect(() => {
    loadPrompts();
  }, [loadPrompts]);

  // Reset form when opening/closing
  useEffect(() => {
    if (!isFormOpen && !editingPrompt) {
      setFormData({ name: "", template: "" });
      setFormErrors({});
    }
  }, [isFormOpen, editingPrompt]);

  // Populate form when editing
  useEffect(() => {
    if (editingPrompt) {
      setFormData({
        name: editingPrompt.name,
        template: editingPrompt.template,
      });
      setIsFormOpen(true);
    }
  }, [editingPrompt]);

  const validateForm = (): boolean => {
    const errors: { name?: string; template?: string } = {};

    if (!formData.name.trim()) {
      errors.name = "Name is required";
    } else if (formData.name.length > 100) {
      errors.name = "Name must be 100 characters or less";
    }

    if (!formData.template.trim()) {
      errors.template = "Template is required";
    } else if (formData.template.length > 10000) {
      errors.template = "Template must be 10,000 characters or less";
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
      if (editingPrompt) {
        await updatePrompt(editingPrompt.id, formData.name, formData.template);
      } else {
        await createPrompt(formData.name, formData.template);
      }

      // Close form and reset
      setIsFormOpen(false);
      setEditingPrompt(null);
      setFormData({ name: "", template: "" });
    } catch (err) {
      // Error is handled by the hook
      console.error("Failed to save prompt:", err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (prompt: CustomPrompt) => {
    setEditingPrompt(prompt);
  };

  const handleCancelEdit = () => {
    setEditingPrompt(null);
    setIsFormOpen(false);
    setFormData({ name: "", template: "" });
    setFormErrors({});
  };

  const handleDeleteClick = (id: string) => {
    setDeleteConfirmId(id);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmId) return;

    try {
      await deletePrompt(deleteConfirmId);
      setDeleteConfirmId(null);
    } catch (err) {
      // Error is handled by the hook
      console.error("Failed to delete prompt:", err);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteConfirmId(null);
  };

  return (
    <div className="card" style={{ marginTop: "20px" }}>
      <div className="row-between" style={{ marginBottom: "20px" }}>
        <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 600 }}>
          Custom Prompts
        </h2>
        <button
          className="btn btn-primary"
          onClick={() => setIsFormOpen(true)}
          disabled={isFormOpen || editingPrompt !== null}
        >
          + New Prompt
        </button>
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

      {/* Prompt Form */}
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
            {editingPrompt ? "Edit Prompt" : "Create New Prompt"}
          </h3>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "16px" }}>
              <label
                htmlFor="prompt-name"
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontSize: "14px",
                  fontWeight: 500,
                }}
              >
                Name
              </label>
              <input
                id="prompt-name"
                type="text"
                className="input"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Professional Email"
                maxLength={100}
                disabled={submitting}
              />
              {formErrors.name && (
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: "12px",
                    color: "#ef4444",
                  }}
                >
                  {formErrors.name}
                </p>
              )}
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label
                htmlFor="prompt-template"
                style={{
                  display: "block",
                  marginBottom: "8px",
                  fontSize: "14px",
                  fontWeight: 500,
                }}
              >
                Template
              </label>
              <textarea
                id="prompt-template"
                className="input"
                value={formData.template}
                onChange={(e) =>
                  setFormData({ ...formData, template: e.target.value })
                }
                placeholder="Enter your prompt template. Use {input} as a placeholder for user text."
                rows={6}
                maxLength={10000}
                disabled={submitting}
                style={{
                  resize: "vertical",
                  fontFamily: "monospace",
                  fontSize: "13px",
                }}
              />
              {formErrors.template && (
                <p
                  style={{
                    margin: "4px 0 0",
                    fontSize: "12px",
                    color: "#ef4444",
                  }}
                >
                  {formErrors.template}
                </p>
              )}
              <p style={{ margin: "4px 0 0", fontSize: "12px", opacity: 0.6 }}>
                {formData.template.length} / 10,000 characters
              </p>
            </div>

            {editingPrompt && (
              <div style={{ marginBottom: "16px" }}>
                <label
                  style={{
                    display: "block",
                    marginBottom: "8px",
                    fontSize: "14px",
                    fontWeight: 500,
                  }}
                >
                  Prompt ID (read-only)
                </label>
                <input
                  type="text"
                  className="input"
                  value={editingPrompt.id}
                  readOnly
                  disabled
                  style={{ opacity: 0.6, cursor: "not-allowed" }}
                />
              </div>
            )}

            <div className="row-center gap-12">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
              >
                {submitting ? "Saving..." : editingPrompt ? "Update" : "Create"}
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

      {/* Search Bar */}
      <div style={{ marginBottom: "16px" }}>
        <input
          type="text"
          className="input"
          placeholder="Search prompts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Prompts List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "40px", opacity: 0.6 }}>
          Loading prompts...
        </div>
      ) : filteredPrompts.length === 0 ? (
        <div style={{ textAlign: "center", padding: "40px", opacity: 0.6 }}>
          {searchQuery
            ? "No prompts found matching your search."
            : "No custom prompts yet. Create one to get started!"}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {filteredPrompts.map((prompt) => (
            <div
              key={prompt.id}
              className="card card-hover"
              style={{
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
              }}
            >
              <div className="row-between" style={{ marginBottom: "8px" }}>
                <h4 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>
                  {prompt.name}
                </h4>
                <div className="row-center gap-8">
                  <button
                    className="btn btn-sm"
                    onClick={() => handleEdit(prompt)}
                    disabled={isFormOpen || editingPrompt !== null}
                  >
                    Edit
                  </button>
                  <button
                    className="btn btn-sm"
                    onClick={() => handleDeleteClick(prompt.id)}
                    style={{
                      background: "rgba(239, 68, 68, 0.1)",
                      color: "#ef4444",
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>

              <p
                style={{
                  margin: "0 0 8px",
                  fontSize: "13px",
                  opacity: 0.7,
                  fontFamily: "monospace",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-word",
                }}
              >
                {prompt.template.length > 200
                  ? `${prompt.template.substring(0, 200)}...`
                  : prompt.template}
              </p>

              <p style={{ margin: 0, fontSize: "11px", opacity: 0.5 }}>
                ID: {prompt.id}
              </p>

              {/* Delete Confirmation Dialog */}
              {deleteConfirmId === prompt.id && (
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
                    Are you sure you want to delete this prompt? This will also
                    remove any associated hotkey bindings.
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

export default CustomPromptsManager;
