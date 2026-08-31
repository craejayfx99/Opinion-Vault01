exports.handler = async function (event) {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Method not allowed" })
      };
    }

    const userId = process.env.CPAGRIP_USER_ID;
    const key = process.env.CPAGRIP_KEY;

    if (!userId || !key) {
      return {
        statusCode: 500,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "CPAGrip configuration is missing" })
      };
    }

    // Netlify provides the visitor's real connection IP here.
    const forwarded = event.headers["x-forwarded-for"];
    const clientIp =
      event.headers["x-nf-client-connection-ip"] ||
      (forwarded ? forwarded.split(",")[0].trim() : null);

    if (!clientIp) {
      return {
        statusCode: 400,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "Visitor IP could not be detected" })
      };
    }

    const feedUrl =
      "https://www.cpagrip.com/common/lead_check_rss.php" +
      "?user_id=" + encodeURIComponent(userId) +
      "&key=" + encodeURIComponent(key) +
      "&time=1day" +
      "&check=ip" +
      "&value=" + encodeURIComponent(clientIp);

    const response = await fetch(feedUrl);

    if (!response.ok) {
      return {
        statusCode: 502,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ error: "CPAGrip request failed" })
      };
    }

    const xml = await response.text();

    const leadFound =
      /<lead_found>\s*true\s*<\/lead_found>/i.test(xml);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store"
      },
      body: JSON.stringify({
        lead_found: leadFound
      })
    };

  } catch (error) {
    console.error("Lead checker error:", error);

    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: "Lead check temporarily unavailable"
      })
    };
  }
};

