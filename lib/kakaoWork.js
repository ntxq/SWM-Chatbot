const axios = require("axios");

const kakaoInstance = axios.create({
  baseURL: "https://api.kakaowork.com",
  headers: {
    Authorization: `Bearer ${process.env.TEST_KEY}`,
  },
});

exports.getUserList = async () => {
  const res = await kakaoInstance.get("/v1/users.list");
  return res.data.users;
};

//users.list API only <= 100 uesrs per request, hence pagination is required
exports.getUserListAll = async () => {
  let users = [];
  let cursor = null;

  const res = await kakaoInstance.get("/v1/users.list");
  users = users.concat(res.data.users);
  cursor = res.data.cursor;

  while (cursor) {
    const nextRes = await kakaoInstance.get(`/v1/users.list?cursor=${cursor}`);
    users = users.concat(nextRes.data.users);
    cursor = nextRes.data.cursor;
  }

  return users;
};

exports.openConversations = async ({ userId }) => {
  const data = {
    user_id: userId,
  };
  const res = await kakaoInstance.post("/v1/conversations.open", data);
  return res.data.conversation;
};

exports.sendMessage = async ({ conversationId, text, blocks }) => {
  const data = {
    conversation_id: conversationId,
    text,
    ...(blocks && { blocks }),
  };

  const res = await kakaoInstance.post("/v1/messages.send", data);

  //에러 표기
  if (res.data.error) console.log(res.data.error);

  return res.data.message;
};

exports.formatMessage = (message, dict) => {
  //replace main text
	const formatted = { ...message };
	
  if (formatted.text) {
    for (const [key, value] of Object.entries(dict)) {
      formatted.text = formatted.text.replace(`{${key}}`, value);
    }
  }
  //replace block text and value
  formatted.blocks.forEach((element) => {
    if (element.text) {
      for (const [key, value] of Object.entries(dict)) {
        element.text = element.text.replace(`{${key}}`, value);
      }
    }

    if (element.value) {
      for (const [key, value] of Object.entries(dict)) {
        element.value = element.value.replace(`{${key}}`, value);
      }
    }
  });
	
	return formatted;
};
