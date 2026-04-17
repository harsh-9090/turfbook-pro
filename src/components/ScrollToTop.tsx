import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Automatically scrolls the window to the top (0,0) whenever the route changes.
 * Place this component inside <BrowserRouter> in App.tsx.
 */
export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return null;
}
