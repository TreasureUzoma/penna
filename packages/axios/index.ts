import axios, { AxiosInstance, AxiosResponse } from "axios";

const api: AxiosInstance = axios.create({
  // Relative on purpose: apps/web's next.config.mjs rewrites `/api/**` to
  // the real API server, and the dashboard is itself reverse-proxied under
  // apps/web's origin (see the `dashboardRoutes` rewrites there). A
  // relative path resolves correctly against whatever domain actually
  // served the page — dev or prod — with no env var needed. A hardcoded
  // `http://localhost:3000/api/v1` here would silently break every
  // frontend API call once deployed to a real domain.
  baseURL: "/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

api.interceptors.response.use(
  (response: AxiosResponse<Response>) => response,
  (error) => {
    let message =
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.response?.data?.detail ||
      error.message ||
      "Something went wrong";

    if (error.code === "ERR_NETWORK") {
      message = "Unable to connect to server. Please check your internet.";
    }

    // A 401 here means the session cookie is present but no longer valid
    // (expired access token + spent refresh token) — proxy.ts only checks
    // cookie *presence* for protected routes, so a stale session sails
    // through the middleware and only ever surfaces here, as a failed data
    // fetch. Without this, the user is left staring at a broken page
    // instead of being sent back to /login. Skip auth endpoints themselves
    // so a wrong-password 401 on the login form shows a toast, not a
    // redirect loop.
    const requestUrl: string = error.config?.url ?? "";
    if (
      error.response?.status === 401 &&
      !requestUrl.startsWith("/auth/") &&
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith("/login")
    ) {
      const next = encodeURIComponent(
        window.location.pathname + window.location.search
      );
      window.location.href = `/login?next=${next}`;
    }

    return Promise.reject(new Error(message));
  }
);

export default api;
