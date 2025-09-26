import * as React from 'react';

interface VisuallyHiddenProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  asChild?: boolean;
}

export const VisuallyHidden = React.forwardRef<HTMLSpanElement, VisuallyHiddenProps>(
  ({ className, children, asChild = false, ...props }, ref) => {
    const Comp = asChild ? 'span' : 'span';
    return (
      <Comp
        ref={ref}
        className={[
          'absolute w-px h-px p-0 -m-px overflow-hidden whitespace-nowrap border-0',
          'clip-[rect(0,0,0,0)]',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);

VisuallyHidden.displayName = 'VisuallyHidden';
