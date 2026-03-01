# CORS Troubleshooting Guide: Gin Trailing Slash Redirects

## The Problem
When integrating a new frontend domain (e.g., Cloudflare Pages, Vercel) with a Golang Gin backend, you might encounter a persistent CORS error indicating that the `Access-Control-Allow-Origin` header is missing, even after you have verified that:
1. The CORS middleware is correctly configured.
2. The new frontend domain is explicitly listed in your `allowedOrigins`.

**Example Error:**
```
Access to XMLHttpRequest at 'https://api.example.com/api/products' from origin 'https://frontend.pages.dev' has been blocked by CORS policy: No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## The Root Cause

The issue is often caused by **Gin's default trailing slash redirection behavior (`RedirectTrailingSlash`)** combined with how route groups are defined.

1. **Route Definition:** If you define a route group root using a slash, like this:
   ```go
   products := api.Group("/products")
   products.GET("/", handler) // Listens EXACTLY on /api/products/
   ```
2. **The Request:** The frontend makes a request to `/api/products` (WITHOUT the trailing slash).
3. **The Redirect:** Gin sees that `/api/products` doesn't match the exact definition but `/api/products/` does. Because `RedirectTrailingSlash` is `true` by default, Gin immediately intercepts the request and issues a `301 Moved Permanently` (or `307 Temporary Redirect`) to `/api/products/`.
4. **The CORS Failure:** Crucially, **Gin's automated redirect responses bypass the custom CORS middleware**. The `301` response is sent back to the browser **without** the `Access-Control-Allow-Origin` headers.
5. **Browser Blocking:** The browser receives the `301` redirect but seeing no CORS headers on it, immediately blocks the request and throws the CORS error, never actually following the redirect to the final destination.

## The Solution

### 1. Backend Fix (Prevent the Redirect)
To fix this, change the route definition so it listens exactly on the path the frontend is requesting, avoiding the redirect entirely.

Change the group root definitions from `"/"` to `""` (empty string).

**Incorrect:**
```go
products := api.Group("/products")
products.GET("/", productHandler.GetProducts) // Triggers redirect from /api/products
```

**Correct:**
```go
products := api.Group("/products")
products.GET("", productHandler.GetProducts)  // Handles /api/products directly
```

Apply this to all affected route groups (`POST`, `PUT`, `DELETE`, etc.).

### 2. Frontend Fix (Bypass Browser Caching)
Even after fixing the backend, the issue might persist for users who already encountered the error. This is because **browsers aggressively cache `301 Moved Permanently` redirects**.

The browser remembers that `/api/products` redirects to `/api/products/` and will automatically apply the redirect locally without ever hitting the newly fixed backend. The cached redirect still lacks CORS headers, so the error persists.

To fix this seamlessly for all users without requiring a hard cache clear, add a **cache-buster** query parameter to frontend GET requests.

**Example Fix (Axios Interceptor):**
```javascript
api.interceptors.request.use((config) => {
  // Add a cache buster timestamp or version string to all GET requests
  // to bypass aggressive 301 cached redirects from previous CORS bugs.
  if (config.method?.toLowerCase() === 'get') {
    config.params = { ...config.params, _cb: 'v2' }; // or Date.now()
  }
  return config;
});
```

By appending `?_cb=v2`, the browser treats the URL as completely new, bypasses the cached 301 redirect, hits the correctly configured backend endpoint, and receives the proper CORS headers.
