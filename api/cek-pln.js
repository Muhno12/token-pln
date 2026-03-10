import crypto from "crypto";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      status: "error",
      message: "Method tidak diizinkan"
    });
  }

  try {
    const body = req.body || {};
    const id = String(body.id || "").trim();

    if (!id) {
      return res.status(400).json({
        status: "error",
        message: "ID pelanggan tidak boleh kosong"
      });
    }

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({
        status: "error",
        message: "ID pelanggan harus berupa angka"
      });
    }

    const username = process.env.DIGI_USER;
    const apiKey = process.env.DIGI_KEY;

    if (!username || !apiKey) {
      return res.status(500).json({
        status: "error",
        message: "Config server belum lengkap"
      });
    }

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

    if (result?.data?.name) {
      return res.status(200).json({
        status: "success",
        data: {
          name: result.data.name || "-",
          customer_no: result.data.customer_no || id,
          meter_no: result.data.meter_no || "-",
          subscriber_id: result.data.subscriber_id || "-",
          segment_power: result.data.segment_power || "-"
        }
      });
    }

    return res.status(200).json({
      status: "error",
      message: result?.data?.message || "Data pelanggan tidak ditemukan",
      raw: result || null
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message || "Terjadi kesalahan server"
    });
  }
}
