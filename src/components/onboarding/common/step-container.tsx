import { ReactNode } from 'react';

interface StepContainerProps {
  children: ReactNode;
  //   title: string;
  //   description?: string;
}

// export function StepContainer({ children, title, description }: StepContainerProps) {
export function StepContainer({ children }: StepContainerProps) {
  return (
    <div className="space-y-6">
      {/* <div className="space-y-2 text-center"> */}
      {/* <h2 className="text-2xl font-semibold tracking-tight">{title}</h2> */}
      {/* {description && <p className="text-sm text-muted-foreground">{description}</p>} */}
      {/* </div> */}
      {children}
    </div>
  );
}
