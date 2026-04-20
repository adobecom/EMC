import React from "react";
import { Sessions } from "./Sessions";

interface SessionManagementComponentProps {
  onOpenFormChange?: (hasOpen: boolean) => void;
}

export const SessionManagementComponent = ({ onOpenFormChange }: SessionManagementComponentProps) => {
  return (
      <Sessions onOpenFormChange={onOpenFormChange} />
  );
};

export default SessionManagementComponent;
