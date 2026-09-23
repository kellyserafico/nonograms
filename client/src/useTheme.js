import { useState } from "react";

const KEY = "nono-dark";

export function useTheme() {
	const [dark, setDarkState] = useState(() => {
		try {
			const v = localStorage.getItem(KEY);
			return v === null ? true : v === "true";
		} catch {
			return true;
		}
	});

	const setDark = (fn) => {
		setDarkState((prev) => {
			const next = typeof fn === "function" ? fn(prev) : fn;
			try { localStorage.setItem(KEY, String(next)); } catch {}
			return next;
		});
	};

	return [dark, setDark];
}
