import { deleteCookie, getCookies } from "cookies-next";

export const clearAllCookies = () => {
  const cookies = getCookies();

  for (const cookieName of Object.keys(cookies)) {
    try {
      deleteCookie(cookieName);
    } catch {
      // Skip cookies with non-ASCII names
    }
  }
};

export const clearAuthCookies = () => {
  deleteCookie("appToken");
  deleteCookie("refreshToken");
};
