/** Grey placeholder while something loads. */
export function Skeleton({ height = 20, width }: { height?: number; width?: number | string }) {
  return <div className="skel" style={{ height, width }} aria-hidden />;
}
