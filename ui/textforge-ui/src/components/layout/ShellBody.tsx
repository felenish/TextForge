interface ShellBodyProps {
  noInspector?: boolean;
  noSidebar?: boolean;
  children: React.ReactNode;
}

export function ShellBody({ noInspector, noSidebar, children }: ShellBodyProps) {
  const cls = ['shell-body', noInspector && 'no-inspector', noSidebar && 'no-sidebar']
    .filter(Boolean).join(' ');
  return <div className={cls}>{children}</div>;
}
