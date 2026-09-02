/*
  Tests for the URL ingest module: the host-blocking table, submitted-URL
  normalization (query/fragment stripping kills tracking and canary tokens),
  the manual redirect loop with per-hop re-validation, response gates, and
  the HTML-to-text strip.
*/
import { describe, expect, it } from "vitest";
import {
  UrlIngestError,
  fetchSubmittedUrl,
  hostBlocked,
  htmlToText,
  normalizeSubmittedUrl,
  submittedHostOf,
} from "@shared/ingest-url.ts";

describe("submittedHostOf: the web address typed beside a vendor name (1.7)", () => {
  it("accepts a bare host, a www host with a path and query, and an http address it upgrades", () => {
    expect(submittedHostOf("polco.us")).toBe("polco.us");
    expect(submittedHostOf("https://www.ConductorAI.com/about?x=1#y")).toBe("conductorai.com");
    expect(submittedHostOf("http://vendor.example.com")).toBe("vendor.example.com");
    expect(submittedHostOf("  WWW.Acme-Gov.com/  ")).toBe("acme-gov.com");
  });
  it("rejects what the web-address tab rejects, with the same copy", () => {
    expect(() => submittedHostOf("localhost")).toThrow(UrlIngestError);
    expect(() => submittedHostOf("127.0.0.1")).toThrow("that address is not one we can fetch");
    expect(() => submittedHostOf("vendor")).toThrow("that address is not one we can fetch");
    expect(() => submittedHostOf("ftp://vendor.example.com")).toThrow("submit a full https web address");
    expect(() => submittedHostOf("https://vendor.example.com:8443")).toThrow("that address is not one we can fetch");
    expect(() => submittedHostOf("")).toThrow(UrlIngestError);
  });
});

describe("hostBlocked", () => {
  const blocked = [
    "localhost",
    "127.0.0.1",
    "10.0.0.8",
    "172.16.4.4",
    "192.168.1.1",
    "169.254.169.254",
    "8.8.8.8",
    "[::1]",
    "fd00::1",
    "0x7f000001",
    "2130706433",
    "intranet",
    "vendor.local",
    "api.internal",
    "site.localhost",
    "",
  ];
  for (const host of blocked) {
    it(`blocks "${host}"`, () => {
      expect(hostBlocked(host)).toBe(true);
    });
  }
  const allowed = ["vendor.example.com", "www.polimorphic.com", "city.gov"];
  for (const host of allowed) {
    it(`allows "${host}"`, () => {
      expect(hostBlocked(host)).toBe(false);
    });
  }
});

describe("normalizeSubmittedUrl", () => {
  it("strips query strings and fragments (tracking and canary tokens)", () => {
    expect(
      normalizeSubmittedUrl(
        "https://vendor.example.com/pitch?utm_source=email&recipient=joe#top",
      ),
    ).toBe("https://vendor.example.com/pitch");
  });

  it("rejects http, ports, IP literals, and garbage", () => {
    for (const bad of [
      "http://vendor.example.com/",
      "https://vendor.example.com:8443/",
      "https://127.0.0.1/",
      "https://localhost/x",
      "not a url",
      "ftp://vendor.example.com/",
    ]) {
      expect(() => normalizeSubmittedUrl(bad)).toThrow(UrlIngestError);
    }
  });

  it("caps length", () => {
    expect(() => normalizeSubmittedUrl("https://a.example.com/" + "x".repeat(3000))).toThrow(
      UrlIngestError,
    );
  });
});

/* Scripted fetch: maps url -> response spec. */
function scriptedFetch(
  script: Record<
    string,
    { status?: number; headers?: Record<string, string>; body?: string }
  >,
): typeof fetch {
  return (async (input: RequestInfo | URL) => {
    const url = String(input);
    const spec = script[url];
    if (!spec) throw new Error(`unscripted fetch: ${url}`);
    return new Response(spec.body ?? "", {
      status: spec.status ?? 200,
      headers: spec.headers ?? { "content-type": "text/html" },
    });
  }) as typeof fetch;
}

describe("fetchSubmittedUrl", () => {
  it("fetches a normal page and reports the final URL and size", async () => {
    const page = await fetchSubmittedUrl(
      "https://vendor.example.com/pitch",
      scriptedFetch({
        "https://vendor.example.com/pitch": { body: "<html><p>hi there</p></html>" },
      }),
    );
    expect(page.html).toContain("hi there");
    expect(page.final_url).toBe("https://vendor.example.com/pitch");
    expect(page.fetched_bytes).toBeGreaterThan(0);
  });

  it("follows up to three same-rules redirects and re-validates each hop", async () => {
    const page = await fetchSubmittedUrl(
      "https://a.example.com/",
      scriptedFetch({
        "https://a.example.com/": {
          status: 301,
          headers: { location: "https://b.example.com/1?utm=x" },
        },
        "https://b.example.com/1": {
          status: 302,
          headers: { location: "https://c.example.com/2" },
        },
        "https://c.example.com/2": { body: "<p>landed at last stop</p>" },
      }),
    );
    expect(page.final_url).toBe("https://c.example.com/2");
    expect(page.html).toContain("landed");
  });

  it("rejects a redirect to a blocked host", async () => {
    await expect(
      fetchSubmittedUrl(
        "https://a.example.com/",
        scriptedFetch({
          "https://a.example.com/": {
            status: 302,
            headers: { location: "https://169.254.169.254/latest/meta-data" },
          },
        }),
      ),
    ).rejects.toThrow(UrlIngestError);
  });

  it("rejects a redirect downgrade to http", async () => {
    await expect(
      fetchSubmittedUrl(
        "https://a.example.com/",
        scriptedFetch({
          "https://a.example.com/": {
            status: 302,
            headers: { location: "http://a.example.com/plain" },
          },
        }),
      ),
    ).rejects.toThrow(UrlIngestError);
  });

  it("gives up after too many redirect hops", async () => {
    const script: Record<string, { status: number; headers: Record<string, string> }> = {};
    for (let i = 0; i < 6; i++) {
      script[`https://hop${i}.example.com/`] = {
        status: 302,
        headers: { location: `https://hop${i + 1}.example.com/` },
      };
    }
    await expect(
      fetchSubmittedUrl("https://hop0.example.com/", scriptedFetch(script as never)),
    ).rejects.toThrow(UrlIngestError);
  });

  it("rejects non-HTML content types", async () => {
    await expect(
      fetchSubmittedUrl(
        "https://vendor.example.com/file",
        scriptedFetch({
          "https://vendor.example.com/file": {
            headers: { "content-type": "application/pdf" },
            body: "%PDF-",
          },
        }),
      ),
    ).rejects.toThrow(/readable web page/);
  });

  it("aborts a body larger than the cap", async () => {
    await expect(
      fetchSubmittedUrl(
        "https://vendor.example.com/huge",
        scriptedFetch({
          "https://vendor.example.com/huge": { body: "x".repeat(2 * 1024 * 1024 + 10) },
        }),
      ),
    ).rejects.toThrow(UrlIngestError);
  });
});

describe("htmlToText", () => {
  it("removes script, style, comments, and head; keeps readable text", () => {
    const html = `<html><head><title>t</title><style>p{color:red}</style></head>
      <body><script>alert(1)</script><!-- note --><p>We serve 14 cities.</p></body></html>`;
    const text = htmlToText(html);
    expect(text).toContain("We serve 14 cities.");
    expect(text).not.toContain("alert");
    expect(text).not.toContain("color:red");
    expect(text).not.toContain("note");
  });

  it("turns block tags into line breaks and decodes entities", () => {
    const html = "<h1>Acme &amp; Co</h1><p>Line one</p><p>Line&nbsp;two &#8217;s</p>";
    const text = htmlToText(html);
    expect(text).toContain("Acme & Co");
    expect(text.split("\n").length).toBeGreaterThanOrEqual(3);
    expect(text).toContain("Line two");
  });

  it("caps output length", () => {
    const html = `<p>${"y".repeat(60_000)}</p>`;
    expect(htmlToText(html).length).toBeLessThanOrEqual(40_000);
  });
});
