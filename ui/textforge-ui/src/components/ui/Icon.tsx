interface IconProps {
  name: string;
  size?: number;
  stroke?: number;
  className?: string;
  style?: React.CSSProperties;
}

export function Icon({ name, size = 16, stroke = 1.5, className, style }: IconProps) {
  const base = {
    width: size,
    height: size,
    viewBox: '0 0 24 24' as const,
    fill: 'none' as const,
    stroke: 'currentColor',
    strokeWidth: stroke,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    className,
    style,
  };

  switch (name) {
    case 'book': return (
      <svg {...base}>
        <path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H19v17H6a2 2 0 0 0-2 2V4.5Z" />
        <path d="M9 7h6M9 11h6" />
      </svg>
    );
    case 'map-pin': return (
      <svg {...base}>
        <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    );
    case 'user': return (
      <svg {...base}>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </svg>
    );
    case 'users': return (
      <svg {...base}>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    );
    case 'git': return (
      <svg {...base}>
        <circle cx="6" cy="6" r="2.2" />
        <circle cx="6" cy="18" r="2.2" />
        <circle cx="18" cy="12" r="2.2" />
        <path d="M6 8v8" />
        <path d="M16 12H9a3 3 0 0 0-3 3" />
      </svg>
    );
    case 'search': return (
      <svg {...base}>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" />
      </svg>
    );
    case 'settings': return (
      <svg {...base}>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1.04 1.56V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.56 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.7 1.7 0 0 0 .34-1.87 1.7 1.7 0 0 0-1.56-1.04H3a2 2 0 1 1 0-4h.09a1.7 1.7 0 0 0 1.56-1.11 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.87.34h.01A1.7 1.7 0 0 0 10 3.09V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1.04 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.87V9c.34.6.96 1 1.64 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51 1Z" />
      </svg>
    );
    case 'chev-right': return (
      <svg {...base}>
        <polyline points="9 6 15 12 9 18" />
      </svg>
    );
    case 'chev-down': return (
      <svg {...base}>
        <polyline points="6 9 12 15 18 9" />
      </svg>
    );
    case 'file-text': return (
      <svg {...base}>
        <path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
        <path d="M14 3v6h6" />
        <path d="M8 13h7M8 17h5" />
      </svg>
    );
    case 'folder': return (
      <svg {...base}>
        <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h4l2 2.5h9A1.5 1.5 0 0 1 21 9v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6.5Z" />
      </svg>
    );
    case 'x': return (
      <svg {...base}>
        <path d="M18 6 6 18M6 6l12 12" />
      </svg>
    );
    case 'plus': return (
      <svg {...base}>
        <path d="M12 5v14M5 12h14" />
      </svg>
    );
    case 'minus': return (
      <svg {...base}>
        <path d="M5 12h14" />
      </svg>
    );
    case 'more': return (
      <svg {...base}>
        <circle cx="6" cy="12" r="1" />
        <circle cx="12" cy="12" r="1" />
        <circle cx="18" cy="12" r="1" />
      </svg>
    );
    case 'sun': return (
      <svg {...base}>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
      </svg>
    );
    case 'moon': return (
      <svg {...base}>
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
    );
    case 'type': return (
      <svg {...base}>
        <path d="M4 7V5h16v2M9 19h6M12 5v14" />
      </svg>
    );
    case 'focus': return (
      <svg {...base}>
        <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    );
    case 'minimize': return (
      <svg {...base}>
        <path d="M8 3v3a2 2 0 0 1-2 2H3M21 8h-3a2 2 0 0 1-2-2V3M3 16h3a2 2 0 0 1 2 2v3M16 21v-3a2 2 0 0 1 2-2h3" />
      </svg>
    );
    case 'save': return (
      <svg {...base}>
        <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
        <polyline points="17 21 17 13 7 13 7 21" />
        <polyline points="7 3 7 8 15 8" />
      </svg>
    );
    case 'branch': return (
      <svg {...base}>
        <line x1="6" y1="3" x2="6" y2="15" />
        <circle cx="18" cy="6" r="2" />
        <circle cx="6" cy="18" r="2" />
        <path d="M18 8a6 6 0 0 1-6 6h-1a4 4 0 0 0-5 4" />
      </svg>
    );
    case 'history': return (
      <svg {...base}>
        <path d="M3 3v5h5" />
        <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
        <path d="M12 7v5l4 2" />
      </svg>
    );
    case 'edit': return (
      <svg {...base}>
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    );
    case 'trash': return (
      <svg {...base}>
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </svg>
    );
    case 'copy': return (
      <svg {...base}>
        <rect x="9" y="9" width="13" height="13" rx="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
    );
    case 'command': return (
      <svg {...base}>
        <path d="M18 3a3 3 0 0 0-3 3v12a3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0-3-3H6a3 3 0 0 0-3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3V6a3 3 0 0 0-3-3 3 3 0 0 0-3 3 3 3 0 0 0 3 3h12a3 3 0 0 0 3-3 3 3 0 0 0-3-3z" />
      </svg>
    );
    case 'panel-bottom': return (
      <svg {...base}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="3" y1="15" x2="21" y2="15" />
      </svg>
    );
    case 'panel-right': return (
      <svg {...base}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="15" y1="3" x2="15" y2="21" />
      </svg>
    );
    case 'scene': return (
      <svg {...base}>
        <path d="M4 4h16v3H4z" />
        <path d="M6 11h12M6 15h12M6 19h8" />
      </svg>
    );
    case 'circle': return (
      <svg {...base}>
        <circle cx="12" cy="12" r="9" />
      </svg>
    );
    case 'pencil': return (
      <svg {...base}>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
      </svg>
    );
    case 'info': return (
      <svg {...base}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 16v-4M12 8h.01" />
      </svg>
    );
    case 'warn': return (
      <svg {...base}>
        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    );
    case 'filter': return (
      <svg {...base}>
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
      </svg>
    );
    case 'refresh': return (
      <svg {...base}>
        <polyline points="23 4 23 10 17 10" />
        <polyline points="1 20 1 14 7 14" />
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
      </svg>
    );
    case 'feather': return (
      <svg {...base}>
        <path d="M20.24 12.24a6 6 0 0 0-8.49-8.49L5 10.5V19h8.5l6.74-6.76z" />
        <line x1="16" y1="8" x2="2" y2="22" />
        <line x1="17.5" y1="15" x2="9" y2="15" />
      </svg>
    );
    case 'anchor': return (
      <svg {...base}>
        <circle cx="12" cy="5" r="3" />
        <line x1="12" y1="22" x2="12" y2="8" />
        <path d="M5 12H2a10 10 0 0 0 20 0h-3" />
      </svg>
    );
    case 'compass': return (
      <svg {...base}>
        <circle cx="12" cy="12" r="9" />
        <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
      </svg>
    );
    case 'win-maximize': return (
      <svg {...base}>
        <rect x="3" y="3" width="18" height="18" rx="2" />
      </svg>
    );
    case 'win-restore': return (
      <svg {...base}>
        <rect x="6" y="3" width="15" height="15" rx="2" />
        <path d="M3 9v10a2 2 0 0 0 2 2h10" />
      </svg>
    );
    default: return <svg {...base}><circle cx="12" cy="12" r="6" /></svg>;
  }
}
