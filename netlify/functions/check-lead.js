exports.handler = async function (event, context) {
  try {
    // Only allow POST requests
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        headers: {
          "Content-Type": "application/json",
          "Allow": "POST",
          "Cache-Control": "no-store"
        },
        body: JSON.stringify({
          error: "Method not allowed"
        })
      };
    }

    // CPAGrip credentials are stored securely in Netlify
    const userId = process.env.CPAGRIP_USER_ID;
    const key = process.env.CPAGRIP_KEY;

    if (!userId || !key) {
      console.error("Missing CPAGrip environment variables.");

      return {
        statusCode: 500,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store"
        },
        body: JSON.stringify({
          error: "CPAGrip configuration is missing"
        })
      };
    }

    /*
     * Netlify provides the visitor's IP through the Function context.
     * This is preferable to asking the browser to provide its own IP.
     */
    let clientIp = context?.ip || null;

    /*
     * Fallback for older/legacy Netlify event handling.
     */
    if (!clientIp) {
      const headers = event.headers || {};

      clientIp =
        headers["x-nf-client-connection-ip"] ||
        headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
        headers["client-ip"] ||
        null;
    }

    if (!clientIp) {
      console.error("Visitor IP could not be detected.");

      return {
        statusCode: 400,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store"
        },
        body: JSON.stringify({
          error: "Visitor IP could not be detected"
        })
      };
    }

    /*
     * CPAGrip Lead Checker
     *
     * alltime = check for a lead at any time
     * check=ip = search using the visitor's IP
     * value = visitor IP address
     */
    const feedUrl =
      "https://www.cpagrip.com/common/lead_check_rss.php" +
      "?user_id=" + encodeURIComponent(userId) +
      "&key=" + encodeURIComponent(key) +
      "&time=alltime" +
      "&check=ip" +
      "&value=" + encodeURIComponent(clientIp);

    const response = await fetch(feedUrl);

    if (!response.ok) {
      console.error(
        "CPAGrip returned HTTP status:",
        response.status
      );

      return {
        statusCode: 502,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store"
        },
        body: JSON.stringify({
          error: "CPAGrip request failed"
        })
      };
    }

    const xml = await response.text();

    /*
     * CPAGrip response is XML/RSS.
     * Look for a positive lead result.
     */
    const leadFound =
      /<lead_found>\s*true\s*<\/lead_found>/i.test(xml);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "Pragma": "no-cache"
      },
      body: JSON.stringify({
        lead_found: leadFound
      })
    };

  } catch (error) {
    console.error("Lead checker error:", error);

    return {
      statusCode: 500,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      },
      body: JSON.stringify({
        error: "Lead check temporarily unavailable"
      })
    };
  }
};
