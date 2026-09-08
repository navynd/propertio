import {
    useCallback,
    useState,
    type MouseEvent,
    type ReactNode,
} from "react";
import { createPortal } from "react-dom";

type HoverTooltipProps = {
    content: string;
    children: ReactNode;
    /** When true, hover tooltip is disabled */
    disabled?: boolean;
};

const EMPTY_PLACEHOLDER = "--/--";

export default function HoverTooltip({
    content,
    children,
    disabled = false,
}: HoverTooltipProps) {
    const [visible, setVisible] = useState(false);
    const [position, setPosition] = useState({ top: 0, left: 0 });

    const trimmed = content.trim();
    const canShow = !disabled && trimmed.length > 0 && trimmed !== EMPTY_PLACEHOLDER;

    const showTooltip = useCallback(
        (event: MouseEvent<HTMLSpanElement>) => {
            if (!canShow) return;
            const rect = event.currentTarget.getBoundingClientRect();
            setPosition({
                top: rect.top,
                left: rect.left + rect.width / 2,
            });
            setVisible(true);
        },
        [canShow],
    );

    const hideTooltip = useCallback(() => {
        setVisible(false);
    }, []);

    return (
        <>
            <span
                className="block min-w-0 w-full"
                onMouseEnter={showTooltip}
                onMouseLeave={hideTooltip}
            >
                {children}
            </span>
            {visible &&
                canShow &&
                createPortal(
                    <div
                        role="tooltip"
                        className="pointer-events-none fixed z-[1400] max-w-[min(360px,calc(100vw-24px))] -translate-x-1/2 -translate-y-[calc(100%+8px)] rounded-[8px] bg-[#222] px-[12px] py-[8px] text-[12px] font-[Regular] leading-[1.45] text-white shadow-[0_6px_16px_rgba(0,0,0,0.18)]"
                        style={{
                            top: position.top,
                            left: position.left,
                        }}
                    >
                        <p className="whitespace-pre-wrap break-words">{trimmed}</p>
                    </div>,
                    document.body,
                )}
        </>
    );
}
