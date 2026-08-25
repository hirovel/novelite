import React from 'react';

interface Props {
  shortcut: string;
  className?: string;
}

export const KeyboardShortcutBadge: React.FC<Props> = ({ shortcut, className = '' }) => {
  const keys = shortcut.split('+');

  return (
    <span className={`inline-flex items-center gap-0.5 font-mono text-[10px] ${className}`}>
      {keys.map((k, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="opacity-30">+</span>}
          <kbd className="rounded border border-current/20 bg-current/5 px-1.5 py-0.5 text-current/80 shadow-xs">
            {k}
          </kbd>
        </React.Fragment>
      ))}
    </span>
  );
};
