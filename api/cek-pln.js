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
    const id = String(req.body?.id || "").trim();

    const username = process.env.DIGI_USER;
    const apiKey = process.env.DIGI_KEY;
    const sku = process.env.DIGI_CEKPLN_CODE;

    if (!id) {
      return res.status(400).json({
        status: "error",
        message: "ID pelanggan kosong"
      });
    }

    if (!username || !apiKey || !sku) {
      return res.status(500).json({
        status: "error",
        message: "ENV belum lengkap"
      });
    }

    const ref_id = "PLN" + Math.floor(Math.random() * 1000000000);

    const sign = crypto
      .createHash("md5")
      .update(username + apiKey + ref_id)
      .digest("hex");

    const response = await fetch("https://api.digiflazz.com/v1/transaction", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username: username,
        buyer_sku_code: sku,
        customer_no: id,
        ref_id: ref_id,
        sign: sign
      })
    });

    const result = await response.json();

    if (result.data && result.data.status === "Sukses") {
      return res.status(200).json({
        status: "success",
        data: {
          name: result.data.customer_name || "-",
          id: result.data.customer_no || id
        }
      });
    }

    return res.status(200).json({
      status: "error",
      message: result.data?.message || "Transaksi gagal",
      raw: result
    });

  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message || "Server error"
    });
  }
}
