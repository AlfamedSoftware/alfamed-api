export const SESSION_EXPIRY_SECONDS = 60 * 60;
export const SELECTED_UNIT_COOKIE_MAX_AGE_SECONDS = SESSION_EXPIRY_SECONDS;

export const IS_PRODUCTION = process.env.NODE_ENV === "production";

export const TRUSTED_ORIGINS = [
    "https://dev-alfamed.vercel.app",
    "https://web-alfamed.vercel.app",
    "http://localhost:5173",
    "http://localhost:53441",
];
