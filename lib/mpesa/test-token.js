import axios from "axios";
getToken();
async function getToken() {
  const consumerKey = "6M9q67OAslJDSt8fRfwc1frLYbQNZOjmDv8RiGJ1HEKdp6c4";
  const consumerSecret = "oJ4RLzZhRE4a7GTA6q3VJdBEidenBwnD4He0rZ31GTMAx92dGI2IjlQhXMGkLOG4";

  const auth = Buffer.from(
    `${consumerKey}:${consumerSecret}`
  ).toString("base64");

  try {
    const response = await axios.get(
      "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials",
      {
        headers: {
          Authorization: `Basic ${auth}`,
        },
      }
    );

    console.log(response.data);
  } catch (error) {
  console.log("STATUS:", error.response?.status);
  console.log("DATA:", error.response?.data);
  console.log("MESSAGE:", error.message);
}
}

