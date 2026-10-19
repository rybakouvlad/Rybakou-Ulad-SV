const LINK_HEADER =
  '<https://rybakou.com/llms.txt>; rel="describedby"; type="text/plain", <https://rybakou.com/llms.txt>; rel="service-doc"; type="text/markdown"';
const CONTENT_SIGNAL = "search=yes, ai-input=yes, ai-train=no";

const worker = {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.hostname === "www.rybakou.com") {
      url.hostname = "rybakou.com";
      return Response.redirect(url.toString(), 301);
    }

    if (url.pathname.startsWith("/.cloudflare") || url.pathname.startsWith("/.git")) {
      return new Response("Not Found", {
        status: 404,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "X-Robots-Tag": "noindex, nofollow",
        },
      });
    }

    const accept = (request.headers.get("Accept") || "").toLowerCase();
    if (
      (url.pathname === "/" || url.pathname === "/index.html") &&
      (request.method === "GET" || request.method === "HEAD") &&
      accept.includes("text/markdown")
    ) {
      const mdRes = await fetch(new URL("/llms.txt", url.origin).toString(), {
        headers: { "User-Agent": "rybakou-agent-edge" },
      });
      if (mdRes.ok) {
        const text = await mdRes.text();
        const tokens = Math.max(1, Math.ceil(text.length / 4));
        const headers = new Headers();
        headers.set("Content-Type", "text/markdown; charset=utf-8");
        headers.set("Vary", "Accept, Accept-Encoding");
        headers.set("X-Markdown-Tokens", String(tokens));
        headers.set("Content-Signal", CONTENT_SIGNAL);
        headers.set("Link", LINK_HEADER);
        headers.set("Cache-Control", "public, max-age=600");
        headers.set(
          "Strict-Transport-Security",
          "max-age=31536000; includeSubDomains; preload",
        );
        headers.set("X-Content-Type-Options", "nosniff");
        return new Response(request.method === "HEAD" ? null : text, {
          status: 200,
          headers,
        });
      }
    }

    const response = await fetch(request);
    if (response.status >= 300 && response.status < 400) {
      return response;
    }

    const headers = new Headers(response.headers);
    headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload",
    );
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("X-Frame-Options", "SAMEORIGIN");
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    headers.set("Content-Signal", CONTENT_SIGNAL);
    headers.set("Link", LINK_HEADER);
    headers.set("Vary", "Accept, Accept-Encoding");

    if (url.pathname === "/llms.txt") {
      headers.set("X-Robots-Tag", "noindex, nofollow");
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};

export default worker;
