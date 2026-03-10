import crypto from "crypto";

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

export default async function handler(req, res) {
  setCors(res);

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({
      status: "error",
      message: "Method tidak diizinkan"
    });
  }

  try {
    const id = req.body.id;

    const username = process.env.DIGI_USER;
    const apiKey = process.env.DIGI_KEY;

    const sign = crypto
      .createHash("md5")
      .update(username + apiKey + id)
      .digest("hex");

    const response = await fetch("https://api.digiflazz.com/v1/inquiry-pln", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username: username,
        customer_no: id,
        sign: sign
      })
    });

    const result = await response.json();

    if (result.data) {
      return res.status(200).json({
        status: "success",
        data: {
          name: result.data.name,
          customer_no: result.data.customer_no,
          meter_no: result.data.meter_no,
          segment_power: result.data.segment_power
        }
      });
    }

    return res.status(200).json({
      status: "error",
      message: result.message || "Data tidak ditemukan"
    });

  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message
    });
  }
}
