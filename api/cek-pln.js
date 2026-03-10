import crypto from "crypto";

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function makeRefId() {
  return "CEKPLN-" + Date.now() + "-" + Math.floor(Math.random() * 10000);
}

function parseNameFromMessage(message = "") {
  // Coba ambil nama dari pola umum seller/custom response
  // Contoh yang sering ada: "... nama BUDI SANTOSO ..." atau "Nama: BUDI SANTOSO"
  const patterns = [
    /nama[:\s]+([A-Z0-9 .,'\-\/]+)/i,
    /customer[:\s]+([A-Z0-9 .,'\-\/]+)/i,
    /pelanggan[:\s]+([A-Z0-9 .,'\-\/]+)/i
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return "";
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

    if (!/^\d+$/.test(id)) {
      return res.status(400).json({
        status: "error",
        message: "ID pelanggan harus berupa angka"
      });
    }

    const username = process.env.DIGI_USER;
    const apiKey = process.env.DIGI_KEY;
    const buyerSkuCode = process.env.DIGI_CEKPLN_CODE || "E70C00";

    if (!username || !apiKey) {
      return res.status(500).json({
        status: "error",
        message: "DIGI_USER / DIGI_KEY belum diisi"
      });
    }

    const refId = makeRefId();
    const sign = crypto
      .createHash("md5")
      .update(username + apiKey + refId)
      .digest("hex");

    const dgResponse = await fetch("https://api.digiflazz.com/v1/transaction", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        username: username,
        buyer_sku_code: buyerSkuCode,
        customer_no: id,
        ref_id: refId,
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

    const data = dgJson?.data || {};
    const message = data.message || dgJson.message || "";
    const statusText = String(data.status || "").toLowerCase();
    const rc = String(data.rc || "");

    const parsedName =
      data.name ||
      data.customer_name ||
      data.tr_name ||
      parseNameFromMessage(message);

    if (
      parsedName &&
      (statusText.includes("sukses") ||
        statusText.includes("success") ||
        rc === "00" ||
        message.toLowerCase().includes("sukses"))
    ) {
      return res.status(200).json({
        status: "success",
        data: {
          name: parsedName || "-",
          customer_no: data.customer_no || id,
          meter_no: data.meter_no || "-",
          subscriber_id: data.subscriber_id || "-",
          segment_power: data.segment_power || data.daya || "-"
        },
        raw: dgJson
      });
    }

    return res.status(200).json({
      status: "error",
      message: message || "Transaksi Gagal",
      raw: dgJson
    });
  } catch (error) {
    return res.status(500).json({
      status: "error",
      message: error.message || "Terjadi kesalahan server"
    });
  }
}
