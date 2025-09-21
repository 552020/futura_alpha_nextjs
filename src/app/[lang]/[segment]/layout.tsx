import { ReactNode } from 'react';

export default function SegmentLayout({ children }: { children: ReactNode }) {
  return <div className="segment-layout">{children}</div>;
}
