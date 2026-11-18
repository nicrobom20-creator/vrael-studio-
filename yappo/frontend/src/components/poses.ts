import type { Pose } from "../types";

/** Contract for a future .riv file dropped into public/rive/{mascot}.riv
 *  State machine name: Mascot
 *  Number input name: pose
 *  0 idle, 1 wave, 2 point, 3 run, 4 jump, 5 celebrate, 6 think
 */
export const POSE_INDEX: Record<Pose, number> = {
  idle: 0,
  wave: 1,
  point: 2,
  run: 3,
  jump: 4,
  celebrate: 5,
  think: 6,
};

export const RIV_STATE_MACHINE = "Mascot";
export const RIV_POSE_INPUT = "pose";
