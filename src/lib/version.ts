import packageJson from "../../package.json";

export const APP_VERSION = packageJson.version || "1.0.4";
export const DISPLAY_VERSION = `Version ${APP_VERSION}`;
