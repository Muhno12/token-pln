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
    let id = "";

    if (typeof req.body === "string") {
      const params = new URLSearchParams(req.body);
      id = String(params.get("id") || "").trim();
    } else {
      id = String(req.body?.id || "").trim();
    }

    if (!id) {
      return res.status(400).json({
        status: "error",
        message: "ID pelanggan tidak boleh kosong"
      });
    }

    const username = process.env.DIGI_USER;
    const apiKey = process.env.DIGI_KEY;

    if (!username || !apiKey) {
      return res.status(500).json({
        status: "error",
        message: "DIGI_USER / DIGI_KEY belum diisi"
      });
    }

    const sign = crypto
      .createHash("md5")
      .update(username + apiKey + id)
      .digest("hex");

    const dgResponse = await fetch("https://api.digiflazz.com/v1/inquiry-pln", {
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

    const dgText = await dgResponse.text();

    let dgJson = null;
    try {
      dgJson = JSON.parse(dgText);
    } catch {
      return res.status(200).json({
        status: "error",
        message: "Response Digiflazz bukan JSON",
        raw_text: dgText
      });
    }

    if (dgJson?.data?.name) {
      return res.status(200).json({
        status: "success",
        data: {
          name: dgJson.data.name || "-",
          customer_no: dgJson.data.customer_no || id,
          meter_no: dgJson.data.meter_no || "-",
          subscriber_id: dgJson.data.subscriber_id || "-",
          segment_power: dgJson.data.segment_power || "-"
        },
        raw: dgJson
      });
    }

    return res.status(200).json({
      status: "error",
      message:
        dgJson?.data?.message ||
        dgJson?.message ||
        dgJson?.data?.rc ||
        "Transaksi Gagal",
      raw: dgJson
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message || "Terjadi kesalahan server"
    });
  }
}
