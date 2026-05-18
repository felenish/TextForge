interface ShellProps {
  focusMode?: boolean;
  typewriterMode?: boolean;
  children: React.ReactNode;
}

export function Shell({ focusMode, typewriterMode, children }: ShellProps) {
  const cls = ['shell', focusMode && 'focus-mode', typewriterMode && 'typewriter']
    .filter(Boolean).join(' ');
  return <div className={cls}>{children}</div>;
}
