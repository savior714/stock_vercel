"use client";

import { useState, useEffect } from "react";
import { Minus, Square, X, Maximize2 } from "lucide-react";

import { Window } from "@tauri-apps/api/window";

export function TitleBar() {
    const [appWindow, setAppWindow] = useState<Window | null>(null);
    const [isMaximized, setIsMaximized] = useState(false);

    useEffect(() => {
        import("@tauri-apps/api/window").then((module) => {
            const win = module.getCurrentWindow();
            setAppWindow(win);

            // Check initial state
            win.isMaximized().then(setIsMaximized);

            // Listen for resize events to update state
            const unlisten = win.listen("tauri://resize", async () => {
                setIsMaximized(await win.isMaximized());
            });

            return () => {
                unlisten.then(f => f());
            };
        });
    }, []);

    const handleMinimize = () => appWindow?.minimize();
    const handleMaximize = async () => {
        if (!appWindow) return;
        const maximized = await appWindow.isMaximized();
        if (maximized) {
            appWindow.unmaximize();
        } else {
            appWindow.maximize();
        }
    };
    const handleClose = () => appWindow?.close();

    return (
        <div
            data-tauri-drag-region
            className="fixed top-0 left-0 right-0 h-9 z-50 flex items-center justify-between px-3 select-none group transition-colors duration-300 hover:bg-black/10"
        >
            {/* 
         Drag Region Title 
         We can put App Name here if wanted, or leave empty for clean look.
      */}
            <div
                className="text-xs font-semibold text-gray-500/50 pointer-events-none group-hover:text-gray-600 transition-colors"
                data-tauri-drag-region
            >
                Stock Vercel
            </div>

            <div className="flex items-center gap-1">
                <button
                    onClick={handleMinimize}
                    className="p-1.5 rounded-md text-gray-500 hover:bg-black/10 hover:text-gray-800 transition-colors"
                    title="Minimize"
                >
                    <Minus size={14} />
                </button>
                <button
                    onClick={handleMaximize}
                    className="p-1.5 rounded-md text-gray-500 hover:bg-black/10 hover:text-gray-800 transition-colors"
                    title={isMaximized ? "Restore" : "Maximize"}
                >
                    {isMaximized ? <Square size={12} /> : <Maximize2 size={12} />}
                </button>
                <button
                    onClick={handleClose}
                    className="p-1.5 rounded-md text-gray-500 hover:bg-red-500 hover:text-white transition-colors"
                    title="Close"
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    );
}
