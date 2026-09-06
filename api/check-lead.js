module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).send("console.log('Method not allowed');");
  }

  const userId = process.env.CPAGRIP_USER_ID;
  const key = process.env.CPAGRIP_KEY;

  if (!userId || !key) {
    return res.status(500).send("console.error('Missing configuration');");
  }

  const clientIp = 
    req.headers['x-forwarded-for']?.split(',')[0]?.trim() || 
    req.socket.remoteAddress;

  if (!clientIp) {
    return res.status(400).send("console.error('IP not found');");
  }

  const feedUrl =
    'https://www.cpagrip.com/common/lead_check_rss.php' +
    '?user_id=' + encodeURIComponent(userId) +
    '&key=' + encodeURIComponent(key) +
    '&time=alltime' +
    '&check=ip' +
    '&value=' + encodeURIComponent(clientIp);

  try {
    const response = await fetch(feedUrl);
    if (!response.ok) {
      return res.status(502).send("console.error('CPAGrip error');");
    }

    const xml = await response.text();
    const leadFound = /<lead_found>\s*true\s*<\/lead_found>/i.test(xml);

    if (leadFound) {
      return res.status(200).send(
        "clearInterval(lead_check_timer);" +
        "alert('Lead completed, you may proceed.');" +
        "top.location.href='https://www.google.com';"
      );
    } else {
      return res.status(200).send("console.log('lead not found, rechecking..');");
    }
  } catch (error) {
    return res.status(500).send(
      "alert('Sorry, an error occured in lead check system, please try again later or contact the site administrator.');" +
      "clearInterval(lead_check_timer);"
    );
  }
};
