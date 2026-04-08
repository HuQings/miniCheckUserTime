// app.js
App({
  globalData: {
    env: "cloud1-4gkqf3egf6a0bba7",
    period: 21,
    userInfo: null,
    openid: 'test_user_' + Date.now(),
    demographics: null,
    day1Data: null,
    phase: 1,
    currentDay: 1
  },

  onLaunch: function () {
    if (!wx.cloud) {
      console.error("请使用 2.2.3 或以上的基础库以使用云能力");
    } else {
      wx.cloud.init({
        env: this.globalData.env,
        traceUser: true,
      });
    }
  },

  saveData(key, data) {
    wx.setStorageSync(key, data);
  },

  getData(key) {
    return wx.getStorageSync(key) || null;
  },

  initStorage() {
    wx.setStorageSync('demographics', null);
    wx.setStorageSync('dailyRecords', []);
    wx.setStorageSync('questionnaires', []);
    wx.setStorageSync('group', null);
    wx.setStorageSync('phase', 1);
  }
});