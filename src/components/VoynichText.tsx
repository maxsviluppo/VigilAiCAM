import React from "react";

interface VoynichGlyphProps {
  char: string;
  size?: number;
  className?: string;
}

export const VoynichGlyph: React.FC<VoynichGlyphProps> = ({ char, size = 20, className = "" }) => {
  const c = char.toLowerCase();
  
  // Custom SVG paths for common Voynich letters (approximation of Currier/EVA glyphs)
  const getGlyphSvg = () => {
    switch (c) {
      case "o":
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="inline-block align-middle">
            <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="2.5" />
          </svg>
        );
      case "a":
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="inline-block align-middle">
            <path d="M10 16a4 4 0 1 1 4-4v4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M14 12c1.5 0 3-1 3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case "e":
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="inline-block align-middle">
            <path d="M8 14c0-3 3-5 5-2s-5 4-5 2z" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        );
      case "y":
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="inline-block align-middle">
            <path d="M8 8V12a4 4 0 0 0 4 4c3 0 3-4 3-7M12 16c0 3-1 5-4 5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        );
      case "t": // Tall Gallows T
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="inline-block align-middle">
            {/* Horizontal yoke with loop */}
            <path d="M7 6c1.5 0 3-1 4.5 0s3 3 5 .5c1.5-1.5 1-3.5-1-3.5-3.5 0-7 2.5-9.5 3z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {/* Double leg */}
            <path d="M9 6v14M13 7v13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case "k": // Tall Gallows K
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="inline-block align-middle">
            {/* Highly ornate top loop */}
            <path d="M7 6c1.5-2.5 5-4 7-1.5s-2.5 5-4.5 1.5c-1-2-1 3 1.5 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {/* Double legs with standard curves */}
            <path d="M9 6v14" stroke="currentColor" strokeWidth="2" />
            <path d="M13 8v12M13 12c1.5 2 3-1 4-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case "p": // Gallows P
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="inline-block align-middle">
            <path d="M6 6h12M10 6v14M14 6v14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M6 6c0-2.5 3-3 6-3s6 .5 6 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case "f": // Gallows F
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="inline-block align-middle">
            <path d="M8 6h8M12 6v14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M8 6c0-3 2.5-3.5 4-3.5s4 .5 4 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case "8": // "d" or "dai" lookalike
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="inline-block align-middle">
            <path d="M12 8a3 3 0 1 0 0 6 3 3 0 0 0 0-6z" stroke="currentColor" strokeWidth="2.5" />
            <path d="M12 14a4 4 0 1 0 0 7 4 4 0 0 0 0-7z" stroke="currentColor" strokeWidth="2.5" />
            <path d="M14 8c1-1 .5-3-2-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        );
      case "r":
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="inline-block align-middle">
            <path d="M8 12c0-3 3-4 4-2s-1 6-4 4M10 10c2-1 4 .5 4 3s-3 3-4 1" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        );
      case "c":
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="inline-block align-middle">
            <path d="M15 10a4 4 0 0 0-4-3c-3 0-4 3-4 5s1.5 5 4.5 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        );
      case "l":
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="inline-block align-middle">
            <path d="M8 14s2-5 4-5 1 5 1 7M8 16c1.5 0 5-1 5-4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        );
      case "n":
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="inline-block align-middle">
            <path d="M8 10v6M14 10v6M8 10c1.5-2 4-2 6 0" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          </svg>
        );
      case "d":
        return (
          <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className="inline-block align-middle">
            <path d="M8 8a3 3 0 0 1 4 3c0-3.5 3-4 4-1M8 11v5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
        );
      case " ":
        return <span style={{ width: size / 2, display: "inline-block" }}>&nbsp;</span>;
      default:
        // Plain character for numbers/symbols or fallback
        return <span className="font-serif font-bold text-xs opacity-60 px-[1px]">{char}</span>;
    }
  };

  return (
    <span className={`inline-flex items-center justify-center select-none text-amber-900 dark:text-amber-200 ${className}`} style={{ width: size, height: size }}>
      {getGlyphSvg()}
    </span>
  );
};

interface VoynichTextProps {
  text: string;
  size?: number;
  className?: string;
  wordClassName?: string;
}

export const VoynichText: React.FC<VoynichTextProps> = ({ text, size = 18, className = "", wordClassName = "" }) => {
  // Split words to handle linebreaks and neat text wraps
  const words = text.split(/(\s+)/);

  return (
    <span className={`inline-flex flex-wrap items-center gap-y-2 leading-relaxed tracking-wider ${className}`}>
      {words.map((word, wIdx) => {
        if (word.trim() === "") {
          return <span key={wIdx} className="inline-block select-none" style={{ width: size / 1.5 }}>&nbsp;</span>;
        }

        // Check for newlines
        if (word.includes("\n")) {
          return word.split("\n").map((part, pIdx) => (
            <React.Fragment key={`${wIdx}-${pIdx}`}>
              {pIdx > 0 && <span className="w-full h-0 block">&nbsp;</span>}
              <span className={`inline-flex items-center ${wordClassName}`}>
                {part.split("").map((c, cIdx) => (
                  <VoynichGlyph key={cIdx} char={c} size={size} />
                ))}
              </span>
            </React.Fragment>
          ));
        }

        return (
          <span key={wIdx} className={`inline-flex items-center hover:bg-amber-100/30 rounded px-0.5 transition-colors ${wordClassName}`}>
            {word.split("").map((c, cIdx) => (
              <VoynichGlyph key={cIdx} char={c} size={size} />
            ))}
          </span>
        );
      })}
    </span>
  );
};
