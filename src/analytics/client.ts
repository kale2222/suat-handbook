import type { ClientModule } from "@docusaurus/types";
import { capturePageview, synchronizePreferences } from "./index";
import { reloadBusuanzi } from "../busuanzi";

let listening = false;

const clientModule: ClientModule = {
  onRouteDidUpdate({ location, previousLocation }) {
    if (!listening) {
      synchronizePreferences();
      listening = true;
    }
    if (location.pathname === previousLocation?.pathname) return;
    reloadBusuanzi();
    // The new page is mounted; read its heading rather than a potentially stale head title.
    const title = document.querySelector("h1")?.textContent || document.title;
    void capturePageview(location.pathname, title);
  },
};

export default clientModule;
