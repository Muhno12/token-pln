import crypto from "crypto";

export default async function handler(req, res) {

  if (req.method !== "POST") {
    return res.status(405).json({
      status: "error",
      message: "Method tidak diizinkan"
    });
  }

  const { id } = req.body;

  const username = process.env.DIGI_USER;
  const apiKey = process.env.DIGI_KEY;
  const sku = process.env.DIGI_CEKPLN_CODE;

  const ref_id = "PLN" + Date.now();

  const sign = crypto
    .createHash("md5")
    .update(username + apiKey + ref_id)
    .digest("hex");

  try {

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

    const data = await response.json();

    if (data.data && data.data.status === "Sukses") {
      return res.status(200).json({
        status: "success",
        data: {
          name: data.data.customer_name,
          id: data.data.customer_no
        }
      });
    }

    return res.status(200).json({
      status: "error",
      message: data.data?.message || "Transaksi gagal"
    });

  } catch (error) {

    return res.status(500).json({
      status: "error",
      message: "Server error"
    });

  }

}
