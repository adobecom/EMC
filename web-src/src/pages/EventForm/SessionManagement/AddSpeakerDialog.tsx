import React, { useState, useEffect } from "react";
import {
  Heading,
  Button,
  ButtonGroup,
  Content,
  Dialog,
  DialogTrigger,
  Flex,
  TextField,
  Text,
  Picker,
  Item,
} from "@adobe/react-spectrum";
import type { SpeakerType } from "../../../types/domain";

const SPEAKER_TYPE_OPTIONS: { key: SpeakerType; label: string }[] = [
  { key: "host", label: "Host" },
  { key: "presenter", label: "Presenter" },
  { key: "speaker", label: "Speaker" },
  { key: "guest-speaker", label: "Guest Speaker" },
  { key: "keynote", label: "Keynote" },
  { key: "judge", label: "Judge" },
  { key: "portfolio-reviewer", label: "Portfolio Reviewer" },
  { key: "career-advisor", label: "Career Advisor" },
  { key: "product-demonstrator", label: "Product Demonstrator" },
];

export interface AddSpeakerDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId?: string;
  seriesId?: string;
  nextOrdinal?: number;
  onAdded?: () => void;
}

export const AddSpeakerDialog: React.FC<AddSpeakerDialogProps> = ({
  isOpen,
  onOpenChange,
  sessionId: _sessionId,
  seriesId: _seriesId,
  nextOrdinal: _nextOrdinal,
  onAdded: _onAdded,
}) => {
  const [speakerType, setSpeakerType] = useState<SpeakerType>("speaker");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  useEffect(() => {
    if (isOpen) {
      setSpeakerType("speaker");
      setFirstName("");
      setLastName("");
    }
  }, [isOpen]);

  const handleClose = () => {
    onOpenChange(false);
  };

  const handleAdd = () => {
    onOpenChange(false);
    setFirstName("");
    setLastName("");
  };

  return (
    <DialogTrigger
      isOpen={isOpen}
      onOpenChange={(open) => !open && handleClose()}
    >
      <div style={{ display: "none" }} />
      <Dialog>
        <Heading>Add speaker</Heading>
        <Content>
          <Flex direction="column" gap="size-200">
            <Picker
              label="Speaker type"
              selectedKey={speakerType}
              onSelectionChange={(key) =>
                setSpeakerType((key as SpeakerType) ?? "speaker")
              }
              width="100%"
            >
              {SPEAKER_TYPE_OPTIONS.map((opt) => (
                <Item key={opt.key}>{opt.label}</Item>
              ))}
            </Picker>
            <TextField
              label="First name"
              value={firstName}
              onChange={setFirstName}
              width="100%"
            />
            <TextField
              label="Last name"
              value={lastName}
              onChange={setLastName}
              width="100%"
            />
            <Text
              UNSAFE_style={{
                fontSize: "12px",
                fontStyle: "italic",
                color: "var(--spectrum-global-color-gray-600)",
              }}
            >
              Speaker will not be saved until API integration is wired.
            </Text>
          </Flex>
        </Content>
        <ButtonGroup>
          <Button variant="secondary" onPress={handleClose}>
            Cancel
          </Button>
          <Button variant="accent" onPress={handleAdd}>
            Add
          </Button>
        </ButtonGroup>
      </Dialog>
    </DialogTrigger>
  );
};

export default AddSpeakerDialog;
