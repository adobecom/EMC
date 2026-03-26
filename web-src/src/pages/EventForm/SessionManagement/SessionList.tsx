import React, { useState } from "react";
import {
  Heading,
  Text,
  ActionButton,
  Button,
  Tooltip,
  TooltipTrigger,
} from "@react-spectrum/s2";
import ChevronRight from '@react-spectrum/s2/icons/ChevronRight';
import ChevronDown from '@react-spectrum/s2/icons/ChevronDown';
import RemoveCircle from '@react-spectrum/s2/icons/RemoveCircle';
import { Session } from "../../../types/sessions";
import Chip from "../../../components/shared/Chip";
import { COLORS } from "../../../styles/designSystem";
import { formatTime, formatDate } from "../../../utils/dateTime";
import { SessionForm } from "./SessionForm";
import type { SessionFormData } from "./SessionForm";

export type { SessionFormData };

// ============================================================================
// HELPERS
// ============================================================================

function getCaasTagDisplayLabel(caasId: string): string {
  const withoutPrefix = caasId.replace(/^caas:/, "").trim();
  const segments = withoutPrefix.split("/").filter(Boolean);
  const last = segments.length > 0 ? segments[segments.length - 1] : caasId;
  const normalized = last.replace(/-/g, " ");
  if (normalized.length <= 4 && /^[a-zA-Z]+$/.test(normalized)) {
    return normalized.toUpperCase();
  }
  return normalized
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

// ============================================================================
// SESSION ITEM (collapsible)
// ============================================================================

export interface SessionItemProps {
  session: Session;
  isExpanded: boolean;
  onToggle: (sessionId: string) => void;
  onDelete: (sessionId: string) => void;
  onSave: (sessionId: string, data: SessionFormData) => Promise<void>;
}

export const SessionItem: React.FC<SessionItemProps> = ({
  session,
  isExpanded,
  onToggle,
  onDelete,
  onSave,
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const startTime = formatTime(session.startDateTime);
  const endTime = formatTime(session.endDateTime);
  const sessionDate = formatDate(session.startDateTime);

  const handleDeleteClick = () => setShowDeleteConfirm(true);
  const handleCancelDelete = () => setShowDeleteConfirm(false);
  const handleConfirmDelete = () => {
    onDelete(session.id);
    setShowDeleteConfirm(false);
  };

  return (
    <div
      style={{
        padding: "12px 16px",
        border: "1px solid var(--spectrum-global-color-gray-300)",
        borderRadius: "4px",
        position: "relative",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div
          role="button"
          tabIndex={0}
          onClick={() => onToggle(session.id)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onToggle(session.id);
            }
          }}
          style={{
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            flex: 1,
            outline: "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
            {isExpanded ? <ChevronDown /> : <ChevronRight />}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <Heading
              level={3}
              UNSAFE_style={{ color: COLORS.GRAY_700, margin: 0 }}
            >
              {session.name}
            </Heading>
            <Text>
              {sessionDate} | {startTime} - {endTime}
            </Text>
            {session.tags && session.tags.length > 0 && (
              <div style={{ display: "flex", gap: "12px", marginTop: "8px", flexWrap: "wrap" }}>
                {session.tags.map((tag) => (
                  <Chip key={tag} text={getCaasTagDisplayLabel(tag)} />
                ))}
              </div>
            )}
          </div>
        </div>

        <TooltipTrigger>
          <ActionButton isQuiet aria-label="Delete" onPress={handleDeleteClick}>
            <RemoveCircle />
          </ActionButton>
          <Tooltip>Delete</Tooltip>
        </TooltipTrigger>
      </div>

      {isExpanded && (
        <SessionForm
          session={session}
          onSave={(data) => onSave(session.id, data)}
          onCancel={() => onToggle(session.id)}
        />
      )}

      {showDeleteConfirm && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(255, 255, 255, 0.5)",
            borderRadius: "4px",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "16px",
            padding: "12px 16px",
            zIndex: 10,
          }}
        >
          <Text>Are you sure you want to delete this session?</Text>
          <div style={{ display: "flex", gap: "12px" }}>
            <Button variant="secondary" onPress={handleCancelDelete}>
              Cancel
            </Button>
            <Button variant="negative" onPress={handleConfirmDelete}>
              Delete
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// SESSIONS LIST
// ============================================================================

export interface SessionsListProps {
  sessions: Session[];
  isAddingNew: boolean;
  onCancelAdd: () => void;
  onAdd: (data: SessionFormData) => Promise<void>;
  onDelete: (sessionId: string) => void;
  onSave: (sessionId: string, data: SessionFormData) => Promise<void>;
}

export const SessionsList: React.FC<SessionsListProps> = ({
  sessions,
  isAddingNew,
  onCancelAdd,
  onAdd,
  onDelete,
  onSave,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleToggle = (sessionId: string) => {
    setExpandedId((prev) => (prev === sessionId ? null : sessionId));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
      {isAddingNew && (
        <SessionForm
          session={null}
          onSave={onAdd}
          onCancel={onCancelAdd}
        />
      )}
      {sessions.map((session) => (
        <SessionItem
          key={session.id}
          session={session}
          isExpanded={expandedId === session.id}
          onToggle={handleToggle}
          onDelete={onDelete}
          onSave={onSave}
        />
      ))}
    </div>
  );
};
