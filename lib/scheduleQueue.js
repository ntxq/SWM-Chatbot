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

class PersonalSchedule extends Schedule {
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
}

class GroupSchedule extends Schedule {
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
}

class ScheduleQueue {
  // _queue: Array<Schedule>;
  constructor() {
    this._queue = [];
    this.push = this.push.bind(this);
    this.front = this.front.bind(this);
    this.pop = this.pop.bind(this);
    this.isempty = this.isempty.bind(this);
  }
  push(schedule) {
    const idx = this._getIndex(schedule);
    this._queue.splice(idx, 0, schedule);
  }
  front() {
    if (this.isempty()) return new Schedule(new Date(9999, 11), 0);
    return this._queue[this._queue.length - 1];
  }
  pop() {
    this._queue.pop();
  }
  isempty() {
    return this._queue.length === 0;
  }
  _getIndex(schedule) {
    if (this.isempty()) return 0;
    return this._binSearch(0, this._queue.length, schedule);
  }
  _binSearch(start, end, value) {
    if (start === end) return start;
    const mid = Math.floor((start + end) / 2);
    if (this._compare(this._queue[mid], value)) {
      return this._binSearch(mid + 1, end, value);
    } else {
      return this._binSearch(start, mid, value);
    }
  }
  _compare(a, b) {
    return a.nextAlarmTime >= b.nextAlarmTime;
  }
}

class ScheduleManager {
  // _queue: ScheduleQueue;
  constructor() {
    this._queue = new ScheduleQueue();
    this.pushPersonalSchedule = this.pushPersonalSchedule.bind(this);
    this.startTimer = this.startTimer.bind(this);
    this.loadScheduleFromDB = this.loadScheduleFromDB.bind(this);
  }

  loadScheduleFromDB() {}

  pushPersonalSchedule(data) {
    const schdule = new PersonalSchedule(
      data.time,
      data.conversationId,
      data.content,
      data.alarmPeriod
    );
    this._queue.push(schdule);
  }

  pushGroupSchedule(data) {
    const schdule = new GroupSchedule(
      data.time,
      data.conversationId,
      data.groupConversationId,
      data.content,
      data.alarmPeriod
    );
    this._queue.push(schdule);
  }
  //별도 스레드로 관리한다.
  startTimer() {
    setTimeout(this._timer.bind(this), 0);
  }

  async _timer() {
    const timer = (ms) => new Promise((res) => setTimeout(res, ms));
    while (true) {
      await timer(30000);
      //무한 루프
      while (this._queue.front().nextAlarmTime <= new Date()) {
        const schedule = this._queue.front();
        this._queue.pop();
        //남은 시간 전송
        schedule.sendMessage();
        if (schedule.setNextPeriod()) {
          this._queue.push(schedule);
        }
      }
    }
  }
}
exports.scheduleManager = new ScheduleManager();
