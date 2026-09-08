import { looksLikeHtml, isRichTextEmpty } from "../../utils/richTextContent";

type RichTextContentProps = {
    content?: string | null;
    className?: string;
    emptyFallback?: string;
};

const RichTextContent = ({
    content,
    className = "text-[14px] font-[Regular] text-[#222] leading-[160%]",
    emptyFallback = "--/--",
}: RichTextContentProps) => {
    const raw = content?.trim() ?? "";

    if (!raw || isRichTextEmpty(raw)) {
        return <p className={className}>{emptyFallback}</p>;
    }

    if (looksLikeHtml(raw)) {
        return (
            <div
                className={`${className} [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5`}
                dangerouslySetInnerHTML={{ __html: raw }}
            />
        );
    }

    return <p className={`${className} whitespace-pre-wrap`}>{raw}</p>;
};

export default RichTextContent;
