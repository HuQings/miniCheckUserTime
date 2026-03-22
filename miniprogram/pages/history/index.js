Page({
  data: {
    records: [],
    completedDays: 0,
    avgScore: 0,
    avgHours: 0,
    period: 7
  },

  onLoad: function (options) {
    const period = getApp().globalData.period || 7;
    this.setData({ period });
    this.loadRecords();
  },

  loadRecords: function() {
    wx.showLoading({
      title: '加载中...'
    });

    wx.cloud.callFunction({
      name: 'cloudUserInfo',
      data: {
        type: 'getCheckinProgress',
        openid: getApp().globalData.openid,
        period: getApp().globalData.period || 7
      }
    }).then(res => {
      wx.hideLoading();
      
      if (res.result && res.result.success) {
        const { records } = res.result.data;
        const completedDays = records.length;
        const avgScore = completedDays > 0 
          ? Math.round(records.reduce((sum, r) => sum + (r.score || 0), 0) / completedDays)
          : 0;
        const avgHours = completedDays > 0
          ? (records.reduce((sum, r) => sum + (r.avgDailyHours || 0), 0) / completedDays).toFixed(1)
          : '0.0';

        this.setData({
          records: records,
          completedDays: completedDays,
          avgScore: avgScore,
          avgHours: avgHours
        });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error('加载记录失败:', err);
      wx.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      });
    });
  },

  getScoreLevel: function(score) {
    if (score >= 85) return 'high';
    if (score >= 70) return 'medium';
    return 'low';
  },

  goToWelcome: function() {
    wx.navigateBack();
  }
});