import type { MascotId } from "../types";

export function CallFace({
  mascot,
  talking,
  happy,
}: {
  mascot: MascotId;
  talking: boolean;
  happy: boolean;
}) {
  return (
    <div className={`call-face ${talking ? "is-talking" : ""} ${happy ? "is-happy" : ""}`} aria-hidden>
      <img src={`/mascots/${mascot}-celebrate.webp`} alt="" className="call-face-art" />
      <span className="call-eye call-eye-l" />
      <span className="call-eye call-eye-r" />
      <span className="call-mouth" />
    </div>
  );
}
