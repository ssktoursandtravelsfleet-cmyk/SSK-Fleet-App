import packageJson from "../../package.json";

export const APP_VERSION = packageJson.version || "1.0.5";
export const DISPLAY_VERSION = `Version ${APP_VERSION}`;
