import { useEffect } from "react";
import { useRive, useStateMachineInput } from "@rive-app/react-canvas";
import type { Pose } from "../types";
import { POSE_INDEX, RIV_POSE_INPUT, RIV_STATE_MACHINE } from "./poses";

export function RiveCompanion({
  src,
  pose,
  className,
  onError,
}: {
  src: string;
  pose: Pose;
  className?: string;
  onError: () => void;
}) {
  const { rive, RiveComponent } = useRive({
    src,
    stateMachines: RIV_STATE_MACHINE,
    autoplay: true,
    onLoadError: onError,
  });
  const input = useStateMachineInput(rive, RIV_STATE_MACHINE, RIV_POSE_INPUT);
  useEffect(() => {
    if (input) input.value = POSE_INDEX[pose];
  }, [input, pose]);

  return (
    <div className={className}>
      <RiveComponent />
    </div>
  );
}
