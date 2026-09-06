module.exports = async (req, res) => {
    try {
        const userId = process.env.CPAGRIP_USER_ID;
        const key = process.env.CPAGRIP_KEY;

        if (!userId || !key) {
            return res.status(200).send("console.error('CPAGrip credentials are missing in Vercel settings.');");
        }

        // Fetch CPAGrip RSS feed
        const rssUrl = `https://www.cpagrip.com/common/ajax_rss.php?user_id=${userId}&key=${key}`;
        const response = await fetch(rssUrl);
        const data = await response.text();

        // Send response back to frontend script eval()
        return res.status(200).send(data);
    } catch (error) {
        console.error("CPAGrip Check Error:", error);
        return res.status(200).send("console.error('Lead check server error.');");
    }
};
