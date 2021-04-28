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

exports.openGroupConversations = async ({ user_ids }) => {
  const data = {
    user_ids,
  };

  const res = await kakaoInstance.post("/v1/conversations.open", data);
  return res.data.conversation;
};

exports.inviteGroupConversation = async ({ conversation_id, user_ids }) => {
  const res = await kakaoInstance.post(
    `v1/conversations/${conversation_id}/invite`,
    { conversation_id, user_ids }
  );

  if (res.data.error) console.log(res.data.error);

  return res.data.success;
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
  const formattedMessage = JSON.parse(JSON.stringify(message));

  if (formattedMessage.text) {
    for (const [key, value] of Object.entries(dict)) {
      formattedMessage.text = formattedMessage.text.replace(`{${key}}`, value);
    }
  }
  //replace block text and value
  formattedMessage.blocks.forEach((block) => {
    if (block.text) {
      for (const [key, value] of Object.entries(dict)) {
        block.text = block.text.replace(`{${key}}`, value);
      }
    }

    if (block.value) {
      for (const [key, value] of Object.entries(dict)) {
        block.value = block.value.replace(`{${key}}`, value);
      }
    }
    if (block.elements) {
      block.forEach((element) => {
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
    }
  });

  return formattedMessage;
};
