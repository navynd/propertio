import * as SelectPrimitive from "@radix-ui/react-select";
import * as React from "react";

type SelectContextProps = {
  triggerWidth: number;
  setTriggerWidth: (width: number) => void;
};

const SelectContext = React.createContext<SelectContextProps | undefined>(
  undefined
);

const Select = ({ children, ...props }: React.ComponentPropsWithoutRef<typeof SelectPrimitive.Root>) => {
  const [triggerWidth, setTriggerWidth] = React.useState(0);

  return (
    <SelectContext.Provider value={{ triggerWidth, setTriggerWidth }}>
      <SelectPrimitive.Root {...props}>
        {children}
      </SelectPrimitive.Root>
    </SelectContext.Provider>
  );
};

Select.displayName = "Select";

const SelectGroup = SelectPrimitive.Group;

const SelectValue = SelectPrimitive.Value;

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, forwardedRef) => {
  const context = React.useContext(SelectContext);
  const setTriggerWidth = context?.setTriggerWidth ?? (() => {});
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);

  const handleRef = React.useCallback(
    (node: HTMLButtonElement | null) => {
      triggerRef.current = node;

      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (forwardedRef) {
        (forwardedRef as React.MutableRefObject<HTMLButtonElement | null>).current =
          node;
      }
    },
    [forwardedRef]
  );

  React.useLayoutEffect(() => {
    const node = triggerRef.current;
    if (!node) return;

    const updateWidth = () => {
      setTriggerWidth(node.getBoundingClientRect().width);
    };

    updateWidth();

    const handleResize = () => updateWidth();
    let observer: ResizeObserver | null = null;

    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(handleResize);
      observer.observe(node);
    }

    if (typeof window !== "undefined") {
      window.addEventListener("resize", handleResize);
    }

    return () => {
      observer?.disconnect();

      if (typeof window !== "undefined") {
        window.removeEventListener("resize", handleResize);
      }
    };
  }, [setTriggerWidth]);

  return (
    <SelectPrimitive.Trigger
      ref={handleRef}
      className={className}
      {...props}
    >
      {children}
    </SelectPrimitive.Trigger>
  );
});

SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={className}
    {...props}
  />
));
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName;

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={className}
    {...props}
  />
));
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName;

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", style, ...props }, ref) => {
  const context = React.useContext(SelectContext);
  const triggerWidth = context?.triggerWidth ?? 0;

  const mergedStyle = {
    ...style,
    ...(triggerWidth && !style?.minWidth
      ? { minWidth: `${triggerWidth}px` }
      : {}),
    ...(triggerWidth && !style?.width
      ? { width: `${triggerWidth}px` }
      : {}),
  };

  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        ref={ref}
        className={className}
        position={position}
        style={mergedStyle}
        {...props}
      >
        <SelectScrollUpButton />
        <SelectPrimitive.Viewport className="SelectViewport">
          {children}
        </SelectPrimitive.Viewport>
        <SelectScrollDownButton />
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
});

SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label ref={ref} className={className} {...props} />
));
SelectLabel.displayName = SelectPrimitive.Label.displayName;

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Item ref={ref} className={className} {...props}>
    <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
));
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={className}
    {...props}
  />
));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
};

