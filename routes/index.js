const express = require("express");
const path = require("path");
const router = express.Router();
const libKakaoWork = require("../lib/kakaoWork");
const registerModal = require("../messages/registerModal.json");
const scheduleManager = require("../lib/scheduleQueue").scheduleManager;

//Production에서는 router.post("/chatbot", ...)로 변경
router.get("/", async (req, res) => {
  // const users = await libKakaoWork.getUserListAll();
  const users = [{ id: 2628054 }];
  const conversations = await Promise.all(
    users.map((user) => libKakaoWork.openConversations({ userId: user.id }))
  );
  conversations.forEach(conversation=>{utils.setInitState(conversation.id);})
  
  res.end();
});

router.post("/request", async (req, res) => {
	const { actions, message, value } = req.body;
  const modal = {view:""}
  switch(value){
    case "new_schedule":
      modal.view = registerModal;
      break;
    case "new_group_schedule":
      modal.view = registerGroupModal;
      break;
    default:
      break;
  }
  res.json(modal)
});

router.post("/callback", async (req, res) => {
  const { actions, message, value, react_user_id } = req.body;
  const coversationId = message.conversation_id
  var responseMessage = {}
  switch(value){
    case "register":
      callback.RegisterNewSchedule(actions);
      break;
    default:
      break;
  }
  
	res.json(responseMessage);
});

router.get("/my_schedule",(req,res)=>{
  //SQL쿼리
  //HTML 생성
  res.send("<div>여기에 일정 표시 해줘야함</div>")
})

router.get("/all_schedule",(req,res)=>{
  //SQL쿼리
  //HTML 생성
  res.send("<div>여기에 일정 표시 해줘야함</div>")
})

//일정 삭제
router.get("/delete", (req, res) =>
  res.send("일정 지울 수 있게 하기")
);

//일정 완료
router.get("/delete", (req, res) =>
  res.send("일정 지울 수 있게 하기")
);

module.exports = router;
