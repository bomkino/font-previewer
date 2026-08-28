export type InterfaceIconName = "add" | "export" | "folder" | "library" | "save" | "tune";

export function InterfaceIcon({ name, size = 22 }: { readonly name: InterfaceIconName; readonly size?: number }) {
  const paths = {
    add: <><path d="M12 4.5v15" /><path d="M4.5 12h15" /></>,
    export: <><path d="M12 3.5v12" /><path d="m7.5 11 4.5 4.5 4.5-4.5" /><path d="M4.5 20h15" /></>,
    folder: <path d="M3.5 7.5h6l2-2h4l2 2h3v11h-17z" />,
    library: <><path d="M4.5 5h4v14h-4z" /><path d="M10 5h4v14h-4z" /><path d="m16.5 5 3 13.5-3.5.8-3-13.5z" /></>,
    save: <><path d="M5 4.5h11l3 3v12H5z" /><path d="M8 4.5v5h7v-5" /><path d="M8.5 19.5v-6h7v6" /></>,
    tune: <><path d="M4 7h16" /><path d="M4 17h16" /><circle cx="9" cy="7" r="2" /><circle cx="15" cy="17" r="2" /></>,
  } as const;
  return (
    <svg className="interface-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="square" strokeLinejoin="miter" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}
