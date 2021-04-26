const libKakaoWork = require("../lib/kakaoWork");
const progressAlarmMessage = require("../messages/progressAlarmMessage.json");
const interimCheckMessage = require("../messages/interimCheckMessage.json");
const groupNoticeMessage = require("../messages/groupNoticeMessage.json");
//parent class
class Schedule {
  // deadline:Date;
  // conversationId:number;
  // alarmPeriod:number; //in ms
  // content:string;
  // periodNum:number;
  // nextAlarmTime:Date;
  // isTimeout:Boolean
  constructor(_deadline, _conversationId, _content, _alarmPeriod = Infinity) {
    this.deadline = _deadline;
    this.conversationId = _conversationId;
    this.alarmPeriod = _alarmPeriod;
    this.content = _content;
    this.periodNum = 1;
    this.nextAlarmTime = _deadline;
    this.isTimeout = false;
  }
  sendMessage() {}
  setNextPeriod() {
    //주기적 알람
    if (this.getRemainTime() > 0) {
      this.nextAlarmTime += this.alarmPeriod;
      //deadline 이후에 메세지를 보내는 일은 없다
      if (this.nextAlarmTime > this.deadline) {
        this.nextAlarmTime = this.deadline;
      }
      return true;
    }
    return false;
  }

  getRemainTime() {
    return Math.round((this.deadline - new Date()) / 60000);
  }
}

exports.PersonalSchedule = class PersonalSchedule extends Schedule {
  constructor(_deadline, _conversationId, _content, _alarmPeriod = Infinity) {
    super(_deadline, _conversationId, _content, _alarmPeriod);

    const now = new Date();
    const timeDiff = this.deadline.getTime() - now.getTime();
    this.periodNum = Math.ceil(timeDiff / this.alarmPeriod);
    this.nextAlarmTime = this.deadline - this.periodNum * this.alarmPeriod;
    if (this.nextAlarmTime < now) {
      this.nextAlarmTime += this.alarmPeriod;
    }
  }

  async sendMessage() {
    const formattedMessage = libKakaoWork.formatMessage(progressAlarmMessage, {
      REMAIN: this.getRemainTime(),
      CONTENT: this.content,
    });

    //남은 시간 메세지 전송
    await libKakaoWork.sendMessage({
      conversationId: this.conversationId,
      ...formattedMessage,
    });
  }

  setNextPeriod() {
    super.setNextPeriod();
  }
};

exports.GroupSchedule = class GroupSchedule extends Schedule {
  constructor(
    _deadline,
    _conversationId,
    _groupConversationId,
    _content,
    _alarmPeriod = Infinity
  ) {
    super(_deadline, _conversationId, _content, _alarmPeriod);
    const now = new Date();
    const timeDiff = this.deadline.getTime() - now.getTime();
    this.periodNum = Math.ceil(timeDiff / this.alarmPeriod);
    this.nextAlarmTime = this.deadline - this.periodNum * this.alarmPeriod;
    if (this.nextAlarmTime < now) {
      this.nextAlarmTime += this.alarmPeriod;
    }

    this.groupConversationId = _groupConversationId;
  }

  async sendMessage() {
    const formattedMessage = libKakaoWork.formatMessage(progressAlarmMessage, {
      REMAIN: this.getRemainTime(),
      CONTENT: this.content,
    });

    //남은 시간 메세지 전송
    await libKakaoWork.sendMessage({
      conversationId: this.conversationId,
      ...formattedMessage,
    });
    //미응답 체크
    this.isTimeout = true;
    const waitTime = 10 * 60 * 1000;
    setTimeout(this._checkPeriodTimeout.bind(this), waitTime);
  }

  async _checkPeriodTimeout() {
    if (this.isTimeout === true) {
      const formattedMessage = libKakaoWork.formatMessage(interimCheckMessage, {
        REMAIN: this.getRemainTime(),
        IS_ACHIEVE: "실패",
      });
      await libKakaoWork.sendMessage({
        conversationId: this.conversationId,
        ...formattedMessage,
      });
    }
    this.isTimeout = false;
  }

  async setPeriodAchieve(isAchieve) {
    this.isTimeout = false;
    const achieveStr = isAchieve === true ? "성공" : "실패";
    const formattedMessage = libKakaoWork.formatMessage(interimCheckMessage, {
      REMAIN: this.getRemainTime(),
      IS_ACHIEVE: achieveStr,
    });
    await libKakaoWork.sendMessage({
      conversationId: this.conversationId,
      ...formattedMessage,
    });
  }

  setNextPeriod() {
    super.setNextPeriod();
  }
};
