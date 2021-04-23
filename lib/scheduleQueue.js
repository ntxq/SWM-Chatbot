const libKakaoWork = require("../lib/kakaoWork");
const progressAlarmMessage = require("../messages/progressAlarmMessage.json");

class Schedule {
  // deadline:Date;
  // nextAlarmTime:Date;
  // alarmPeriod:number; //in minute
  // conversationId:number; //in minute
  constructor(_deadline, _conversationId, _content, _alarmPeriod = Infinity) {
    this.deadline = _deadline;
    this.nextAlarmTime = _deadline;
    this.conversationId = _conversationId;
    this.alarmPeriod = _alarmPeriod;
    this.content = _content;
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
    this.pushSchedule = this.pushSchedule.bind(this);
    this.startTimer = this.startTimer.bind(this);
    this.loadScheduleFromDB = this.loadScheduleFromDB.bind(this);
  }

  loadScheduleFromDB() {}

  pushSchedule(data) {
    const schdule = new Schedule(
      data.time,
      data.conversationId,
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
        const remainTime = Math.round((schedule.deadline - new Date()) / 60000);
        //주기적 알람
        if (remainTime > 0) {
          schedule.nextAlarmTime += schedule.alarmPeriod * 60000;
          //deadline 이후에 메세지를 보내는 일은 없다
          if (schedule.nextAlarmTime > schedule.deadline) {
            schedule.nextAlarmTime = schedule.deadline;
          }
          this._queue.push(schedule);
        }

        const formattedMessage = { ...progressAlarmMessage };
        libKakaoWork.formatMessage(formattedMessage, {
          REMAIN: remainTime,
          CONTENT: schedule.content,
        });

        //남은 시간 메세지 전송
        await libKakaoWork.sendMessage({
          conversationId: schedule.conversationId,
          ...formattedMessage,
        });
      }
    }
  }
}
exports.scheduleManager = new ScheduleManager();
