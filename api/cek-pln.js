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

  if (!id) {
    return res.status(400).json({
      status: "error",
      message: "ID pelanggan kosong"
    });
  }

  const ref_id = "PLN" + Math.floor(Math.random() * 1000000000);

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

    const result = await response.json();

    if (result.data && result.data.status === "Sukses") {

      return res.status(200).json({
        status: "success",
        data: {
          name: result.data.customer_name,
          id: result.data.customer_no
        }
      });

    }

    return res.status(200).json({
      status: "error",
      message: result.data?.message || "Transaksi gagal"
    });

  } catch (error) {

    return res.status(500).json({
      status: "error",
      message: "Server error"
    });

  }

}
