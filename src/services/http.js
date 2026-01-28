const axios = require('axios');

async function fetchUrl(url) {
  try {
    const response = await axios.get(url, { timeout: 5000 });
    return {
      statusCode: response.status,
      body: typeof response.data === 'string' ? response.data : JSON.stringify(response.data),
      headers: JSON.stringify(response.headers)
    };
  } catch (err) {
    return {
      statusCode: err.response?.status || 500,
      body: err.message,
      headers: '{}'
    };
  }
}

async function postUrl(url, data) {
  try {
    const response = await axios.post(url, { data }, { timeout: 5000 });
    return {
      statusCode: response.status,
      body: JSON.stringify(response.data),
      headers: JSON.stringify(response.headers)
    };
  } catch (err) {
    return {
      statusCode: err.response?.status || 500,
      body: err.message,
      headers: '{}'
    };
  }
}

module.exports = { fetchUrl, postUrl };
