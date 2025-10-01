import * as React from 'react';

type VisuallyHiddenProps = {
  children: React.ReactNode;
  asChild?: boolean;
};

export const VisuallyHidden = ({
  children,
  asChild = false,
  ...props
}: VisuallyHiddenProps) => {
  if (asChild) {
    return (
      <span className="sr-only" {...props}>
        {children}
      </span>
    );
  }
  
  return (
    <span className="sr-only" {...props}>
      {children}
    </span>
  );
};
