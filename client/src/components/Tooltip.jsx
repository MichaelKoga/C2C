import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";

function Tooltip({ children, text }) {
  const [pos, setPos] = useState(null);
  const triggerRef = useRef(null);

  const showTooltip = () => {
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({
      top: rect.top + window.scrollY - 8, // move slightly up
      left: rect.left + window.scrollX + rect.width / 2
    });
  };

  const hideTooltip = () => {
    setPos(null);
  };

  return (
    <>
      <span
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        style={{ cursor: "pointer" }}
      >
        {children}
      </span>

      {pos &&
        createPortal(
          <div
            style={{
              position: "absolute",
              top: pos.top, // position above trigger
              left: pos.left - 20,
              transform: "translateX(-50%)",
              background: "white",
              color: "black",
              padding: "4px 8px",
              borderRadius: "4px",
              whiteSpace: "nowrap",
              zIndex: 9999,
              pointerEvents: "none"
            }}
          >
            {text}
          </div>,
          document.body
        )}
    </>
  );
}

export default Tooltip;
